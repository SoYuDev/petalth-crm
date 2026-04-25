package com.luis.petalthbackend.repository;

import com.luis.petalthbackend.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    // Spring Data JPA hace la magia: busca en la relación veterinarian -> user -> email
    List<Appointment> findByVeterinarianUserEmail(String email);
}
