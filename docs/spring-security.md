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
