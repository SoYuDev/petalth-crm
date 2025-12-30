import { Component, inject, OnInit, signal } from '@angular/core';
import { PetService } from './pet.service';
import { Pet } from './pet';

@Component({
  selector: 'app-pet',
  standalone: true,
  imports: [],
  templateUrl: './pet.component.html',
  styleUrl: './pet.component.css',
})
export class PetComponent implements OnInit {
  private petService = inject(PetService);

  pets = signal<Pet[]>([]);

  ngOnInit(): void {
    this.loadPets();
  }

  loadPets(): void {
    const ownerId = 6;
    this.petService.getByOwnerId(ownerId).subscribe((data) => {
      this.pets.set(data);
    });
  }
}
