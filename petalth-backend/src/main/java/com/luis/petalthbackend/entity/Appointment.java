package com.luis.petalthbackend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Usamos LocalDateTime para guardar Fecha y Hora juntas
    private LocalDateTime dateTime;

    @ManyToOne(fetch =  FetchType.LAZY)
    @JoinColumn(name = "medicaltreatment_id", foreignKey = @ForeignKey(name = "fk_appointment_medicaltreatment"))
    private MedicalTreatment service;
    private String diagnosis; // Notas del veterinario después de la consulta.

    @Enumerated(EnumType.STRING)
    private AppointmentStatus status;

    // Relación N:1 -> Muchas citas pueden ser para una misma mascota
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", foreignKey = @ForeignKey(name = "fk_appointment_pet"))
    private Pet pet;

    // Relación N:1 -> Muchas citas las atiende un mismo veterinario
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "veterinarian_id", foreignKey = @ForeignKey(name = "fk_appointment_veterinarian"))
    private Veterinarian veterinarian;

    // Relación 1:1 -> Una cita genera una factura (Opcional, puede ser null al principio)
    // Appointment es la entidad fuerte de la relación con Invoice
    @OneToOne(mappedBy = "appointment", cascade = CascadeType.ALL)
    private Invoice invoice;

    // Helper Methods OneToOne
    public void addInvoice(Invoice invoice) {
        this.invoice = invoice;
        if (invoice != null) {
            invoice.setAppointment(this);
        }
    }
}
