# Spring Security Notes

Notas para la implementación de Spring Security con JWT authentication.

## Dependencias

Necesitamos tener las dependencias de Spring Security + jjwt-api, jackson e impl.

## Cambios en la implementación

### 1. UserRepository

Crear un método findByEmail que nos permita buscar por email ya que será el valor por el cual comprobaremos que el usuario existe

### 2. Clase CustomUserDetailsService

Clase que vamos a usar para indicarle a Spring que cuando necesite cargar un usuario, use esta clase.

#### Flujo de Autenticación - Spring Security

```
Spring Security:           "Necesito el usuario con email 'luis@email.com'"
        │
        ▼
CustomUserDetailsService:   "Ok, lo busco en MI base de datos"
        │
        ▼
UserRepository:             SELECT * FROM petalth_user WHERE email = 'luis@email.com'
        │
        ▼
CustomUserDetailsService:  "Aquí tienes, Spring" → UserDetails
```

#### UserDetailsService

Es una interfaz de Spring Security que implementará nuestra clase CustomUserDetailsService, haremos override sobre la función loadUserByUserName.

Esta función nos devuelve la interfaz UserDetails que contendrá un Usuario que si entiende el contexto de Spring Security

## 3. JWT Service

Crea, lee y valida los tokens JWT

### Composición de un JWT

Un JWT completo como este se divide en 3 partes. **eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30**

- Header (Algoritmo): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
  - Decodificado es: {
    "alg": "HS256",
    "typ": "JWT"
    }
- Payload (Datos): eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0

  - Decodificado es: {
    "sub": "1234567890",
    "name": "John Doe",
    "admin": true,
    "iat": 1516239022
    }

- Signature (Firma y verificación): KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30
  - La firma no se puede decodificar, solo verificar con la clave secreta

`Cada Token es diferente, para la firma usamos:
**FIRMA = HASH(header + payload + TU_CLAVE_SECRETA)**.
Para autentificar el token se hace una recalculación cuya comprobación se hace a partir de la clave secreta original`

## 4. JwtAuthenticationFilter

Intercepta todas las peticiones antes de que lleguen a los controllers.<br>
**Por cada petición HTTP PROTEGIDA que se haga la función doFilterInternal va a ser siempre llamada**

# Flujo de Autenticación JWT

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Usuario hace petición:   GET /api/mascotas                    │
│   Header: Authorization: Bearer eyJhbG...                       │
│                                                                 │
│                           │                                     │
│                           ▼                                     │
│              ┌─────────────────────────┐                        │
│              │ JwtAuthenticationFilter │  ← VIGILANTE           │
│              │                         │                        │
│              │  1. ¿Trae token?        │                        │
│              │  2. ¿Token válido?      │                        │
│              │  3. ¿No ha expirado?    │                        │
│              └─────────────────────────┘                        │
│                           │                                     │
│                ┌──────────┴──────────┐                          │
│                ▼                     ▼                          │
│          ✅ TODO OK              ❌ FALLA                      │
│               │                      │                          │
│               ▼                      ▼                          │
│        Deja pasar a            401 Unauthorized                 │
│        MascotaController       (no entra)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Interfaz OncePerRequestFilter

Esta clase implementa la interfaz **OncePerRequestFilter** que implica que se ejecuta una vez por petición.

# Método doFilterInternal

Método que se ejecuta por cada petición que hagamos.

### Explicacion de la firma del método

```java
@Override
protected void doFilterInternal(@NonNull HttpServletRequest request,
                                @NonNull HttpServletResponse response,
                                @NonNull FilterChain filterChain) throws ServletException, IOException {
    // Lógica...
}
```

- HttpServletRequest: Petición HTTP (Headers, URL...)
- HttpServletResponse: Respuesta que devolverá el servidor
- FilterChain: La "cadena" de filtros para dejar pasar la petición

### Método completo y explicación del cuerpo

```java
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        // 1. Obtener el header "Authorization"
        final String authHeader = request.getHeader("Authorization");

        // 2. Si no hay header o no empieza con "Bearer ", dejamos pasar
        // IMPORTANTE: Esta verificación DEBE ir ANTES de hacer substring
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 3. Extraer el token, quitando "Bearer " del principio
        final String token = authHeader.substring(7);

        // 4. Extraer el email del token
        final String userEmail = jwtService.extractEmail(token);

        // 5. Si hay email y el usuario NO está autenticado
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
```

**Es muy importante aclarar que necesitamos dos tokens, el JWT que usará el front e irá viajando entre Front y Back y UsernamePasswordAuthenticationToken que será un objeto de java que actuará como token dentro del contexto de Spring security**

- Paso 8: Creamos el objeto de autenticación de Java
- Paso 9: Añadir detalles de la petición como IP o session ID
- Paso 10: Guardamos en el contexto de seguridad de Spring
- Paso 11: Termina el filtro y pasa al siguiente "eslabón" de la cadena de filtros

```
┌─────────────────────────────────────────────────────────────────┐
│                    SecurityContextHolder                        │
│                    (memoria de Spring)                          │
│                                                                 │
│   "La petición actual es de:                                    │
│    - Usuario: luis@email.com                                    │
│    - Rol:  ROLE_ADMIN                                           │
│    - Autenticado: SÍ"                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Controller  │   │   Service    │   │  Cualquier   │
│              │   │              │   │  parte del   │
│ Puede        │   │ Puede        │   │  código      │
│ preguntar:   │   │ preguntar:   │   │              │
│ ¿Quién es?   │   │ ¿Es admin?   │   │ Puede        │
│              │   │              │   │ consultar    │
└──────────────┘   └──────────────┘   └──────────────┘
```

Esto es muy util para filtrar en los controlador en función del ROL

```java
@GetMapping("/admin/usuarios")
@PreAuthorize("hasRole('ADMIN')")  // ← Spring mira el SecurityContextHolder
public List<User> getUsuarios() {
    // Solo entra si el usuario tiene ROLE_ADMIN
}
```

Ejemplo de flujo para una petición que solo acceden admins

```
Frontend                          Backend
────────                          ───────

   │  JWT:  "eyJhbG..."             │
   │ ─────────────────────────────> │
   │                                │
   │                         ┌──────┴──────┐
   │                         │   FILTER    │
   │                         │             │
   │                         │ 1. Lee JWT  │
   │                         │ 2. Valida   │
   │                         │ 3. Crea     │
   │                         │    AuthToken│
   │                         │ 4. Guarda en│
   │                         │    Context  │
   │                         └──────┬──────┘
   │                                │
   │                         ┌──────┴──────┐
   │                         │ CONTROLLER  │
   │                         │             │
   │                         │ Lee Context │
   │                         │ ¿Es admin?  │
   │                         │ Responde    │
   │                         └──────┬──────┘
   │                                │
   │  { data:  [... ] }             │
   │ <───────────────────────────── │
```

## 5. SecurityConfig

Por defecto Spring Security redirige a un formulario HTML y protege todas las rutas si no hay autenticación

### Las funciones de la clase SecurityConfig

- 1. Autorizar algunas rutas sin autenticación (/auth/login)
- 2. Indicarle a Spring que use JwtAuthenticationFilter para verificar los tokens
- 3. Configurar otros detalles como CORS, evitar formularios...

### 5.1 SecurityFilterChain

```java
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    // Definir el SecurityFilterChain
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // Deshabilitamos CSRF para que no pida tokens en las peticiones POST/PUT
                .csrf(csrf -> csrf.disable())
                // Permitimos el acceso a TODAS las rutas sin autenticación
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll() // 2. Permitir rutas públicas
                        .anyRequest().authenticated() // 3. Proteger todas las demás rutas
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS) // 4. JWT -> Sin estado (stateless)
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class) // 5. Añadimos nuestro filtro
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
}
```

#### CSRF (Cross-Site Request Fogery)

Es un ataque en el que se intentan usar cookies para engañar al backen. Como estamos usando JWT y no cookies podemos deshabilitarlo.

#### Autorización de rutas

Permitimos rutas públicas (/auth/\*\*) y protegemos el resto (anyRequest().authenticated)

#### Configuración de la sesión

JWT está pensado para apps sin estado ya que el backend no recuerda los usuarios después de cada petición.

#### Añadir el filtro JWT

Usamos nuestra clase JwtAuthenticationFilter que se encarga de validar el token de cada petición.

### 5.2. Bean AuthenticationManager

Objeto que Spring usa para autenticar usuarios con UserDetailsService y necesitaremos cuando hagamos login en el AuthController

```java
@Bean
public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
    return config.getAuthenticationManager();
}
```

### 5.3. Bean PasswordEncoder

Bean necesario para encriptar las contraseñas antes de guardarlas en la base de datos. <br>
BCrypt es un algoritmo fuerte y seguro para guardar contraseñas

```java
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
```

## 6. Sistema de login con JWT

### Creación de DTOs LoginRequest y AuthResponse

Necesarios para la comunicación de datos entre Front y Back

```java
public record LoginRequest(
        String email,
        String password
) {}
```

```java
public record AuthResponse(
        String token,
        String email,
        String rol,
        String mensaje
) {}
```

### Clase AuthService

Clase que procesa el login (Validación de credenciales y generación del token JWT)

```java
@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    public AuthResponse login(LoginRequest loginRequest) {
        // 1. Autenticar al usuario (verifica email + password)
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.email(),
                        loginRequest.password()
                )
        );

        // 2. Buscar al usuario en BD
        User user = userRepository.findByEmail(loginRequest.email())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 3. Cargar UserDetails para generar el Token
        UserDetails userDetails = userDetailsService.loadUserByUsername(loginRequest.email());

        // 4. Generar token JWT
        String token = jwtService.generateToken(userDetails);

        // 5. Devolver respuesta
        return new AuthResponse(
                token,
                user.getEmail(),
                user.getRol().name(),
                "Login exitoso"
        );
    }
}
```

## 7. AuthController

Recibe la petición y mediante el service devuelve una respuesta

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
}
```

### @RequestBody

Convierte el JSON a un objeto Java loginRequest (record) sin el campos como loginRequest.email() o loginRequest.password() serían nulos.

## 8. Resumen

Hemos construido un sistema de autenticación stateless basado en JWT. El servidor no guarda sesiones, toda la información del usuario viaja en el token.

### Componentes del sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENTES DE SEGURIDAD                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│   │ SecurityConfig  │     │   JwtService    │     │ JwtAuthFilter   │       │
│   │                 │     │                 │     │                 │       │
│   │ • Rutas         │     │ • Crear token   │     │ • Interceptar   │       │
│   │   públicas      │     │ • Validar token │     │   peticiones    │       │
│   │ • Rutas         │     │ • Extraer datos │     │ • Validar token │       │
│   │   protegidas    │     │   del token     │     │ • Autorizar     │       │
│   └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│   │ CustomUserDet.  │     │  AuthService    │     │ AuthController  │       │
│   │    Service      │     │                 │     │                 │       │
│   │                 │     │ • Login         │     │ • POST /login   │       │
│   │ • Cargar user   │     │ • Validar       │     │ • POST /register│       │
│   │   desde BD      │     │   credenciales  │     │   (futuro)      │       │
│   │ • Convertir a   │     │ • Generar       │     │                 │       │
│   │   UserDetails   │     │   respuesta     │     │                 │       │
│   └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flujo 1 LOGIN (Obtener el token)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO DE LOGIN                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    CLIENTE                                                    SERVIDOR
    ───────                                                    ────────

        │   POST /auth/login                                       │
        │   {                                                      │
        │     "email": "admin@petalth.com",                        │
        │     "password":  "123456"                                │
        │   }                                                      │
        │ ──────────────────────────────────────────────────────── │
        │                                                          │
        │                          ┌───────────────────────────────┤
        │                          │  1. SecurityConfig            │
        │                          │     ¿/auth/** es pública?     │
        │                          │     → SÍ, dejar pasar         │
        │                          └───────────────┬───────────────┤
        │                                          │               │
        │                          ┌───────────────▼───────────────┤
        │                          │  2. AuthController            │
        │                          │     Recibe LoginRequest       │
        │                          │     Llama a AuthService       │
        │                          └───────────────┬───────────────┤
        │                                          │               │
        │                          ┌───────────────▼───────────────┤
        │                          │  3. AuthService               │
        │                          │     authManager.authenticate()│
        │                          └───────────────┬───────────────┤
        │                                          │               │
        │                          ┌───────────────▼───────────────┤
        │                          │  4. CustomUserDetailsService  │
        │                          │     Busca user en BD          │
        │                          │     Convierte a UserDetails   │
        │                          └───────────────┬───────────────┤
        │                                          │               │
        │                          ┌───────────────▼───────────────┤
        │                          │  5. PasswordEncoder (BCrypt)  │
        │                          │     ¿"123456" == hash en BD?  │
        │                          │     → SÍ ✅                   │
        │                          └───────────────┬───────────────┤
        │                                          │               │
        │                          ┌───────────────▼───────────────┤
        │                          │  6. JwtService                │
        │                          │     Genera token JWT          │
        │                          │     Header + Payload + Firma  │
        │                          └───────────────┬───────────────┤
        │                                          │               │
        │   200 OK                                 │               │
        │   {                                      │               │
        │     "token": "eyJhbGciOiJIUzM4NC.. .",   │               │
        │     "email": "admin@petalth. com",       │               │
        │     "rol": "ADMIN",                      │               │
        │     "mensaje": "Login exitoso"           │               │
        │   }                                      │               │
        │ ◄─────────────────────────────────────────               │
        │                                                          │

    El cliente GUARDA el token (localStorage, cookies, memoria)
```

### Flujo 2 Petición Protegida (Usar el token)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE PETICIÓN PROTEGIDA                         │
└─────────────────────────────────────────────────────────────────────────────┘

    CLIENTE                                                    SERVIDOR
    ───────                                                    ────────

        │   GET /api/mascotas                                      │
        │   Authorization: Bearer eyJhbGciOiJIUzM4NCJ9...          │
        │ ──────────────────────────────────────────────────────── │
        │                                                          │
        │                          ┌───────────────────────────────┤
        │                          │  1. JwtAuthenticationFilter   │
        │                          │                               │
        │                          │  ¿Tiene header Authorization? │
        │                          │  → SÍ                         │
        │                          │                               │
        │                          │  ¿Empieza con "Bearer "?      │
        │                          │  → SÍ                         │
        │                          │                               │
        │                          │  Extraer token (substring 7)  │
        │                          │  → "eyJhbGciOiJIUzM4NCJ9..."  │
        │                          └───────────────┬───────────────┤
        │                                          │               │
        │                          ┌───────────────▼───────────────┤
        │                          │  2. JwtService                │
        │                          │                               │
        │                          │  Extraer email del token      │
        │                          │  → "admin@petalth.com"        │
        │                          │                               │
        │                          │  ¿Token válido?               │
        │                          │  → Verificar firma ✅         │
        │                          │  → No ha expirado ✅          │
        │                          └───────────────┬───────────────┤
        │                                          │               │
        │                          ┌───────────────▼───────────────┤
        │                          │  3. CustomUserDetailsService  │
        │                          │                               │
        │                          │  Cargar usuario de BD         │
        │                          │  → UserDetails con roles      │
        │                          └───────────────┬───────────────┤
        │                                          │               │
        │                          ┌───────────────▼───────────────┤
        │                          │  4. SecurityContextHolder     │
        │                          │                               │
        │                          │  Guardar autenticación        │
        │                          │  → Usuario:  admin@petalth.com│
        │                          │  → Rol: ROLE_ADMIN            │
        │                          │  → Autenticado: SÍ            │
        │                          └───────────────┬───────────────┤
        │                                          │               │
        │                          ┌───────────────▼───────────────┤
        │                          │  5. MascotaController         │
        │                          │                               │
        │                          │  Procesar petición            │
        │                          │  Devolver datos               │
        │                          └───────────────┬───────────────┤
        │                                          │
        │   200 OK                                 │
        │   [                                      │
        │     { "id": 1, "nombre": "Toby" },       │
        │     { "id": 2, "nombre": "Luna" }        │
        │   ]                                      │
        │ ◄─────────────────────────────────────────
```

### Flujo 3 Petición sin Token (401/403)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE PETICIÓN RECHAZADA                         │
└─────────────────────────────────────────────────────────────────────────────┘

    CLIENTE                                                    SERVIDOR
    ───────                                                    ────────

        │   GET /api/mascotas                                      │
        │   (sin header Authorization)                             │
        │ ──────────────────────────────────────────────────────── │
        │                                                          │
        │                          ┌───────────────────────────────┤
        │                          │  1. JwtAuthenticationFilter   │
        │                          │                               │
        │                          │  ¿Tiene header Authorization? │
        │                          │  → NO                         │
        │                          │                               │
        │                          │  filterChain. doFilter()      │
        │                          │  (continúa sin autenticar)    │
        │                          └───────────────┬───────────────┤
        │                                          │               │
        │                          ┌───────────────▼───────────────┤
        │                          │  2. SecurityConfig            │
        │                          │                               │
        │                          │  ¿/api/mascotas es pública?   │
        │                          │  → NO                         │
        │                          │                               │
        │                          │  ¿Usuario autenticado?        │
        │                          │  → NO                         │
        │                          │                               │
        │                          │  DENEGAR ACCESO               │
        │                          └───────────────┬───────────────┤
        │                                          │
        │   403 FORBIDDEN                          │
        │   {                                      │
        │     "error": "Access Denied"             │
        │   }                                      │
        │ ◄─────────────────────────────────────────
```

### Security Context Holder: La memoria de Spring Security

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY CONTEXT HOLDER                             │
└─────────────────────────────────────────────────────────────────────────────┘

    Después de que JwtAuthenticationFilter valida el token:

    ┌─────────────────────────────────────────────────────────────────────┐
    │                    SecurityContextHolder                            │
    │                    (memoria temporal de Spring)                     │
    │                                                                     │
    │   ┌─────────────────────────────────────────────────────────────┐   │
    │   │  Authentication                                             │   │
    │   │  ─────────────────────────────────────────────────────────  │   │
    │   │  Principal:      admin@petalth.com                          │   │
    │   │  Credentials:     null (no guardamos password)              │   │
    │   │  Authorities:   [ROLE_ADMIN]                                │   │
    │   │  Authenticated: true                                        │   │
    │   │  Details:       IP: 192.168.1.1, Session: ABC123            │   │
    │   └────────────────────────────────────────────────────────────┘│   │
    │                                                                     │
    │   DURACIÓN:   Solo durante esta petición HTTP                       │
    │   ALCANCE:   Accesible desde cualquier parte del código             │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
    │ Controller  │          │  Service    │          │  @PreAuth   │
    │             │          │             │          │             │
    │ ¿Quién es?  │          │ ¿Qué rol?   │          │ ¿Es admin?  │
    └─────────────┘          └─────────────┘          └─────────────┘
```

### Rutas publicas vs protegidas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONFIGURACIÓN EN SECURITY CONFIG                         │
└─────────────────────────────────────────────────────────────────────────────┘

    . authorizeHttpRequests(auth -> auth
        .requestMatchers("/auth/**").permitAll()      // PÚBLICAS
        .anyRequest().authenticated()                  // PROTEGIDAS
    )


    ┌─────────────────────────────────────────────────────────────────────┐
    │                         RUTAS PÚBLICAS                              │
    │                       (no necesitan token)                          │
    ├─────────────────────────────────────────────────────────────────────┤
    │                                                                     │
    │   POST /auth/login      → Iniciar sesión                            │
    │   POST /auth/register   → Registrarse (futuro)                      │
    │                                                                     │
    │   El JwtAuthenticationFilter las deja pasar:                        │
    │   if (authHeader == null) {                                         │
    │       filterChain. doFilter(request, response);                     │
    │       return;  // ← No valida, solo deja pasar                      │
    │   }                                                                 │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘


    ┌─────────────────────────────────────────────────────────────────────┐
    │                        RUTAS PROTEGIDAS                             │
    │                       (necesitan token JWT)                         │
    ├─────────────────────────────────────────────────────────────────────┤
    │                                                                     │
    │   GET  /api/mascotas         → Listar mascotas                      │
    │   POST /api/citas            → Crear cita                           │
    │   GET  /api/usuarios         → Ver usuarios (solo admin)            │
    │   PUT  /api/mascotas/{id}    → Editar mascota                       │
    │                                                                     │
    │   El JwtAuthenticationFilter:                                       │
    │   1. Extrae el token del header                                     │
    │   2. Valida firma y expiración                                      │
    │   3. Carga usuario de BD                                            │
    │   4. Guarda en SecurityContextHolder                                │
    │   5. Deja pasar al Controller                                       │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

### Los dos Tokens del sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DOS TOKENS DIFERENTES                              │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │                         TOKEN JWT (String)                          │
    ├─────────────────────────────────────────────────────────────────────┤
    │                                                                     │
    │   Qué es:       "eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiJhZG1pbi..."        │
    │                                                                     │
    │   Para quién:  CLIENTE (Frontend, Postman, App móvil)               │
    │                                                                     │
    │   Viaja:        En el header Authorization de cada petición         │
    │                                                                     │
    │   Contiene:    Email, fecha de creación, fecha de expiración        │
    │                                                                     │
    │   Duración:    Configurable (ej: 24 horas, 7 días)                  │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘


    ┌─────────────────────────────────────────────────────────────────────┐
    │              UsernamePasswordAuthenticationToken (Objeto Java)      │
    ├─────────────────────────────────────────────────────────────────────┤
    │                                                                     │
    │   Qué es:      Objeto Java que Spring Security entiende             │
    │                                                                     │
    │   Para quién:  SPRING SECURITY (interno del backend)                │
    │                                                                     │
    │   Vive en:     SecurityContextHolder (memoria de Spring)            │
    │                                                                     │
    │   Contiene:    UserDetails, authorities (roles), estado auth        │
    │                                                                     │
    │   Duración:     Solo durante una petición HTTP                      │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘


    FLUJO COMPLETO:

    ┌──────────┐     JWT String      ┌──────────────────┐
    │ Frontend │ ─────────────────── │ Backend          │
    │          │                     │                  │
    │ Guarda   │                     │ JwtAuthFilter    │
    │ JWT en   │                     │ lee JWT,         │
    │ memoria  │                     │ crea AuthToken,  │
    │          │                     │ guarda en        │
    │          │                     │ SecurityContext  │
    └──────────┘                     └──────────────────┘
```

# Tabla resumen de componentes

| Componente               | Responsabilidad                                   | Cuándo actúa                    |
| ------------------------ | ------------------------------------------------- | ------------------------------- |
| SecurityConfig           | Define reglas (qué rutas son públicas/protegidas) | Al iniciar la app               |
| JwtService               | Crear y validar tokens JWT                        | Login + cada petición protegida |
| JwtAuthenticationFilter  | Interceptar peticiones, extraer y validar token   | Cada petición HTTP              |
| CustomUserDetailsService | Cargar usuario de BD, convertir a UserDetails     | Login + validación de token     |
| AuthService              | Lógica de login (orquesta todo)                   | POST /auth/login                |
| AuthController           | Recibir petición HTTP, devolver respuesta         | POST /auth/login                |
| PasswordEncoder          | Hashear (registro) y comparar (login) contraseñas | Registro + Login                |
| SecurityContextHolder    | Almacenar info del usuario autenticado            | Durante cada petición           |
