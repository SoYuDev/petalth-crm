package com.luis.petalthbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "petalth_user")
public class User implements UserDetails {
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

    @Builder.Default
    private boolean active = true;

    // Metodos de UserDetails
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Convierte tu enum ROL en un permiso que Spring entienda
        return List.of(new SimpleGrantedAuthority(rol.name()));
    }

    @Override
    public String getUsername() {
        return email; // Nuestro "usuario" es el email
    }

    @Override
    public String getPassword() {
        return password; // Devuelve la contraseña ya encriptada
    }

    // Configuración de expiración (todo a true para el MVP)
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
