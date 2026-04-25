import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from './admin.service';
import { Invoice } from './invoice';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);

  // 1. Signals para manejar los datos de la vista
  invoices = signal<Invoice[]>([]);
  veterinarians = signal<any[]>([]); 

  // Calcula el total de ingresos al vuelo (Facturas PAGADAS)
  totalIngresos = computed(() => {
    return this.invoices()
      .filter(inv => inv.status === 'PAID')
      .reduce((acc, curr) => acc + curr.amount, 0);
  });

  // Calcula las facturas pendientes (Facturas NO PAGADAS)
  totalPendiente = computed(() => {
    return this.invoices()
      .filter(inv => inv.status === 'UNPAID')
      .reduce((acc, curr) => acc + curr.amount, 0);
  });

  ngOnInit() {
    // 2. Cargamos las facturas al entrar
    this.adminService.getInvoices().subscribe({
      next: (data: Invoice[]) => this.invoices.set(data),
      error: (err: any) => console.error('Error cargando facturas', err) 
    });

    // 3. Cargamos la lista de veterinarios al entrar
    this.adminService.getVeterinarians().subscribe({
      next: (data: any[]) => this.veterinarians.set(data),
      error: (err: any) => console.error('Error cargando veterinarios', err)
    });
  }

  // 4. Método para el botón de Dar de baja / Reactivar
  toggleVetStatus(vet: any) {
    if (confirm(`¿Seguro que quieres cambiar el estado de ${vet.firstName}?`)) {
      
      this.adminService.toggleUserActive(vet.id).subscribe({
        next: () => {
          // ACTUALIZACIÓN OPTIMISTA: Cambiamos el estado visualmente al instante
          // sin tener que volver a pedir toda la lista al backend
          this.veterinarians.update(list => 
            list.map(v => v.id === vet.id ? { ...v, active: !v.active } : v)
          );
        },
        error: (e: any) => console.error('Error al cambiar estado del usuario', e)
      });
    }
  }
}