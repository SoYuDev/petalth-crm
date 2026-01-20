import { HttpInterceptorFn } from '@angular/common/http';

// El interceptor revisa cada petición HTTP y si detecta un Token, copia la request y establece como headers `Bearer + tokenJWT`
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token'); // Recuperamos el token guardado

  // Si el token existe, clonamos la petición y le añadimos el header.
  if (token) {
    // Parte clave, clonamos la peticion HTTP y ponemos lo necesario para que el backend acepte la peticion (Poner en el header Authorization: `Bearer + token`)
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
