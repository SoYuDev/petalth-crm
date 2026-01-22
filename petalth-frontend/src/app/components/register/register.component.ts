import { Component, inject } from '@angular/core';
import { AuthService } from '../../security/service/auth.service';
import { Router, RouterLink } from '@angular/router';
import { RegisterRequest } from '../../security/auth.interfaces';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage: string = '';

  // Creación de objeto tipo FormGroup para las validaciones
  registerForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{9}$')]], // Ejemplo: solo números, 9 dígitos
    address: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onRegister() {
    // Si el formulario no es válido, detenemos la ejecución.
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched(); // Marca todos los campos como "tocados" para que salgan los errores en rojo.
      return;
    }

    // Convertimos los valores del formulario a la interfaz RegisterRequest
    // 'as RegisterRequest' fuerza el tipo, asegurándonos de que los datos coinciden.
    const registerRequest = this.registerForm.getRawValue() as RegisterRequest;

    this.authService.register(registerRequest).subscribe({
      next: (response) => {
        console.log('Registro exitoso', response);
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
