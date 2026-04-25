package com. luis.petalthbackend. controller;

import com.luis. petalthbackend.dto. response.AppointmentDTO;
import com.luis.petalthbackend.entity.AppointmentStatus;
import com.luis.petalthbackend.service.AppointmentService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework. http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework. web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/appointments")
@CrossOrigin(origins = "http://localhost:4200")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @Operation(summary = "Listar citas", description = "Obtiene todas las citas")
    @GetMapping
    public ResponseEntity<List<AppointmentDTO>> getAllAppointments() {
        List<AppointmentDTO> appointments = appointmentService.getAllAppointments();
        return ResponseEntity.ok(appointments);
    }

    @Operation(summary = "Listar mi agenda", description = "Obtiene las citas del veterinario logueado")
    @GetMapping("/my-agenda")
    public ResponseEntity<List<AppointmentDTO>> getMyAgenda() {
        // Extraemos el email del contexto de seguridad (del Token)
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        // Llamamos al servicio para que filtre en la base de datos
        return ResponseEntity.ok(appointmentService.getAppointmentsByVetEmail(email));
    }

    @Operation(summary = "Cambiar estado", description = "Permite marcar una cita como completada o cancelada")
    @PatchMapping("/{id}/status")
    public ResponseEntity<AppointmentDTO> changeStatus(
            @PathVariable Long id,
            @RequestParam AppointmentStatus status) {

        return ResponseEntity.ok(appointmentService.updateAppointmentStatus(id, status));
    }
}