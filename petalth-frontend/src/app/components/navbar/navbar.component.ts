import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../security/service/auth.service';
import { UpperCasePipe } from '@angular/common';


@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, UpperCasePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  // Inyección del authService para que podamos leer la señal currentUser 
  authService = inject(AuthService)
  private router = inject(Router)

  logout() {
    this.authService.logout();
    // Volvemos a Home
    this.router.navigate(['']);
  }

}
