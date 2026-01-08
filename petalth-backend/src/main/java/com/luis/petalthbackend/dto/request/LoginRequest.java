package com.luis.petalthbackend.dto.request;

public record LoginRequest(
        String email,
        String password
) {
}
