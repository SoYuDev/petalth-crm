package com.luis.petalthbackend.service;

import com.luis.petalthbackend.dto.request.LoginRequest;
import com.luis.petalthbackend.dto.request.RegisterRequest;
import com.luis.petalthbackend.dto.response.AuthResponse;
import com.luis.petalthbackend.entity.Owner;
import com.luis.petalthbackend.entity.Rol;
import com.luis.petalthbackend.entity.User;
import com.luis.petalthbackend.repository.OwnerRepository;
import com.luis.petalthbackend.repository.UserRepository;
import com.luis.petalthbackend.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
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
}
