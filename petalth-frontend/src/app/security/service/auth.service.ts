import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Role,
} from '../auth.interfaces';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080';

  // Usamos un signal para que la app sepa en tiempo real si hay usuario, esta puede ser AuthResponse (Interfaz para DTO) o null.
  currentUser = signal<AuthResponse | null>(this.getUserFromStorage());

  // Enviamos email y password al backend - LoginRequest (Interfaz para DTO)
  login(credentials: LoginRequest) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        // Guarda el String del token en el local storage.
        tap((response) => {
          // AQUÍ es donde el token entra al localStorage
          localStorage.setItem('token', response.token);

          // Guardamos el objeto entero en la variable signal currentUser
          localStorage.setItem('currentUser', JSON.stringify(response));

          // currentUser que era null, pasa a tener los datos del usuario.
          this.currentUser.set(response);
        }),
      );
  }

  register(datos: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/register`, datos)
      .pipe(
        // Cuando el servidor hace 200 OK guardamos sesion en el navegador.
        tap((response) => {
          // Seteamos el Token
          localStorage.setItem('token', response.token);
          // SI QUIERES QUE AL REGISTRARSE, SE LOGUEE AUTOMÁTICAMENTE:
          this.currentUser.set(response);
          localStorage.setItem('currentUser', JSON.stringify(response));
        }),
      );
  }

  // Borra el token del local storage y ponemos la señal a null para que la UI sepa que no hay nadie logueado.
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUser.set(null);
  }

  // Obtenemos el rol
  getRole(): string {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      // Parseamos y forzamos el tipo para que TS sepa qué es
      const user = JSON.parse(userStr) as AuthResponse;
      // Devolvemos unicamente el rol como String
      return user.rol;
    }
    return '';
  }

  // Si el token existe en el almacenamiento, devuelve true si no existe(null) devuelve false.
  // Esto se consigue mediante el operador !!
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // 2. Método privado para leer del 'disco duro' y mantener la sesion iniciada mientras navegamos
  private getUserFromStorage(): AuthResponse | null {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        return JSON.parse(userStr); // Recuperamos el objeto
      } catch (e) {
        console.error('Error al recuperar sesión', e);
        return null;
      }
    }
    return null; // Si no hay nada, devolvemos null
  }

  // Helper Methods
  // Pregunta si tiene un rol en específico.
  hasRole(role: Role): boolean {
    return this.currentUser()?.rol == role;
  }

  /**
   * Aunque el usuario solo tenga un rol, a veces un botón
   * es visible para varios tipos de usuario (ej: Admin y Vet).
   * Uso: authService.isOneOf(['ADMIN', 'VET'])
   */
  isOneOf(roles: Role[]): boolean {
    // '?' comprueba si hay current user, si no devuelve undefined
    const currentRole = this.currentUser()?.rol;
    if (!currentRole) return false;
    return roles.includes(currentRole);
  }

  /**
   * Helper Methods para cada Rol.
   * Hacen el código mucho más limpio.
   */
  isAdmin(): boolean {
    return this.hasRole(Role.ADMIN);
  }

  isVet(): boolean {
    return this.hasRole(Role.VET);
  }

  isUser(): boolean {
    return this.hasRole(Role.USER);
  }
}
