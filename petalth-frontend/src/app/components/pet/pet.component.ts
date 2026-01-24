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

  // --- LÓGICA DEL CRUD ---

  toggleForm() {
    this.showForm.update((value) => !value);
  }

  onSubmit() {
    if (this.petForm.invalid || !this.currentOwnerId) return;

    // Preparamos el objeto para enviar al backend
    // Aquí mandamos el objeto plano y asumimos que el service lo gestiona.
    const newPet: any = {
      ...this.petForm.value,
      owner: { id: this.currentOwnerId }, // Vinculamos al dueño actual
    };

    this.petService.createPet(newPet).subscribe({
      next: (petCreada) => {
        // Actualizamos la lista localmente añadiendo la nueva mascota
        this.pets.update((currentPets) => [...currentPets, petCreada]);
        this.toggleForm(); // Cerramos formulario
        this.petForm.reset(); // Limpiamos campos
      },
      error: (err) => console.error('Error al crear mascota', err),
    });
  }

  deletePet(id: number) {
    if (confirm('¿Estás seguro de querer borrar a esta mascota?')) {
      this.petService.deletePet(id).subscribe(() => {
        // Filtramos la lista para quitar el borrado
        this.pets.update((list) => list.filter((p) => p.id !== id));
      });
    }
  }

  // --- UTILIDADES ---

  // Función para calcular edad a partir de fecha de nacimiento
  calculateAge(birthDateString: string): string {
    const birthDate = new Date(birthDateString);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age + (age === 1 ? ' año' : ' años');
  }
}
