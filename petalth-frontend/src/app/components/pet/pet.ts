export interface Pet {
  id?: number; // Opcional: Al crear una mascota nueva, aún no tiene ID
  name: string;
  photoUrl?: string;
  birthDate: string;

  owner?: string; // Opcional: Nos lo da el backend al leer, pero no lo enviamos al crear
  ownerId?: number; // Opcional: Lo usamos nosotros para enviar el ID del dueño al backend
}
