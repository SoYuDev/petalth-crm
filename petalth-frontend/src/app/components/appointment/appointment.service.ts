import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Appointment } from './appointment';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  
  getAll() {
    return this.http.get<Appointment[]>('http://localhost:8080/api/appointments');
  }
}