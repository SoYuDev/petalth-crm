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

    // Realmente es mejor práctica usar JOIN FETCH en una JPQL dentro del repositorio.

    // Transaction define que es un bloque de operaciones que se ejecutan como una unidad
    // Esto soluciona la Exception LazyInitializationException, ya que por defecto
    // Hibernate cierra la conexión después de realizar appointmentRepository.findAll()
    @Transactional(readOnly = true) // Para consultas SELECT
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