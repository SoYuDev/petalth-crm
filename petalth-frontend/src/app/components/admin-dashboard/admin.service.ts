import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Invoice } from './invoice';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  
  getInvoices() {
    return this.http.get<Invoice[]>('http://localhost:8080/api/invoices');
  }

  getVeterinarians() {
    return this.http.get<any[]>('http://localhost:8080/api/veterinarians');
  }

  toggleUserActive(userId: number) {
    return this.http.patch(`http://localhost:8080/api/users/${userId}/toggle-active`, {});
  }
}