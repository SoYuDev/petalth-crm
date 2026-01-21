package com.luis.petalthbackend.repository;

import com.luis.petalthbackend.entity.Owner;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OwnerRepository extends JpaRepository<Owner, Long> {
}
