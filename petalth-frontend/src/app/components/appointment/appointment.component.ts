import { Component, inject, signal } from '@angular/core';
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

  
  appointments = signal<Appointment[]>([]);

  // 3. Al iniciar el componente, nos suscribimos al observable
  ngOnInit(): void {
    this.service.getAll().subscribe({
      // Cuando abrimos el grifo del observer (entran los datos...)
      next: (data) => {
        this.appointments.set(data) // Guardamos los datos cuando llegan
        console.log('Datos recibidos:', data);
      },
      error: (e) => console.error(e),
    });
  }
}
