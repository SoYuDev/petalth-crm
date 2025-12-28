package com.luis.petalthbackend.controller;

import com.luis.petalthbackend.dto.response.VeterinarianDTO;
import com.luis.petalthbackend.repository.VeterinarianRepository;
import com.luis.petalthbackend.service.VeterinarianService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("api/veterinarians")
@CrossOrigin(origins = "http://localhost:4200") // Importante para que Angular se comunique con Spring
public class VeterinarianController {

    private final VeterinarianService veterinarianService;

    public VeterinarianController(VeterinarianService veterinarianService) {
        this.veterinarianService = veterinarianService;
    }

    @GetMapping
    public ResponseEntity<List<VeterinarianDTO>> getAllVeterinarians() {
        List<VeterinarianDTO> vetList = veterinarianService.getAllVets();
        return ResponseEntity.ok(vetList);

    }


}
