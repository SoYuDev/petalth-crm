import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { AppointmentService } from './appointment.service';
import { Appointment } from './appointment';
import { CommonModule } from '@angular/common'; // Necesario para date pipe y ngClass

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointment.component.html',
  styleUrl: './appointment.component.css',
})
export class AppointmentComponent implements OnInit {
  // 1. Inyectamos el servicio
  private service = inject(AppointmentService);

  appointments = signal<Appointment[]>([]);

  // Estado para el orden: 'asc' (próximas primero) o 'desc' (lejanas primero)
  sortOrder = signal<'asc' | 'desc'>('asc');

  // Signal computada: se actualiza sola si las citas cambian o pulsamos el botón de ordenar
  sortedAppointments = computed(() => {
    // Hacemos una copia para no mutar el array original
    const list = [...this.appointments()]; 
    
    return list.sort((a, b) => {
      const dateA = new Date(a.dateTime).getTime();
      const dateB = new Date(b.dateTime).getTime();
      return this.sortOrder() === 'asc' ? dateA - dateB : dateB - dateA;
    });
  });

  // 3. Al iniciar el componente, nos suscribimos al observable
  ngOnInit(): void {
    // Usamos la nueva ruta para obtener solo las citas de este veterinario
    this.service.getMyAppointments().subscribe({
      // Cuando abrimos el grifo del observer (entran los datos...)
      next: (data) => {
        this.appointments.set(data); // Guardamos los datos cuando llegan
        console.log('Datos recibidos:', data);
      },
      error: (e) => console.error(e),
    });
  }

  // Método para el botón de alternar orden
  toggleSort() {
    this.sortOrder.update(order => order === 'asc' ? 'desc' : 'asc');
  }

  // Utilidad visual para colores según el estado
  getStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'bg-success'; // Verde
      case 'PENDING': return 'bg-warning text-dark'; // Amarillo
      case 'CANCELLED': return 'bg-danger'; // Rojo
      default: return 'bg-secondary';
    }
  }

  // Traducción visual del estado
  getStatusText(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'Completada';
      case 'PENDING': return 'Pendiente';
      case 'CANCELLED': return 'Cancelada';
      default: return status;
    }
  }

  // Método para cambiar el estado desde la UI
  changeStatus(id: number, newStatus: string) {
    // Pedimos confirmación rápida si va a cancelar (por seguridad MVP)
    if (newStatus === 'CANCELLED' && !confirm('¿Seguro que quieres cancelar esta cita?')) {
      return;
    }

    this.service.updateStatus(id, newStatus).subscribe({
      next: (updatedAppt) => {
        // ACTUALIZACIÓN OPTIMISTA: Buscamos la cita antigua y la pisamos con la nueva
        this.appointments.update(list => 
          list.map(a => a.id === id ? updatedAppt : a)
        );
      },
      error: (err) => console.error('Error actualizando estado:', err)
    });
  }
}