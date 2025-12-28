package com.luis.petalthbackend.repository;

import com.luis.petalthbackend.entity.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PetController extends JpaRepository<Pet, Long> {
}
