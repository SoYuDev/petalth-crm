import { Component, inject } from '@angular/core';
import { AppointmentService } from './appointment.service';
import { Appointment } from './appointment';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [],
  templateUrl: './appointment.component.html',
  styleUrl: './appointment.component.css',
})
export class AppointmentComponent {
  // 1. Inyectamos el servicio
  private service = inject(AppointmentService);

  // 2. Creamos la variable normal (array vacío al principio)
  appointments: Appointment[] = [];

  // 3. Al iniciar el componente, nos suscribimos al observable
  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: (data) => {
        this.appointments = data; // Guardamos los datos cuando llegan
        console.log('Datos recibidos:', data);
      },
      error: (e) => console.error(e),
    });
  }
}
