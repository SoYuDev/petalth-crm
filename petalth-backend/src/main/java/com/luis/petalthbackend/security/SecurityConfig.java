package com.luis.pealthbackend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // Deshabilitamos CSRF para que no pida tokens en las peticiones POST/PUT
                .csrf(csrf -> csrf.disable())
                // Permitimos el acceso a TODAS las rutas sin autenticación
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }
}
