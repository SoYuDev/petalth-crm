package com.luis.petalthbackend.entity;

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
    @JoinColumn(name = "user_id", foreignKey = @ForeignKey(name = "fk_veterinarian_petalth_user"))
    private User user;

    private String speciality;

    // En este caso no ponemos orphan removal por lógica de negocio si el veterinario se enferma,
    // y hacemos Veterinarian.getAppointments().remove(cita) esto borra la cita por completo sin poder asignarla
    // a otro veterinario
    // Quitamos REMOVE/ALL. Si borras el objeto Java, las citas NO se borran en cascada.
    @OneToMany(mappedBy = "veterinarian", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private List<Appointment> appointments = new ArrayList<>();

    // Helper methods
    public void addAppointment(Appointment appointment) {
        appointments.add(appointment);
        appointment.setVeterinarian(this);
    }

    public void removeAppointment(Appointment appointment) {
        appointments.remove(appointment);
        appointment.setVeterinarian(null);
    }
}
