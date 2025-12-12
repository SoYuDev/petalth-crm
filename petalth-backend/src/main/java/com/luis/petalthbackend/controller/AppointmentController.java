package com. luis.petalthbackend. controller;

import com.luis. petalthbackend.dto. response.AppointmentDTO;
import com.luis.petalthbackend.service.AppointmentService;
import org.springframework. http.ResponseEntity;
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

    @GetMapping
    public ResponseEntity<List<AppointmentDTO>> getAllAppointments() {
        List<AppointmentDTO> appointments = appointmentService.getAllAppointments();
        return ResponseEntity.ok(appointments);
    }
}