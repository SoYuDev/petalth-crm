package com.luis.petalthbackend.service;

import com.luis.petalthbackend.dto.response.AppointmentDTO;
import com.luis.petalthbackend.entity.Appointment;
import com.luis.petalthbackend.entity.AppointmentStatus;
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
                .map(this::convertToDTO) // Usamos el método privado
                .toList();
    }

    // Le añadimos @Transactional también para evitar el LazyInitializationException al mapear
    @Transactional(readOnly = true)
    public List<AppointmentDTO> getAppointmentsByVetEmail(String email) {
        return appointmentRepository.findByVeterinarianUserEmail(email)
                .stream()
                .map(this::convertToDTO) // Usamos el método privado
                .toList();
    }

    @Transactional
    public AppointmentDTO updateAppointmentStatus(Long id, AppointmentStatus newStatus) {
        // Buscamos la cita o lanzamos error si no existe
        Appointment app = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada"));

        // Cambiamos el estado
        app.setStatus(newStatus);

        // Guardamos y devolvemos el DTO actualizado usando el método privado que ya teníamos
        app = appointmentRepository.save(app);
        return convertToDTO(app);
    }

    // Extraemos la lógica aquí para no repetir código (Principios DRY)
    private AppointmentDTO convertToDTO(Appointment app) {
        return new AppointmentDTO(
                app.getId(),
                app.getDateTime(),
                app.getService().getName(),
                app.getStatus(),
                app.getPet().getName(),
                app.getVeterinarian().getUser().getFirstName() + " " +
                        app.getVeterinarian().getUser().getLastName()
        );
    }
}