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
public class Owner {

    @Id
    private Long id; // No es autogenerado, ya que obtenemos el id a partir de la tabla 'petalth_user'

    private String phone;
    private String address;

    @OneToOne
    @MapsId // Define que establezca su ID de User al mismo valor que el ID del dueño
    // @JoinColumn - Creamos la relación entre tablas, name da nombre a la columna, @ForeignKey da nombre al constraint
    // Aquí no hace falta poner unique = true porque estamos obteniendo la pk a partir de User lo que hace que
    // por definición todos los valores del registro sean unicos.
    @JoinColumn(name = "user_id", foreignKey = @ForeignKey(name = "fk_owner_petalth_user"))
    private User user;

    @OneToMany(mappedBy = "owner", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default // No es necesario con builder definir pets y de esta manera no sobrescribe la lista
    private List<Pet> pets = new ArrayList<>();

    // Helper methods -- Necesarios en relaciones bidireccionales.
    public void addPet(Pet pet) {
        this.pets.add(pet);
        pet.setOwner(this); // Establecemos el dueño (Esta instancia) en la mascota
    }

    public void removePet(Pet pet) {
        this.pets.remove(pet); // Quitamos al animal de la lista
        pet.setOwner(null); // Rompemos la relación
    }
}
