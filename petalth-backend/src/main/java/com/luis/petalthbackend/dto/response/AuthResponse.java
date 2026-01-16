package com.luis.petalthbackend.dto.response;

public record AuthResponse(
        String token,
        String email,
        String nombre,
        String rol,
        String mensaje
) {}
