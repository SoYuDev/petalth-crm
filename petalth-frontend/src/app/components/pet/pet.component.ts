import { Component, inject, OnInit, signal } from '@angular/core';
import { PetService } from './pet.service';
import { Pet } from './pet';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-pet',
  standalone: true,
  imports: [],
  templateUrl: './pet.component.html',
  styleUrl: './pet.component.css',
})
export class PetComponent implements OnInit {
  private petService = inject(PetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  pets = signal<Pet[]>([]);

  ngOnInit(): void {
    // Escuchamos la URL
    this.route.paramMap.subscribe((params) => {
      const idString = params.get('ownerId');

      if (idString) {
        // CASO A: Estoy en /pets/5 -> Cargo los datos
        const ownerId = Number(idString);
        this.loadPets(ownerId);
      } else {
        // CASO B: Estoy en /pets (sin nada) -> Redirijo
        const myId = this.authService.currentUser()?.id;
        if (myId) {
          // Navego a /pets/MI_ID
          // replaceUrl: true hace que el botón "Atrás" no se vuelva loco
          this.router.navigate(['/pets', myId], { replaceUrl: true });
        }
      }
    });
  }

  loadPets(id: number): void {
    // El service se encarga de llamar al endpoint expuesto
    this.petService.getByOwnerId(id).subscribe((data) => {
      this.pets.set(data);
    });
  }
}
