import { Component, inject, OnInit, signal } from '@angular/core';
import { PetService } from './pet.service';
import { Pet } from './pet';
import { ActivatedRoute } from '@angular/router';

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

  pets = signal<Pet[]>([]);

  ngOnInit(): void {
    this.loadPets();
  }

  loadPets(): void {
    // Obtenemos el 'ownerId' que definimos en app.routes.ts
    const ownerId = Number(this.route.snapshot.paramMap.get('ownerId'));
    // El service se encarga de llamar al endpoint expuesto
    this.petService.getByOwnerId(ownerId).subscribe((data) => {
      this.pets.set(data);
    });
  }
}
