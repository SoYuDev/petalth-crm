package com.luis.petalthbackend.repository;

import com.luis.petalthbackend.entity.Veterinarian;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VeterinarianRepository extends JpaRepository<Veterinarian, Long> {
}
