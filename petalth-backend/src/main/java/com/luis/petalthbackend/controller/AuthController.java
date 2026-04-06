package com.luis.petalthbackend.controller;

import com.luis.petalthbackend.dto.request.LoginRequest;
import com.luis.petalthbackend.dto.request.RegisterRequest;
import com.luis.petalthbackend.dto.response.AuthResponse;
import com.luis.petalthbackend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Iniciar sesión", description = "Verifica las credenciales y devuelve el token JWT")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.login(loginRequest));
    }

    @Operation(summary = "Registrar usuario", description = "Crea una cuenta nueva y devuelve el token JWT")
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest registerRequest) {
        return ResponseEntity.ok(authService.register(registerRequest));
    }
}
