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

  // Variable para controlar qué mascota estamos editando (null = modo crear)
  editingPetId = signal<number | null>(null);

  // Calculamos la fecha de hoy en formato YYYY-MM-DD
  // new Date().toISOString() devuelve algo como "2023-10-25T14:30:00.000Z"
  // Hacemos split('T') y nos quedamos con la primera parte [0]
  today: string = new Date().toISOString().split('T')[0];

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
      // El argumento de params.get(...) debe de coincidir obligatoriamente el nombre del parámetro de la ruta dinámica de app.routes.ts
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

  // 1. Mostrar formulario para CREAR (Limpio)
  openCreateForm() {
    this.editingPetId.set(null); // Aseguramos que es modo CREAR (sin ID)
    this.petForm.reset(); // Limpiamos el formulario
    this.showForm.set(true); // Mostramos el form
  }

  // 2. Mostrar formulario para EDITAR (Cargamos datos)
  loadPetForEdit(pet: Pet) {
    this.editingPetId.set(pet.id || null); // Guardamos el ID que estamos editando

    // patchValue rellena el formulario automáticamente con los datos de la mascota
    this.petForm.patchValue({
      name: pet.name,
      birthDate: pet.birthDate,
      // Si pet.photoUrl tiene algo, lo pone. Si es null/vacío, deja el input vacío.
      photoUrl: pet.photoUrl,
    });

    this.showForm.set(true); // Abrimos el form
  }

  // 3. Cerrar formulario y limpiar
  closeForm() {
    this.showForm.set(false);
    this.editingPetId.set(null);
    this.petForm.reset();
  }

  // 4. Método INTELIGENTE (Submit: Crear o Editar)
  onSubmit() {
    // Validamos: formulario correcto y que tengamos el ID del dueño
    if (this.petForm.invalid || !this.currentOwnerId) {
      this.petForm.markAllAsTouched();
      return;
    }

    const formValues = this.petForm.value;

    // CREAMOS EL OBJETO CON TIPO 'Pet' ESTRICTO
    const petData: Pet = {
      // id: undefined (porque es nueva) y el motor de BDD se encarga de general el ID
      name: formValues.name,
      birthDate: formValues.birthDate,
      photoUrl: formValues.photoUrl,

      // owner: undefined (el backend lo calculará)
      ownerId: this.currentOwnerId, // <--- Enviamos el ID para que el backend sepa de quién es
    };

    // --- DECISIÓN: ¿Estamos Editando o Creando? ---
    // Si el valor es null o vacío dará false.
    if (this.editingPetId()) {
      // MODO UPDATE
      const idToUpdate = this.editingPetId()!;

      this.petService.updatePet(idToUpdate, petData).subscribe({
        next: (petActualizada) => {
          // ACTUALIZACIÓN OPTIMISTA (Signals)
          // Buscamos la mascota en la lista y la sustituimos por la nueva
          // Mediante un stream pregunta si p tiene le id de la pet que quiero actualizar, si lo es se sustituye por la petActualizada si no seguira siendo p
          this.pets.update((list) =>
            list.map((p) => (p.id === idToUpdate ? petActualizada : p)),
          );
          this.closeForm(); // Cerramos y limpiamos
        },
        error: (err) => console.error('Error al actualizar:', err),
      });
    } else {
      // MODO CREATE
      this.petService.createPet(petData).subscribe({
        next: (petCreada) => {
          // ACTUALIZACIÓN OPTIMISTA (Signals)
          // La añadimos a la lista visualmente, usamos el spread operator... respetando la inmutabilidad.
          this.pets.update((currentPets) => [...currentPets, petCreada]);
          this.closeForm(); // Cerramos y limpiamos
        },
        error: (err) => console.error('Error al crear:', err),
      });
    }
  }

  // 5. Método BORRAR
  deletePet(petId: number | undefined) {
    // petId puede ser undefined según la interfaz, lo controlamos
    if (!petId) return;

    // El navegador nos saca un aviso
    if (confirm('¿Estás seguro de querer eliminar esta mascota?')) {
      this.petService.deletePet(petId).subscribe({
        next: () => {
          // Quitamos la mascota de la lista en el front
          this.pets.update((currentPets) =>
            currentPets.filter((p) => p.id !== petId),
          );
        },
        error: (err) => console.error('Error al borrar:', err),
      });
    }
  }

  // 6. Utilidad para calcular edad
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
