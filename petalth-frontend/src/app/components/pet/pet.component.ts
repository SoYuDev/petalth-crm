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
  
  // 1. Mostrar/Ocultar formulario
  toggleForm() {
    this.showForm.update((value) => !value);
  }

  // 2. Método CREAR (Submit)
  onSubmit() {
    // Validamos: formulario correcto y que tengamos el ID del dueño
    if (this.petForm.invalid || !this.currentOwnerId) {
      this.petForm.markAllAsTouched();
      return;
    }

    // CREAMOS EL OBJETO CON TIPO 'Pet' ESTRICTO
    const newPet: Pet = {
      // id: undefined (porque es nueva)
      name: this.petForm.value.name,
      birthDate: this.petForm.value.birthDate,
      photoUrl: this.petForm.value.photoUrl,

      // owner: undefined (el backend lo calculará)
      ownerId: this.currentOwnerId, // <--- Enviamos el ID para que Java sepa de quién es
    };

    // Llamamos al servicio
    this.petService.createPet(newPet).subscribe({
      next: (petCreada) => {
        // ACTUALIZACIÓN OPTIMISTA (Signals)
        // El backend nos devuelve la mascota YA creada (con ID y con nombre de owner)
        // La añadimos a la lista visualmente
        this.pets.update((currentPets) => [...currentPets, petCreada]);

        // Cerramos y limpiamos
        this.toggleForm();
        this.petForm.reset();
      },
      error: (err) => console.error('Error al crear:', err),
    });
  }

  // 3. Método BORRAR
  deletePet(petId: number | undefined) {
    // petId puede ser undefined según la interfaz, lo controlamos
    if (!petId) return;

    if (confirm('¿Estás seguro de querer eliminar esta mascota?')) {
      this.petService.deletePet(petId).subscribe({
        next: () => {
          // Quitamos la mascota de la lista visualmente
          this.pets.update((currentPets) =>
            currentPets.filter((p) => p.id !== petId),
          );
        },
        error: (err) => console.error('Error al borrar:', err),
      });
    }
  }

  // 4. Utilidad para calcular edad (Copiada del ejemplo anterior)
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
