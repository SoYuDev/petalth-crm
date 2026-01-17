import { Routes } from '@angular/router';
import { PetComponent } from './components/pet/pet.component';
import { VeterinarianComponent } from './components/veterinarian/veterinarian.component';
import { AppointmentComponent } from './components/appointment/appointment.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  
  // Rutas protegidas con authGuard
  { path: 'pets',
    component: PetComponent,
    canActivate: [authGuard]
  },
  // Uso de parámetros dinámicos
  { path: 'pets/:ownerId',
    component: PetComponent,
    canActivate: [authGuard]
  },
  { path: 'veterinarians', component: VeterinarianComponent },
  { path: 'appointments', component: AppointmentComponent },
];
