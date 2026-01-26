package com.luis.petalthbackend.service;

import com.luis.petalthbackend.dto.request.PetRequest;
import com.luis.petalthbackend.dto.response.PetResponse;
import com.luis.petalthbackend.entity.Owner;
import com.luis.petalthbackend.entity.Pet;
import com.luis.petalthbackend.entity.User;
import com.luis.petalthbackend.repository.OwnerRepository;
import com.luis.petalthbackend.repository.PetRepository;
import com.luis.petalthbackend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PetService {

    private final PetRepository petRepository;
    private final OwnerRepository ownerRepository;
    private final UserRepository userRepository;

    public PetService(PetRepository petRepository, OwnerRepository ownerRepository, UserRepository userRepository) {
        this.petRepository = petRepository;
        this.ownerRepository = ownerRepository;
        this.userRepository = userRepository;
    }

    // Se usa en metodos donde se hace SELECT
    @Transactional(readOnly = true)
    public List<PetResponse> getOwnerPets(Long ownerId) {
        return petRepository.findByOwnerIdWithOwner(ownerId)
                .stream()
                .map(pet -> new PetResponse(
                        pet.getId(),
                        pet.getName(),
                        pet.getPhotoUrl(),
                        pet.getBirthDate(),
                        pet.getOwner().getUser().getFirstName() + " " + pet.getOwner().getUser().getLastName()
                )).toList();
    }

    // Se usa en escritura y lectura
    @Transactional
    public PetResponse createPet(PetRequest petRequest, String userEmail) {
        // Buscamos al usuario por su email
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Owner owner = ownerRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("Owner not found"));

        Pet pet = Pet.builder()
                .name(petRequest.name())
                .birthDate(petRequest.birthDate())
                .photoUrl(petRequest.photoUrl())
                .build();

        // Uso del helper method
        owner.addPet(pet);

        Pet savedPet = petRepository.save(pet);

        return new PetResponse(
                savedPet.getId(),
                savedPet.getName(),
                savedPet.getPhotoUrl(),
                savedPet.getBirthDate(),
                owner.getUser().getFirstName() + " " + owner.getUser().getLastName()
        );
    }

    @Transactional
    public void deletePet(Long petId, String userEmail) {
        // 1. Buscamos la mascota
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new RuntimeException("Mascota no encontrada"));

        // 2. SEGURIDAD: Comprobamos si el dueño de la mascota es el mismo que el del token
        String ownerEmail = pet.getOwner().getUser().getEmail();

        if (!ownerEmail.equals(userEmail)) {
            // Si intentan borrar la mascota de otro...
            throw new RuntimeException("No tienes permiso para eliminar esta mascota");
        }

        // Borrado lógico, no borramos de la BDD si no que lo marcamos como inactivo
        pet.setActive(false); // La marcamos como inactiva
        petRepository.save(pet); // Guardamos el cambio
    }


}
