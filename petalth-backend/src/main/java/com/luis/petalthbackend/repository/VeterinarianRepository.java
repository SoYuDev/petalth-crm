package com.luis.pealthbackend.repository;

import com.luis.pealthbackend.entity.Veterinarian;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VeterinarianRepository extends JpaRepository<Veterinarian, Long> {
}
