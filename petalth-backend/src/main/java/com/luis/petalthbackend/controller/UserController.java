// UserController.java
package com.luis.petalthbackend.controller;

import com.luis.petalthbackend.entity.User;
import com.luis.petalthbackend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/users")
@CrossOrigin(origins = "http://localhost:4200")
@Tag(name = "Usuarios", description = "Operaciones de gestión de personal y usuarios")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Operation(
        summary = "Cambiar estado de usuario",
        description = "Alterna el estado (Activo/Inactivo) de un usuario (baja lógica). Soft Delete"
    )
    @PatchMapping("/{id}/toggle-active")
    @Transactional // Necesario para guardar automáticamente los cambios en la entidad
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        user.setActive(!user.isActive());
        userRepository.save(user);
        
        return ResponseEntity.ok().build();
    }
}