package com.luis.petalthbackend.dto.request;

import java.time.LocalDate;

public record PetRequest(
        String name,
        LocalDate birthDate,
        String photoUrl,
        Long ownerId) {
}
