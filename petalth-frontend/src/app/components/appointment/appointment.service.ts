import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Appointment } from './appointment';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/appointments';
  
  getAll() {
    return this.http.get<Appointment[]>('http://localhost:8080/api/appointments');
  }

  // Obtener solo mis citas (como veterinario logueado)
  getMyAppointments() {
    return this.http.get<Appointment[]>(`${this.apiUrl}/my-agenda`);
  }
}