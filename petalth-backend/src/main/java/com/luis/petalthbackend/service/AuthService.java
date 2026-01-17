package com.luis.petalthbackend.service;

import com.luis.petalthbackend.dto.request.LoginRequest;
import com.luis.petalthbackend.dto.response.AuthResponse;
import com.luis.petalthbackend.entity.User;
import com.luis.petalthbackend.repository.UserRepository;
import com.luis.petalthbackend.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

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

        // 3. Cargar UserDetails (Spring Security no entiende User pero si UserDetails) para generar el Token
        UserDetails userDetails = userDetailsService.loadUserByUsername(loginRequest.email());

        // 4. Generar token JWT
        String token = jwtService.generateToken(userDetails);

        // 5. Devolver respuesta
        return new AuthResponse(
                user.getId(),
                token,
                user.getEmail(),
                user.getFirstName(),
                user.getRol().name(),
                "Login exitoso"
        );
    }
}
