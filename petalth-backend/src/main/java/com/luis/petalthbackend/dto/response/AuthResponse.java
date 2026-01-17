package com.luis.petalthbackend.dto.response;

public record AuthResponse(
        Long id,
        String token,
        String email,
        String nombre,
        String rol,
        String mensaje
) {}
