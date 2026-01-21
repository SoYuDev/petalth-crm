# Clases esenciales Backend y JWT

Usaremos una arquitectura JWT que tiene las siguientes partes:

- 1. Header (información del propio token)
  - **alg**: Algoritmo de la firma (normalmente HS256).
  - **typ**: El tipo de token (siempre es JWT).

- 2. Payload (Claims o Datos)
  - Claims registrados o estándar:
    - `sub` (Subject): El identificador del usuario (email).
    - `iat` (Issued At): La fecha exacta en la que se creó el token.
    - `exp` (Expiration): Fecha de caducidad del token.
    - `iss` (Issuer): Quién emitió el token (opcional).
  - Claims Públicos o Personalizados (Los que añadimos para la funcionalidad de nuestra app)
    - Roles: Cuando la petición llega al backend el filtro `(JwtAuthenticationFilter)` extrae el rol y sabe si tenemos permiso para entrar a la ruta de '/admin'.
    - ID del usuario: Para que cuando guardes la mascota, el backend sepa a qué ID asociarla.
    - Nombre: Para que el Navbar pueda decir 'Hola, Luis' nada mas leer el token.
- 3. Signature (La firma)
  - Viaja información **ilegible**. Un hash criptográfico, resultado de mezclar Header, Payload y Secret Key.

**Todas estas carácteristicas del Token JWT están definidas en la clase `JwtService` que podría verse como el Criptógrafo.**

```java
// Crea, lee y valida los tokens JWT (Función de Criptógrafo)
@Service
public class JwtService {

    // Lee la clave secreta desde application-dev.properties
    @Value("${jwt.secret}")
    private String secret;

    // Lee la expiration
    @Value("${jwt.expiration}")
    private long expiration;

    // Genera un Token básico a partir del usuario
    public String generateToken(UserDetails userDetails) {
        return generateToken(Map.of(), userDetails);
    }

    // con extraClaims podríamos poner el rol o un nombre al token p.j.
    /*  Map<String, Object> datosExtra = Map.of(
        "rol", "ADMIN",
        "nombre", "Luis García"
    );*/
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return Jwts.builder()
                .claims(extraClaims) // Datos extra (Opcional)
                .subject(userDetails.getUsername()) // El email del usuario
                .issuedAt(new Date()) // Fecha de creación
                .expiration(new Date(System.currentTimeMillis() + expiration)) // Fecha de expiración del Token
                .signWith(getSigningKey()) // Genera la firmal del JWT a partir de Headers, Claims o Payload y la clave 'secret'
                .compact();

    }

    // ============================================================
    // EXTRAER INFORMACIÓN DEL TOKEN
    // ============================================================

    public String extractEmail(String token) {
        return extractClaim(token, claims -> claims.getSubject());
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, claims -> claims.getExpiration());
    }

    /**
     * Extrae un claim específico del token
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Extrae todos los claims del token
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())    // Verifica la firma
                .build()
                .parseSignedClaims(token)       // Parsea el token
                .getPayload();                  // Obtiene el payload (claims)
    }

    // ============================================================
    // VALIDAR TOKEN
    // ============================================================

    /**
     * Valida si el token es correcto y no ha expirado
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String email = extractEmail(token);
        return email.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    /**
     * Comprueba si el token ha expirado
     */
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // ============================================================
    // UTILIDADES
    // ============================================================

    /**
     * Genera la clave de firma del token a partir del secret
     * Todos los tokens se generan a partir de la misma firma aunque a la hora de la verdad el token también cambia
     * FIRMA = HASH(header + payload + TU_CLAVE_SECRETA)
     */
    private SecretKey getSigningKey() {
        // Convierte nuestra clave secreta en una clave criptográfica
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

/*
    LOGIN:
Usuario envía {email, password}
        │
        ▼
Backend valida credenciales
        │
        ▼
JwtService. generateToken(usuario)  →  "eyJhbG..."
        │
        ▼
Se devuelve el token al usuario


PETICIÓN PROTEGIDA:
Usuario envía Header:  "Bearer eyJhbG..."
        │
        ▼
JwtService.extractEmail(token)  →  "luis@email.com"
        │
        ▼
JwtService.isTokenValid(token, usuario)  →  true/false
        │
        ▼
Si es válido → Deja pasar
Si no → 401 Unauthorized

*/
}
```

## 1. JwtAuthenticationFilter

Clase obligatoria en arquitecturas JWT. Extiende de `OncePerRequestFilter`, lo que **garantiza que se ejecute una vez por cada petición HTTP** que llegue al servidor.

### Funcion:

**1. Intercepta todas las peticiones HTTP antes de llegar a los controladores.**
<br>
<br>
**2. Busca en la petición el header `Authorization`, lo valida con `JwtService` y si es correcto, "identifica" al usuario dentro del contexto Spring Security para esa petición específica.**

- `doFilterInternal` es el método que "detiene" la petición
  - 1. Busca el header `Authorization`. Si no existe o no empieza por `Bearer ` aplica el "paracaidas" y deja pasar la petición a rutas públicas `/login` o `/register`
  - 2. Extracción del email: Usa `JwtService` para "abrir" el token y leer quien es el dueño (Claim sub)
  - 3. Verificación del contexto: Comprueba si el usuario está autenticado en el `SecurityContextHolder` (Contexto de Spring Security). Si está vacío procedemos a validarlo.
  - 4. Carga al usuario: Llama a `UserDetailsService` para buscar al usuario en la base de datos.
  - 5. `JwtService` comprueba que el token no haya expirado y que el email concida con la BDD.
  - 6. Si todo es correcto, se crea un objeto `UsernamePasswordAuthenticationToken` y se guarda en el contexto de seguridad. A partir de ese momento, para esta petición, el usuario ya no es un extraño.

`UsernamePasswordAuthenticationToken` es un objeto de Java que entiende el contexto de Spring Security y nos permitirá tener seguridad basada en anotaciones, auditoria automática...

```java
// Intercepta todas las peticiones antes de que lleguen a los controllers
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        // 1. Obtener el header "Authorization", común en todas las peticiones HTTP para seguridad.
        // Si existe, el String será 'Bearer <JwtToken>'
        final String authHeader = request.getHeader("Authorization");

        // 2. Si no hay header o no empieza con "Bearer ", dejamos pasar a rutas públicas
        // IMPORTANTE: Esta verificación DEBE ir ANTES de hacer substring
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // La petición sigue su curso en la cadena para que siga su curso a las rutas públicas.
            filterChain.doFilter(request, response);
            return;
        }

        // 3. Extraer el token, quitando "Bearer " del principio
        final String token = authHeader.substring(7);

        // 4. Extraer el email del token
        final String userEmail = jwtService.extractEmail(token);

        // 5. Si hay email y el usuario NO está autenticado... vamos a intentar validarlo
        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            // 6. Cargar el usuario desde la BD
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

            // 7. Validar el token
            if (jwtService.isTokenValid(token, userDetails)) {
                // 8. Crear objeto de autenticación (Objeto de Java que actúa como Token para Spring Security)
                // El token que es un String sirve para el frontend.
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities() // Posibles roles como ROLE_ADMIN, ROLE_USER...
                );

                // 9. Añadir detalles de la petición (IP del usuario y Session ID, util para logs y auditorias)
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // 10. Guardar en el contexto de seguridad
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        // 11. Continuar con la cadena de filtros
        filterChain.doFilter(request, response);


    }
}
```

## 2. SecurityConfig

Definimos qué rutas son públicas y cuales privadas. Sin ella Spring Boot protegería todo por defecto o no protegería nada.

### Funcion:

**Define la configuración global de seguridad y las reglas de acceso a las rutas.**

### CORS - Bean (CorsConfigurationSource)

Antes de comprobar si tienes un token válido, el servidor donde vive el cliente.

- Angular vive en `http://localhost:4200` y la API en `http://localhost:8080`. Por seguridad los navegadores prohiben que un sitio web hable con un servidor de un "origen" distinto.
- **Solución:** Este Bean le dice al navegador que el puerto 4200 pueda enviar peticiones HTTP y traiga cabeceras de tipo Authorization.
- Es imprescindible poner `setAllowCredentials(true)` y la lista `AllowHeaders`. Sin ello el token JWT nunca llegaría al servidor por los filtros.

Todo esto está implementado en el Bean **`CorsConfigurationSource`**, dentro de SecurityConfig.

```java
        // Configuración CORS de a quién permitimos entrar
    // CORS nos permite decirle al filtro del navegador qué peticiones HTTP puede hacer.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        // Definimos las reglas de configuración del CORS.
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:4200")); // Permitir Angular
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);

        // Aplicamos las reglas previamente definidas.
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // La configuración aplica para todas las rutas.
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
```

### Desactivación del CSRF (Cross-Site Request Forgery)

Es un ataque que aprovecha las Cookies de sesión. Como estamos usando JWT podemos desactivar esta capa de seguridad.

### .authorizeHttpRequests(...) - Mapa de accesos

Definimos las rutas públicas y las restringidas

- `.requestMatchers("/auth/**").permitAll()`: Todo lo que empiece por `/auth` es zona libre.
- `.anyRequest().authenticated()`: Si no estas en la lista anterior, necesitas autenticación.

### .sessionManagement(...) - API Stateless

Confierte la API en Stateless

- Por defecto Spring intenta crear una `HttpSession` (Un espacio en la memoria RAM del servidor para recordarte).
- Con `SessionCreationPolicy.STATELESS` prohibimos a Spring guardar nada.
- Esto implica que el servidor se olvida de ti cuando te manda respuesta por lo que se pedirá de nuevo autenticación.

### .addFilterBefore(...) - Inyección del filtro

Conecta nuestra implementación de `JwtAutenticationFilter` con el motor de Spring.

- Spring Security tiene una "tuberia" de filtros internos. El filtro estándar para loguearse es: `UsernamePasswordAuthenticationFilter`.
- Al decir addFilterBefore, ponemos a nuestro filtro en primera línea.
- **El flujo:** Cuando llega la petición lo primero que se ejecuta es nuestro filtro. El cual puede autenticar correctamente y dar permiso a rutas protegidas o al no haber autenticación solo permitir las rutas públicas.

### Codificador de contraseñas - Bean (PasswordEncoder)

Define una tecnología de encriptación, en nuestro caso BCrypt que es el estándar de la industria.

- No solo encirpta sino que añade un "salt" (semilla aleatoria).

### Gestor de Autenticación - Bean (AuthenticationManager)

Este bean es un puente que luego será inyectado en `AuthService`.

- Objeto encargado de coger el email y contraseña del login. Después de comprobar si las credenciales son correctas, se dispara el proceso de verificación de contraseñas de Spring.

```java
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    // Definir el SecurityFilterChain
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // Le decimos a Spring security que empiece a gestionar las peticiones que vienen de otros orígenes
                // Le decimos que use la CORS config que tenemos en el Bean de abajo.
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // Deshabilitamos CSRF para que no pida tokens en las peticiones POST/PUT
                .csrf(csrf -> csrf.disable())
                // Permitimos el acceso a TODAS las rutas sin autenticación
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**", "/api/pets/**").permitAll() // 2. Permitir rutas públicas
                        .anyRequest().authenticated() // 3. Proteger todas las demás rutas
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS) // 4. JWT -> Sin estado (stateless)
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class) // 5. Añadimos nuestros filtros
                .build();
    }

    // Definir AuthenticationManager Bean
    @Bean
    public AuthenticationManager authenticationManagerBean(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // Definir el PasswordEncoder
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Configuración CORS de a quién permitimos entrar
    // CORS nos permite decirle al filtro del navegador qué peticiones HTTP puede hacer.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:4200")); // Permitir Angular
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

## 3. AuthService

Gestiona la lógica de negocio para el acceso y la creación de usuarios.

### Funcion:

**Coordina el proceso de login (verificando contraseñas con `AuthenticationManager`) y el registro (encriptando constraseñas y creando las entidades `User` y `Owner` de forma atómica con @Transactional)**

### Proceso de Login - Validación de credenciales

Cuando el cliente envía su email y contraseña, AuthService hace lo siguiente en el método `login(...)`:

- 1. Llama al método `authenticate(...)` de la clase `AuthenticationManager` donde le meteremos un `UsernamePasswordAuthenticationToken`. El motor de Spring busca en la BDD, extrae la contraseña encriptada y compara con la que el usuario acaba de escribir usando el `PasswordEncoder`.
- 2. Una vez Spring nos asegura que el usuario es real buscamos la entidad `User` al completo para poder devolver un DTO como respuesta del servidor.

```java
// Gestiona la lógica para acceso y creación de usuarios.
public class AuthService {
    private final UserRepository userRepository;
    private final OwnerRepository ownerRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

    public AuthResponse login(LoginRequest loginRequest) {
        // 1. Autenticar al usuario (verifica email + password)
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.email(),
                        loginRequest.password()
                )
        );

        // 2. Una vez Spring nos dice que el usuario es real, buscamos al usuario en la BDD
        // Para más adelante devolver un DTO con la respuesta del servidor.
        User user = userRepository.findByEmail(loginRequest.email())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 3. Generar token JWT
        String token = jwtService.generateToken(user);

        // 4. Devolver respuesta
        return new AuthResponse(
                user.getId(),
                token,
                user.getEmail(),
                user.getFirstName(),
                user.getRol().name(),
                "Login exitoso"
        );
    }
```

### Proceso de Registro - Creación atómica y segura

Tocamos dos tablas en la BDD a la vez `User` y `Owner`, por lo que hay que hacer algunas validaciones en el método `register()`

- Protección de Duplicados: Comprobar si el email ya existe.
- Uso de PasswordEncoder: Imprescindible encriptar la contraseña que nos llega por la petición HTTP POST.
- Persistencia de datos: Primero creamos y guardamos el `User`(email, password, nombre...) y después generamos el `Owner` a partir del `User` previo.

```java
    // Devolvemos AuthResponse (JWT Token) para que entre directamente sin tener que loguearse.
    @Transactional // Si hay algún fallo no se ejecuta nada.
    public AuthResponse register(RegisterRequest registerRequest) {
        // 1. El email ya existe?
        if (userRepository.existsByEmail(registerRequest.email())) {
            throw new RuntimeException("El email ya existe");
        }

        User user = User.builder()
                .firstName(registerRequest.firstName())
                .lastName(registerRequest.lastName())
                .email(registerRequest.email())
                .password(passwordEncoder.encode(registerRequest.password())) // Encriptamos la contraseña
                // Forzamos rol OWNER por defecto
                .rol(Rol.OWNER)
                .active(true)
                .build();

        // Guardamos el user, generándose el ID
        User savedUser = userRepository.save(user);

        // Construimos el Owner a partir del User (Por la arquitectura del programa, ya que usamos @MapsId
        Owner owner = Owner.builder()
                .user(savedUser)
                .phone(registerRequest.phone())
                .address(registerRequest.address())
                .build();

        ownerRepository.save(owner);

        // Generamos el Token
        String jwtToken = jwtService.generateToken(savedUser);

        return new AuthResponse(
                savedUser.getId(),
                jwtToken,
                savedUser.getEmail(),
                savedUser.getFirstName(),
                savedUser.getRol().name(),
                "Register exitoso"
        );
    }
```

## 4. User - Entity

Representa al usuario tanto en la BDD como en el contexto de Spring Security.

**Implementa la interfaz `UserDetails` lo que le permite formar parte del contexto de Spring Security**

## 5. AuthController

Expone los endpoints para que el mundo exterior se comunique con él.

### Funcion:

Recibe los JSON de Login y Registro, los pasa a `AuthService` y devuelve la respuesta `AuthResponse` que contiene información útil para el cliente incluyendo el Token JWT.

```java
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.login(loginRequest));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest registerRequest) {
        return ResponseEntity.ok(authService.register(registerRequest));
    }
}
```

# Clases esenciales Frontend

## 1. app.config.ts

Es el archivo de configuración global de la aplicación.

### Funcion:

**Configura el cliente de peticiones HTTP para que utilice nuestro interceptor de seguridad de forma global.**

- `provideHttpClient(withInterceptors([authInterceptor]))`: Le dice a Angular que cada vez que hagamos una petición HTTP la pase por el interceptor `auth.interceptor.ts`

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
```

## 2. auth.service.ts

A diferencia de AuthService.java del backend, que genera tokens. Este servicio se encarga de gestionarlos y almacenarlos en el navegador para que la aplicación sepa quién eres en todo momento.

### Funcion:

Gestiona la autenticación mediante **Signals**, que proporcionan la reactividad en Angular. También **coordina la comunicación con el backend para el Login y Registro**.

- `currentUser = signal<AuthResponse | null>(...);`: Es el corazón reactivo de la app que representa al usuario. Si el Signal cambia, todos los componentes como el Navbar cambiarán.
- `localStorage`: Se utiliza como el disco duro del navegador. Guardamos el token y los datos del usuario para que si refrescamos la página la sesión no se pierda.

### login()

- 1. Nos pide por parámetro de entrada un DTO que definimos en la nuestra interfaz `auth.interface.ts` y contiene exactamente lo que el servidor espera recibir.
- 2. La petición `this.http.post<AuthResponse>(...)` define que vamos a hacer un POST y que cuando el servidor responda, los datos tendrán la forma de la interfaz `AuthResponse`. Hasta este punto tenemos un 'Cold Observable' es decir, tenemos los datos para recibir la información pero aún no hemos hecho nada.
- 3. `.pipe()`: Es un método de los Observables. Es una tubería donde conectamos diferentes operadores para procesar los datos que lleguen. Estamos diciendo que cuando alguien haga .`subscribe()` del observable, quiero que los datos pasen por ciertos procesos (guardar el token en el localStorage).
- 4. `.tap()`: Mira los datos pero no los toca ni los modifica. Anota el token y lo guarda.
- 5. `response`: Es el payload que nos envia Spring Boot, contiene el JSON con el token, email, nombre, id, rol...

Una vez terminado este proceso tendremos en el localStorage el `token`, el `currentUser` además de como variable signal también tendremos `currentUser`

```typescript
// Enviamos email y password al backend - LoginRequest (Interfaz que representa un DTO)
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return (
      this.http
        // Hacemos un método post, al servidor nuestras credenciales (LoginRequest). Se nos devolveran datos que serán mapeados en la interfaz AuthResponse
        .post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
        // Hasta este punto, tenemos lo que se llama un 'Cold Observable' Tenemos los datos necesarios para recibir la información pero aun no hemos hecho nada.

        //.pipe() es un método de los observables una tuberia que conectamos esperando para procesar los datos que lleguen cuando hagamos .subscribe()
        .pipe(
          // .tap(response) es un método de .pipe() que nos permite ver los datos sin modificarlos. 'response' es el objeto que representa en JSON la respuesta del servidor
          // basicamente hay en formato JSON el 'AuthResponse' de Java (id, token, email, nombre, rol y mensaje)
          tap((response) => {
            // AQUÍ es donde el token entra al localStorage
            localStorage.setItem('token', response.token);

            // Guardamos el objeto entero en la variable signal currentUser
            localStorage.setItem('currentUser', JSON.stringify(response));

            // currentUser que era null, pasa a tener los datos del usuario.
            this.currentUser.set(response);

            // Una vez realizado todo, tendremos en el localStorage dos items token y currentUser(con todos los datos id, token...) y el signal como currentUser también.
          }),
        )
    );
  }
```

### ¿Qué es un Observable?

Podriamos hacer la analogía de que un Observable es la tuberia que se conecta al servidor. Hasta que no abrimos el grifo (hacer `.subscribe()`), no habrá flujo de datos por lo que está siempre listo para ser suscrito.

Cada vez que llamamos a un Observable se crea uno nuevo y diferente.

- También tiene otras funcionalidades como `.pipe()` donde podemos procesar los datos que nos llegan con otros métodos del mismo como `.tap()`.

**`.subscribe()` es el trigger de todo, hasta que no hagamos login.subscribe() nada sucedera, el observable estará esperando a que lo llamemos.**

### register()

Es un método realmenta parecido a login por lo que no es necesaria la explicación.

## 3. auth.interceptor.ts

Es una **función** silenciosa que actua como puente entre Angular y el backend. **Es importante aclarar que no es una clase.**

### Funcion:

Intercepta cada petición HTTP saliente e inyecta automaticamente el token JWT en las cabeceras.

**Esto es de vital importancia porque si no el backend recibiría una petición anónima, el backend (`JwtAuthenticationFilter`) buscaría el header y al no encontrarlo devolveria una respuesta 403 o 401**

Al decirle que la función es un `HttpIncerceptorFn`, Angular te obliga a cumplir dos parámetros:

- 1. `req` (HttpRequest) La petición (URL, método HTTP, cuerpo...)
- 2. `next` (HttpHandlerFn) El puente hacia el siguiente paso.

### Caso de uso:

- 1. Cuando hacemos `this.http.get('/api/pets')`, `authInterceptor` actua.
- 2. Comprueba el `localStorage`. ¿Hay Token?
- 3. Como no podemos abrir la petición original ya que es inmutable hacemos una copia exacta con `req.clone` y le pegamos la etiqueta `Authorization`.
- 4. Si llamamos a `next(cloned)`, le pasamos la copia con el token al servidor

**Esta clase es de vital importancia ya que nos permite comunicarnos con el backend ya que este nos pide que en el header `Authorization` tengamos el valor 'Bearer + token'**

```typescript
// El interceptor revisa cada petición HTTP y si detecta un Token, copia la request y establece como headers `Bearer + tokenJWT`
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem("token"); // Recuperamos el token guardado

  // Si el token existe, clonamos la petición y le añadimos el header.
  if (token) {
    // Parte clave, clonamos la peticion HTTP y ponemos lo necesario para que el backend acepte la peticion (Poner en el header Authorization: `Bearer + token`)
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(cloned);
  }

  // Si no hay token (ej: en el login), la petición sigue normal (rutas publicas)
  return next(req);
};
```

## 4. auth.guard.ts

Es el encargado de decidir si un usuario tiene permiso para ver una pantalla o debe de ser redirigido a otra vista.

### Funcion:

Protege rutas del navegador verificando la existencia de una sesión.

- Si intentamos entrar a `/pets/5` pero tu ID del usuario es 3 y no eres ADMIN el guard te bloquea y te redirige a tu propia página.

```typescript
import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../service/auth.service";
import { Role } from "../auth.interfaces";

// Archivo que se encarga de verificar las reglas de seguridad antes de entrar a la ruta
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. ¿Está logueado?
  if (!authService.isLoggedIn() || !authService.currentUser()) {
    // Si no, fuera (al login)
    return router.createUrlTree(["/login"]);
  }

  const currentUser = authService.currentUser();
  const routeId = route.paramMap.get("ownerId"); // El ID de la URL (/pets/5)

  // 2. Si la ruta tiene un ID (/pets/5) y NO somos ADMIN...
  if (routeId) {
    const idEnUrl = Number(routeId);
    // Si no hay valor de id, devuelve undefined en vez de null. Util para evitar errores.
    const miId = currentUser?.id;

    // Si intento entrar en un ID que no es el mío
    if (miId !== idEnUrl && currentUser?.rol !== Role.ADMIN) {
      console.warn(
        "Intento de acceso no autorizado. Redirigiendo a tu perfil.",
      );
      // Te redirijo a TU propia página de mascotas
      return router.createUrlTree(["/pets", miId]);
    }
  }

  // Si pasas todas las pruebas, adelante
  return true;
};
```

### Configuración de app.routes.ts para su uso

Como vemos en el siguiente código podemos definir que rutas son las que sean comprobadas por el guard.

**Cada vez que intentemos acceder a una ruta marcada con un guard el código se ejecutará.**

```typescript
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Rutas protegidas con authGuard
  { path: 'pets', component: PetComponent, canActivate: [authGuard] },
  // Uso de parámetros dinámicos
  { path: 'pets/:ownerId', component: PetComponent, canActivate: [authGuard] },

  { path: 'veterinarians', component: VeterinarianComponent },
```

## 5. LoginComponent

Es la interfaz que finalmente interactua con el usuario final

### Funcion:

Componente que gestiona el formulario reactivo de entrada, valida los datos en tiempo real y maneja las respuestas de error con el servidor.

- `ReactiveFormsModule` es un módulo de Angular que nos permite crear formularios de manera robusta. El objeto `loginForm` vigila que el email sea válido y la contraseña tenga una longitud mínima.
- Si hay error en el Backend, ya sea por credenciales incorrectas o error del servidor se envía un signal llamado `errorMessage`.

### Archivo .ts del componente

```typescript
@Component({
  selector: "app-login",
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink], // Importante importar ReactiveFormsModule
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.css",
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signal para mensajes de error
  errorMessage = signal<string>("");

  // loginForm es un objeto de tipo FormGroup, contiene los inputs y vigila lo que el usuario escribe.
  // Esta variable se mantiene sincronizada con el HTML mediante [formGroup]="loginForm"
  loginForm = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(4)]],
  });

  // Comprueba que loginForm es válido.
  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    // Extraemos los valores del formulario que había en loginForm
    const credentials: LoginRequest = {
      // ?? -> Operador de fusión nula. Si this.loginForm.value.email es null, cogerá el valor de la derecha, en este caso un string vacío.
      email: this.loginForm.value.email ?? "",
      password: this.loginForm.value.password ?? "",
    };

    // Llamamos al servicio suscribiendonos al observable
    this.authService.login(credentials).subscribe({
      next: () => {
        // Si todo sale bien, redirigimos a la home (Spring Boot manda un 200 OK)
        this.router.navigate(["/"]);
      },
      // Si hay un error (Spring Boot manda 401 o 403)
      error: (err) => {
        console.error("Error en login:", err);
        this.errorMessage.set(
          "Credenciales incorrectas o fallo del servidor. Inténtalo de nuevo.",
        );
      },
    });
  }
}
```

### Archivo .html del componente

```html
<div class="container d-flex justify-content-center align-items-center vh-100">
  <div class="card p-4 shadow-sm" style="max-width: 400px; width: 100%;">
    <div class="card-body">
      <h3 class="card-title text-center mb-4">Iniciar Sesión</h3>

      <!--       
      1. Conectamos el formulario [formGroup] conecta HTML con loginForm, que hace referencia a la variable del .ts
      2. (ngSubmit)="onSubmit()" al enviar el formulario (pulsar boton con type submit) llamamos al método onSubmit
      -->
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        <div class="mb-3">
          <label for="email" class="form-label">Email</label>
          <!--
          Class Binding: class.NOMBRE_CLASE="CONDICION" -> class.is-invalid es una clase de Bootstrap
          En este caso: El email incumple alguna regla y el usuario ha tocado este campo (si no saldría directamente rojo antes de que lo toque)?
          -->
          <input
            type="email"
            class="form-control"
            id="email"
            formControlName="email"
            placeholder="user@petalth.com"
            [class.is-invalid]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
          />

          <!-- Si el input email tiene algún error y ha sido previamente tocado... -->
          @if (loginForm.get('email')?.hasError('email') &&
          loginForm.get('email')?.touched) {
          <!-- Solo se muestra si el input hermano es invalido-->
          <div class="invalid-feedback">Introduce un email válido.</div>
          }
        </div>

        <div class="mb-3">
          <label for="password" class="form-label">Contraseña</label>
          <input
            type="password"
            class="form-control"
            id="password"
            formControlName="password"
            placeholder="******"
          />
        </div>

        <!--         
        1. Al principio signal está vaciío : '' lo que implica que errorMessage() es false
        2. Si hacemos mal el login el backend devuelve error y el servicio hace .set('Credenciales Malas')
        3. Se muestra el mensaje de error
        -->
        @if (errorMessage()) {
        <div class="alert alert-danger text-center" role="alert">
          {{ errorMessage() }}
        </div>
        }

        <div class="d-grid gap-2">
          <!-- Controlamos el atributo disabled del HTML. Si loginForm.invalid se deshabilita, ejemplo de Property Binding -->
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="loginForm.invalid"
          >
            Entrar
          </button>
        </div>
      </form>

      <div class="mt-3 text-center">
        <small class="text-muted"
          >¿No tienes cuenta? <a routerLink="/register">Regístrate</a></small
        >
      </div>
    </div>
  </div>
</div>
```

# Caso de Uso Completo: Del Login a la Petición Protegida

Este flujo describe cómo el usuario "Luis" inicia sesión y consulta sus mascotas, destacando la interacción detallada entre Angular (Frontend) y Spring Security (Backend).

## 1. El Proceso de Login (Obtención del Token)

**Objetivo:**  
Autenticar las credenciales del usuario y obtener su JWT.

### 1. Frontend: El Disparo (Angular)

- Luis introduce su email y contraseña.
- El `LoginComponent` llama al método `login()` del servicio de autenticación.
- **Acción:**  
  Se ejecuta `.subscribe()`, que dispara una petición HTTP **POST** a  
  `http://localhost:8080/auth/login`
- **Estado de la Petición:**
  - El cuerpo contiene el JSON `{email, password}`.
  - **No lleva cabecera `Authorization`** (el `auth.interceptor.ts` la ignora porque aún no hay token en `localStorage`).

### 2. Backend: La Intercepción (JwtAuthenticationFilter)

- La petición llega al servidor.
- `JwtAuthenticationFilter` intercepta todas las peticiones entrantes, incluida esta.
- **Análisis:**  
  El filtro inspecciona el Header `Authorization`.
- **Detección:**
  - Al ser una petición de login, el header es `null`.
- **Decisión Técnica:**  
  El filtro ejecuta su lógica de "paso":

  ```java
  if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      // No bloquea, pasa la responsabilidad al siguiente filtro
      filterChain.doFilter(request, response);
      return;
  }
  ```

- **Resultado:**  
  El filtro de `JwtAuthenticationFilter` **ignora la petición y la deja pasar** tal cual.

### 3. Backend: La Autorización (SecurityConfig)

- La petición llega al núcleo de seguridad de Spring.
- Como el filtro JWT anterior no autenticó al usuario, la petición sigue siendo **Anónima**.
- **Regla:**  
  Spring consulta la configuración de seguridad en `SecurityConfig`.
- **Coincidencia:**
  - La URL `/auth/login` coincide con `.requestMatchers("/auth/**").permitAll()`
- **Acción:**  
  Spring permite el acceso al recurso aunque el usuario sea anónimo.

### 4. Backend: Generación del Token (Business Logic)

- La petición llega finalmente a `AuthController` -> `AuthService`.
- `AuthenticationManager`, dentro de `AuthService` valida las credenciales contra la base de datos.
- `JwtService` firma el token.
- **Respuesta:**  
  El backend responde con **200 OK** y un objeto `AuthResponse` (que contiene el Token JWT).

### 5. Frontend: Almacenamiento (El operador .tap())

- De vuelta en Angular, antes de que el componente tome el control, el operador `.tap()` del `AuthService` captura la respuesta:
  - Guarda el token en `localStorage`.
  - Actualiza el Signal `currentUser`.

---

# PARTE 2: La Petición Protegida (Consultando Mascotas)

Una vez autenticado, "Luis" quiere consultar sus mascotas, lo que desencadena una petición protegida y toda la maquinaria de autenticación/validación de JWT.

## 1. Frontend: El Blindaje (AuthInterceptor)

- Luis hace clic en "Mis Mascotas".
- Angular intenta realizar un **GET** a `/api/pets`.
- Antes de salir del navegador, la petición **es detenida por el `authInterceptor`**.
- **Verificación:**  
  El interceptor revisa el `localStorage` y encuentra el token JWT guardado previamente.
- **Clonación:**  
  La petición HTTP es inmutable, por lo que el interceptor crea un **clon exacto**.
- **Inyección del Token:**  
  El token se adjunta en la cabecera del clon:
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
  ```
- **Envío:**  
  La petición clonada (ahora protegida) se envía al backend.

## 2. Backend: La Validación (JwtAuthenticationFilter)

- La petición llega al backend y el `JwtAuthenticationFilter` la intercepta de nuevo.
- **Análisis:**  
  Inspecciona el header `Authorization`.
- **Detección:**  
  Esta vez SÍ encuentra el prefijo `Bearer `.
- **Procesamiento:**
  - Extrae el **token puro** (`substring(7)` para eliminar el prefijo).
  - Llama a `JwtService` para **validar la firma y comprobar la caducidad**.
  - Extrae el **email** (ejemplo: `luis@mail.com`).
  - Carga los detalles del usuario desde la base de datos.
  - **Autenticación en Contexto:**  
    Crea un objeto `UsernamePasswordAuthenticationToken` (el "DNI" de Java para el usuario autenticado) y lo inserta en el `SecurityContextHolder`.
- **Diferencia clave:**  
  Ahora la petición **ya no es anónima**: tiene una identidad oficial en el contexto de Spring Security.

## 3. Backend: La Autorización Final (SecurityConfig)

- La petición se dirige a `SecurityConfig` para verificar el acceso.
- **Regla:**  
  Spring revisa las configuraciones para `/api/pets`.
- **Coincidencia:**  
  La ruta coincide con `.anyRequest().authenticated()`.
- **Verificación:**  
  Spring examina el `SecurityContext`: **¿Hay usuario autenticado? Sí** (insertado por el filtro JWT).
- **Acción:**  
  **Semáforo verde:** La petición es autorizada y continúa su camino.

## 4. Backend: Respuesta de Datos

- El `PetController` recibe la petición.
- Consulta las mascotas de Luis en la base de datos.
- Devuelve el JSON con la información de las mascotas solicitadas.

## 5. Frontend: Se pintan los objeto para que el cliente lo vea.
