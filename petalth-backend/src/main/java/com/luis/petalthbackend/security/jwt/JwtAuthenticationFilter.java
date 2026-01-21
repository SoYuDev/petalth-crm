package com.luis.petalthbackend.security.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

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
