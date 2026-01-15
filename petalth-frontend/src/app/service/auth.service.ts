import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import {
  AuthResponse,
  LoginRequest,
} from '../components/login/auth.interfaces';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/auth';

  // Usamos un signal para que la app sepa en tiempo real si hay usuario, esta puede ser AuthResponse (Interfaz para DTO) o null.
  currentUser = signal<AuthResponse | null>(null);

  // Enviamos email y password al backend - LoginRequest (Interfaz para DTO)
  login(credentials: LoginRequest) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      // Guarda el String del token en el local storage.
      tap((response) => {
        // AQUÍ es donde el token entra al localStorage
        localStorage.setItem('token', response.token);

        // Guardamos el objeto entero en la variable signal currentUser
        localStorage.setItem('currentUser', JSON.stringify(response));

        // currentUser que era null, pasa a tener los datos del usuario.
        this.currentUser.set(response);
      })
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
}
