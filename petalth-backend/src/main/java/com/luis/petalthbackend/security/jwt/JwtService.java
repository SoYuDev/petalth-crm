package com.luis.petalthbackend.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

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

    // como extraClaims podríamos poner el rol o un nombre al token p.j.
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
