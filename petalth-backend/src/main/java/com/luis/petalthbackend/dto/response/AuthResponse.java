package com.luis.petalthbackend.dto.response;

public record AuthResponse(
        String token,
        String email,
        String rol,
        String mensaje
) {}
