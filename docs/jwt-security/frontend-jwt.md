# JWT Angular

Notas para la implementación de JWT en Angular.

## 1. Interceptor (auth.interceptor.ts)

En Angular, un **Interceptor** es una pieza de software que actúa como un "middleware" o un peaje. Su función es interceptar todas las peticiones HTTP (`GET`, `POST`, `PUT`, etc.) que salen de la aplicación hacia el servidor antes de que lleguen a la red.

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