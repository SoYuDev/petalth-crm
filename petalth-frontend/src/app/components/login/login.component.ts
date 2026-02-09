import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../security/service/auth.service';
import { CommonModule } from '@angular/common';
import { LoginRequest } from '../../security/auth.interfaces';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink], // Importante importar ReactiveFormsModule
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signal para mensajes de error
  errorMessage = signal<string>('');

  // loginForm es un objeto de tipo FormGroup, contiene los inputs y vigila lo que el usuario escribe.
  // Esta variable se mantiene sincronizada con el HTML mediante [formGroup]="loginForm"
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  // Comprueba que loginForm es válido.
  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    // Extraemos los valores del formulario que había en loginForm
    const credentials: LoginRequest = {
      // ?? -> Operador de fusión nula. Si this.loginForm.value.email es null, cogerá el valor de la derecha, en este caso un string vacío.
      // Realmente esto es una validación extra ya que el propio objeto loginForm ya realiza validaciones con Validators.required por lo que el string nunca será vacío.
      email: this.loginForm.value.email ?? '',
      password: this.loginForm.value.password ?? '',
    };

    // Llamamos al servicio suscribiendonos al observable
    this.authService.login(credentials).subscribe({
      next: () => {
        // Si todo sale bien, redirigimos a la home page (Spring Boot manda un 200 OK)
        this.router.navigate(['/']);
      },
      // Si hay un error (Spring Boot manda 401 o 403)
      error: (err) => {
        console.error('Error en login:', err);
        this.errorMessage.set(
          'Credenciales incorrectas o fallo del servidor. Inténtalo de nuevo.',
        );
      },
    });
  }
}
