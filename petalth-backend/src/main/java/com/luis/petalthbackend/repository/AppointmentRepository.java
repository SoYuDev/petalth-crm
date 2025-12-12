package com.luis.petalthbackend.repository;

import com.luis.petalthbackend.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
}
