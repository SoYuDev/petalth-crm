package com.luis.petalthbackend.dto.response;

import java.time.LocalDate;

public record PetDTO(
        Long id,
        String name,
        String photoUrl,
        LocalDate birthDate,
        String owner) {
}
