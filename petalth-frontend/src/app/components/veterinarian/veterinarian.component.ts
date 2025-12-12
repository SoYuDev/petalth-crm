import { Component, OnInit, inject } from '@angular/core';
import { VeterinarianService } from './veterinarian.service';
import { Veterinarian } from './veterinarian';

@Component({
  selector: 'app-veterinarian',
  standalone: true,
  imports: [],
  templateUrl: './veterinarian.component.html',
  styleUrl: './veterinarian.component.css'
})
export class VeterinarianComponent implements OnInit {
  
  // 1. Inyectamos el servicio
  private service = inject(VeterinarianService);

  // 2. Creamos la variable normal (array vacío al principio)
  veterinarians: Veterinarian[] = [];

  // 3. Al iniciar el componente, nos suscribimos al observable
  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: (data) => {
        this.veterinarians = data; // Guardamos los datos cuando llegan
        console.log('Datos recibidos:', data);
      },
      error: (e) => console.error(e)
    });
  }
}