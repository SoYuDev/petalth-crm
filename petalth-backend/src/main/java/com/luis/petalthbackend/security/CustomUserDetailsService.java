package com.luis.petalthbackend.security;

import com.luis.petalthbackend.entity.User;
import com.luis.petalthbackend.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
// Clase que se encarga de traducir el usuario que obtenemos a partir de una consulta a la BDD y lo modificamos para
// pasarlo a un UserDetails que sí que entiende Spring Security
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // 1. Buscamos el usuario en nuestra DB.
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // 2. Convertimos nuestro user a un UserDetails que Spring Security entienda
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .disabled(!user.isActive())
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                // SimpleGrantedAuthority dice qué permisos tiene el usuario p.j. ROLE_ADMIN
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRol().toString())))
                .build();
    }


}
