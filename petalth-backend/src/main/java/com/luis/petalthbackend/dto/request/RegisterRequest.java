package com.luis.petalthbackend.dto.request;

public record RegisterRequest(
        String email,
        String password,
        String firstName,
        String lastName,
        String phone) {
}
