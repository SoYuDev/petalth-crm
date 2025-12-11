import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Veterinarian } from './veterinarian';

@Injectable({ providedIn: 'root' })
export class VeterinarianService {
  private http = inject(HttpClient);
  
  getAll() {
    return this.http.get<Veterinarian[]>('http://localhost:8080/api/veterinarians/');
  }
}