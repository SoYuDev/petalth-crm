import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/auth';

  // Usamos un signal para que la app sepa en tiempo real si hay usuario
  currentUser = signal<any>(null);

  // Enviamos email y password al backend
  login(credentials: { email: string; password: string }) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      // Guarda el String del token en el local storage.
      tap((response) => {
        // AQUÍ es donde el token entra al localStorage
        localStorage.setItem('token', response.token);
        // currentUser que era null, pasa a tener los datos del usuario.
        this.currentUser.set(response);
      })
    );
  }

  // Borra el token del local storage y ponemos la señal a null para que la UI sepa que no hay nadie logueado.
  logout() {
    localStorage.removeItem('token');
    this.currentUser.set(null);
  }

  // Si el token existe en el almacenamiento, devuelve true si no existe(null) devuelve false.
  // Esto se consigue mediante el operador !!
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
}
