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
    // (será rechazado más adelante si la ruta requiere autentificación
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
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
    filterChain. doFilter(request, response);
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

````java
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
}```
````
