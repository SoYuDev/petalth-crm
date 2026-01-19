import { Component, inject } from '@angular/core';
import { AuthService } from '../../security/service/auth.service';
import { Router, RouterLink } from '@angular/router';
import { RegisterRequest } from '../../security/auth.interfaces';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Inicializar el objeto vacío para el formulario.
  registerData: RegisterRequest = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  };

  errorMessage: string = '';

  onRegister() {
    this.authService.register(this.registerData).subscribe({
      next: (response) => {
        console.log('Registro exitoso', response);
        // Al registrarse, el AuthService ya guardó el token en el Signal
        // Redirigimos al usuario a sus mascotas usando su nuevo ID
        this.router.navigate(['/pets', response.id]);
      },
      error: (err) => {
        this.errorMessage =
          'Fallo en el registro. Revisa que el email no esté en uso.';
        console.error(err);
      },
    });
  }
}
