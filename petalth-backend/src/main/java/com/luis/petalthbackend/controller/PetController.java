package com.luis.petalthbackend.controller;

import com.luis.petalthbackend.dto.response.PetDTO;
import com.luis.petalthbackend.service.PetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/pets")
@CrossOrigin(origins = "http://localhost:4200")
public class PetController {
    private final PetService petService;

    public PetController(PetService petService) {
        this.petService = petService;
    }

    @GetMapping("owner/{ownerId}")
    public ResponseEntity<List<PetDTO>> getOwnerPets(@PathVariable Long ownerId) {
        return ResponseEntity.ok(petService.getOwnerPets(ownerId));
    }
}
