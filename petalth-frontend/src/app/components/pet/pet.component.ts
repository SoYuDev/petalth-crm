import { Component, inject, OnInit, signal } from '@angular/core';
import { PetService } from './pet.service';
import { Pet } from './pet';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../security/service/auth.service';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pet',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './pet.component.html',
  styleUrl: './pet.component.css',
})
export class PetComponent implements OnInit {
  // Inyección dependencias.
  private petService = inject(PetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  pets = signal<Pet[]>([]);

  // Variable para mostrar el formulario de mascotas
  showForm = signal<boolean>(false);

  currentOwnerId!: number;

  // Formulario para la mascota
  petForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    birthDate: ['', [Validators.required]],
    photoUrl: [''], // Opcional
  });

  ngOnInit(): void {
    // Escuchamos la URL
    this.route.paramMap.subscribe((params) => {
      // Debe de tener obligatoriamente el nombre de la ruta de app.routes.ts
      const idString = params.get('ownerId');

      if (idString) {
        // CASO A: Estoy en /pets/5 -> Cargo los datos
        // Casi siempre vamos a tener el Caso A ya que desde el navbar se construye esa URL, el caso b protege si ponemos /pets en el navegador.
        this.currentOwnerId = Number(idString);
        this.loadPets(this.currentOwnerId);
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

  /* TODO - CRUD */
}
