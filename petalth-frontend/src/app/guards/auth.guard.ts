import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { Role } from '../components/login/auth.interfaces';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. ¿Está logueado?
  if (!authService.isLoggedIn() || !authService.currentUser()) {
    // Si no, fuera (al login)
    return router.createUrlTree(['/login']);
  }

  const currentUser = authService.currentUser();
  const routeId = route.paramMap.get('ownerId'); // El ID de la URL (/pets/5)

  // 2. Si la ruta tiene un ID (/pets/5) y NO somos ADMIN...
  if (routeId) {
    const idEnUrl = Number(routeId);
    const miId = currentUser?.id;

    // Si intento entrar en un ID que no es el mío
    if (miId !== idEnUrl && currentUser?.rol !== Role.ADMIN) {
      console.warn(
        'Intento de acceso no autorizado. Redirigiendo a tu perfil.',
      );
      // Te redirijo a TU propia página de mascotas
      return router.createUrlTree(['/pets', miId]);
    }
  }

  // Si pasas todas las pruebas, adelante
  return true;
};
