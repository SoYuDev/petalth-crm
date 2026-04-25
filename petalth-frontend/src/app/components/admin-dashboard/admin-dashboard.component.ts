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

  invoices = signal<Invoice[]>([]);

  // Calcula el total de ingresos al vuelo
  totalIngresos = computed(() => {
    return this.invoices()
      .filter(inv => inv.status === 'PAID')
      .reduce((acc, curr) => acc + curr.amount, 0);
  });

  // Calcula las facturas pendientes
  totalPendiente = computed(() => {
    return this.invoices()
      .filter(inv => inv.status === 'UNPAID')
      .reduce((acc, curr) => acc + curr.amount, 0);
  });

ngOnInit() {
    this.adminService.getInvoices().subscribe({
      next: (data: Invoice[]) => this.invoices.set(data),
      
      error: (err: any) => console.error('Error cargando facturas', err) 
    });
  }
}