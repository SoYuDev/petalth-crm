package com.luis.petalthbackend.service;

import com.luis.petalthbackend.dto.response.AppointmentDTO;
import com.luis. petalthbackend.repository.AppointmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;

    public AppointmentService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional(readOnly = true)  // Mantiene la sesión abierta
    public List<AppointmentDTO> getAllAppointments() {
        return appointmentRepository.findAll()
                .stream()
                .map(app -> new AppointmentDTO(
                        app.getId(),
                        app.getDateTime(),
                        app.getService().getName(),
                        app.getStatus(),
                        app.getPet().getName(),
                        app.getVeterinarian().getUser().getFirstName() + " " +
                            app.getVeterinarian().getUser().getLastName()
                ))
                .toList();
    }
}