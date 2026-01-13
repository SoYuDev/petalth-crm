# JWT Angular

Notas para la implementación de JWT en Angular.

## 1. Interceptor (auth.interceptor.ts)

En Angular, un **Interceptor** es una pieza de software que actúa como un "middleware" o un peaje. Su función es interceptar todas las peticiones HTTP (`GET`, `POST`, `PUT`, etc.) que salen de la aplicación hacia el servidor antes de que lleguen a la red.

1. Espera a que cualquier servicio envie una petición HTTP al back (servidor)
2. Antes de enviar la petición mira en AuthService hay un token para enviar en el HTTP "Authorization: Bearer <Token>"
3. Actua siempre que hagamos una petición HTTP.

```typescript
import { HttpInterceptorFn } from "@angular/common/http";

// El interceptor revisa cada petición HTTP y si detecta un Token, copia la request y establece como headers `Bearer + tokenJWT`
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem("token"); // Recuperamos el token guardado

  // Si el token existe, clonamos la petición y le añadimos el header
  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(cloned);
  }

  // Si no hay token (ej: en el login), la petición sigue normal (rutas publicas)
  return next(req);
};
```

## 2. AuthService

Centraliza la comunicación con el endpoint de seguridad.

1. Envia las credenciales al servidor para recibir el Token
2. Lo guarda en localStorage para mantenerlo aun cerrando el navegador
3. A través de signals podemos decirle a la app que tenemos un usuario logueado.

```typescript
import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { tap } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = "http://localhost:8080/auth";

  // Usamos un signal para que la app sepa en tiempo real si hay usuario
  currentUser = signal<any>(null);

  // Enviamos email y password al backend
  login(credentials: { email: string; password: string }) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      // Guarda el String del token en el local storage.
      tap((response) => {
        // AQUÍ es donde el token entra al localStorage
        localStorage.setItem("token", response.token);
        // currentUser que era null, pasa a tener los datos del usuario.
        this.currentUser.set(response);
      })
    );
  }

  // Borra el token del local storage y ponemos la señal a null para que la UI sepa que no hay nadie logueado.
  logout() {
    localStorage.removeItem("token");
    this.currentUser.set(null);
  }

  // Si el token existe en el almacenamiento, devuelve true si no existe(null) devuelve false.
  // Esto se consigue mediante el operador !!
  isLoggedIn(): boolean {
    return !!localStorage.getItem("token");
  }
}
```
