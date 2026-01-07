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

Intercepta todas las peticiones antes de que lleguen a los controllers

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
