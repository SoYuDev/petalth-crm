package com.luis.petalthbackend.repository;

import com.luis.petalthbackend.entity.Pet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PetRepository extends JpaRepository<Pet, Long> {

    // Join Fetch para evitar N+1 Queries -- Lista Todos los pets a partir del ownerId
    @Query("SELECT p FROM Pet p JOIN FETCH p.owner o JOIN FETCH o.user WHERE p.owner.id = :ownerId AND p.active = true")
    List<Pet> findByOwnerIdWithOwner(@Param("ownerId") Long ownerId);

    // Lista todos los Pet que están activos
    @Query("SELECT p FROM Pet p JOIN FETCH p.owner o JOIN FETCH o.user WHERE p.active = true")
    List<Pet> findAllActiveWithOwner();
}
