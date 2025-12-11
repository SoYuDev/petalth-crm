package com.luis.pealthbackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "pealth_user")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String firstName;
    private String lastName;

    // El email va a ser único para cada usuario.
    @Column(unique = true)
    private String email;

    private String password;

    // Guarda el nombre de la constante en el campo rol, sin la anotación usaría EnumType.Ordinal que guarda
    // el índice (0, 1, 2...)
    @Enumerated(EnumType.STRING)
    private Rol rol;
}
