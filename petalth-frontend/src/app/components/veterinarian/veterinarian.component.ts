import { Component, OnInit, inject, signal } from '@angular/core';
import { VeterinarianService } from './veterinarian.service';
import { Veterinarian } from './veterinarian';

@Component({
  selector: 'app-veterinarian',
  standalone: true,
  imports: [],
  templateUrl: './veterinarian.component.html',
  styleUrl: './veterinarian.component.css',
})
export class VeterinarianComponent implements OnInit {
  // 1. Inyectamos el servicio
  private service = inject(VeterinarianService);

  veterinarians = signal<Veterinarian[]>([]);

  // Guardamos el veterinario seleccionado para mostrarlo en el modal
  selectedVet = signal<Veterinarian | null>(null);

  // 3. Al iniciar el componente, nos suscribimos al observable
  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: (data) => {
        this.veterinarians.set(data); // Guardamos los datos cuando llegan
        console.log('Datos recibidos:', data);
      },
      error: (e) => console.error(e),
    });
  }

  viewVetDetails(vet: Veterinarian) {
    this.selectedVet.set(vet);
  }

  // Método que devuelve una URL distinta según la especialidad
// Método que devuelve una URL distinta y estable según la especialidad
  getSpecialityIcon(speciality: string | undefined): string {
    switch (speciality) {
      case 'Odontología':
        // Icono de un diente limpio y claro
        return 'https://img.icons8.com/color/256/tooth.png'; 
        
      case 'Cirugía y Traumatología':
        // Icono de material quirúrgico / salud
        return 'https://img.icons8.com/color/256/surgery.png'; 
        
      case 'Medicina Interna':
        // Icono de un estetoscopio
        return 'https://img.icons8.com/color/256/stethoscope.png'; 
        
      default:
        // Icono de usuario médico genérico (neutral)
        return 'https://img.icons8.com/color/256/gender-neutral-user.png'; 
    }
  }
}
