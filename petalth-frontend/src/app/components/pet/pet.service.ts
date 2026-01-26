import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Pet } from './pet';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PetService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/pets';

  // Obtener mascotas a partir del Owner Id
  getByOwnerId(ownerId: number): Observable<Pet[]> {
    return this.http.get<Pet[]>(`${this.apiUrl}/owner/${ownerId}`);
  }

  // Crear nueva mascota
  createPet(pet: Pet): Observable<Pet> {
    return this.http.post<Pet>(this.apiUrl, pet);
  }

  // Borrar una mascota por ID
  deletePet(petId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${petId}`);
  }
}
