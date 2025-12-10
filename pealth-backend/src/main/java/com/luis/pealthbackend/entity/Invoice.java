package com.luis.pealthbackend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime issueDate; // Fecha de emisión

    // BigDecimal es obligatorio para cálculos monetarios precisos
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    private InvoiceStatus status;

    // Appointment es la entidad fuerte, ya que sin ella no existe Invoice
    @OneToOne
    @JoinColumn(name = "appointment_id",
            foreignKey = @ForeignKey(name = "fk_invoice_appointment"),
            unique = true) // unique=true fuerza 1 a 1 real en BD
    private Appointment appointment;

}
