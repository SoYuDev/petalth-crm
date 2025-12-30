package com.luis.petalthbackend.controller;

import com.luis.petalthbackend.dto.response.PetDTO;
import com.luis.petalthbackend.service.PetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/pets")
@CrossOrigin(origins = "http://localhost:4200")
@Tag(name = "Mascotas", description = "Gestión de Mascotas") // Swagger Annotation
public class PetController {
    private final PetService petService;

    public PetController(PetService petService) {
        this.petService = petService;
    }

    // Swagger Annotation
    @Operation(summary = "Listar mascotas del dueño",
            description = "Obtiene las mascotas específicas a partir del Id del dueño")
    @GetMapping("owner/{ownerId}")
    public ResponseEntity<List<PetDTO>> getOwnerPets(@PathVariable Long ownerId) {
        return ResponseEntity.ok(petService.getOwnerPets(ownerId));
    }
}
