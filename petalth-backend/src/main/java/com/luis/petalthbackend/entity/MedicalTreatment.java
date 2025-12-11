package com.luis.pealthbackend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
// El Owner tendrá un eligirá un "motivo" (Quizás en un desplegable) de consulta cuando agende su la cita para su mascota.
// Relacion unidireccional ya que solo queremos navegar del padre a la hija
// La hariamos bidireccional si por ejemplo queremos obtener todas las citas que tengan el nombre vacunacion
public class MedicalTreatment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // Vacunación, Cirugía, Consulta...
    private String description;
    private Integer durationMinutes;

    @Builder.Default
    private boolean active = true; // Si dejamos de ofrecer el servicio en concreto
}
