package com.luis.pealthbackend.controller;

import com.luis.pealthbackend.dto.VeterinarianDTO;
import com.luis.pealthbackend.repository.VeterinarianRepository;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("api/veterinarians")
@CrossOrigin(origins = "http://localhost:4200") // Importante para que Angular se comunique con Spring
public class VeterinarianController {

    private VeterinarianRepository veterinarianRepository;

    // Constructor DI
    public VeterinarianController(VeterinarianRepository veterinarianRepository) {
        this.veterinarianRepository = veterinarianRepository;
    }

    @GetMapping("/")
    public List<VeterinarianDTO> getAllVeterinarians() {

        return veterinarianRepository.findAll()
                .stream()
                // A partir del veterinario, creamos un DTO con la información que queramos pasar a Angular.
                .map(vet -> new VeterinarianDTO(vet.getId(),
                        vet.getUser().getFirstName() + " " + vet.getUser().getLastName(),
                        vet.getSpeciality()
                ))
                .toList();
    }


}
