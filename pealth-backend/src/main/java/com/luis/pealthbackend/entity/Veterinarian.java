package com.luis.pealthbackend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
public class Veterinarian {

    @Id
    private Long id; // Copia el ID del user con @MapsId más adelante, por eso @GeneratedValue no es necesario

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    private String speciality;

    @OneToMany(mappedBy = "veterinarian", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Appointment> appointments = new ArrayList<>();
}
