package com.luis.petalthbackend.dto.response;

import com.luis.petalthbackend.entity.AppointmentStatus;
import java. time.LocalDateTime;

public record AppointmentDTO(
    Long id,
    LocalDateTime dateTime,
    String serviceName,
    AppointmentStatus status,
    String petName,
    String veterinarianName
) {}