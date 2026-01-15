import { Routes } from '@angular/router';
import { PetComponent } from './components/pet/pet.component';
import { VeterinarianComponent } from './components/veterinarian/veterinarian.component';
import { AppointmentComponent } from './components/appointment/appointment.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'pets', component: PetComponent },
  // Uso de parámetros dinámicos
  { path: 'pets/:ownerId', component: PetComponent },
  { path: 'veterinarians', component: VeterinarianComponent },
  { path: 'appointments', component: AppointmentComponent },
];
