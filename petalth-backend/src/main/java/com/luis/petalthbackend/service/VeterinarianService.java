package com.luis.petalthbackend.service;

import com.luis.petalthbackend.dto.response.VeterinarianDTO;
import com.luis.petalthbackend.repository.VeterinarianRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VeterinarianService {
    private final VeterinarianRepository veterinarianRepository;

    public VeterinarianService(VeterinarianRepository veterinarianRepository) {
        this.veterinarianRepository = veterinarianRepository;
    }

    public List<VeterinarianDTO> getAllVets() {
        return veterinarianRepository.findAll()
                .stream()
                .map(vet -> new VeterinarianDTO(
                        vet.getId(),
                        vet.getUser().getFirstName() + vet.getUser().getLastName(),
                        vet.getSpeciality()

                )).toList();
    }
}
