package com.luis.petalthbackend.service;

import com.luis.petalthbackend.dto.response.PetDTO;
import com.luis.petalthbackend.repository.PetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PetService {

    private final PetRepository petRepository;

    public PetService(PetRepository petRepository) {
        this.petRepository = petRepository;
    }

    @Transactional(readOnly = true)
    public List<PetDTO> getOwnerPets(Long ownerId) {
        return petRepository.findByOwnerIdWithOwner(ownerId)
                .stream()
                .map(pet -> new PetDTO(
                        pet.getId(),
                        pet.getName(),
                        pet.getPhotoUrl(),
                        pet.getBirthDate(),
                        pet.getOwner().getUser().getFirstName() + pet.getOwner().getUser().getLastName()
                )).toList();
    }


}
