import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Pet } from './pet';

@Injectable({
  providedIn: 'root',
})
export class PetService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/pets';

  // Obtener mascotas a partir del Owner Id
  getByOwnerId(ownerId: number) {
    return this.http.get<Pet[]>(`${this.apiUrl}/owner/${ownerId}`);
  }
}
