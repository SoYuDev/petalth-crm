package com.luis.petalthbackend.dto.response;

import com.luis.petalthbackend.entity.AppointmentStatus;
import java. time.LocalDateTime;

public record AppointmentDTO(
    Long id,
    LocalDateTime dateTime,
    String serviceName,        // Solo el nombre del tratamiento
    AppointmentStatus status,
    String petName,            // Solo el nombre de la mascota
    String veterinarianName    // Solo el nombre del vet
) {}