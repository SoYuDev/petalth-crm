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
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:4200")); // Permitir Angular
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
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

- También tiene otras funcionalidades como `.pipe()` donde podemos procesar los datos que nos llegan con otros métodos del mismo como `.tap()`.

**`.subscribe()` es el trigger de todo, hasta que no hagamos login.subscribe() nada sucedera, el observable estará esperando a que lo llamemos.**

### register

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
