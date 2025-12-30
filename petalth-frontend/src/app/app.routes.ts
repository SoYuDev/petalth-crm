import { Routes } from '@angular/router';
import { PetComponent } from './components/pet/pet.component';
import { VeterinarianComponent } from './components/veterinarian/veterinarian.component';
import { AppointmentComponent } from './components/appointment/appointment.component';

export const routes: Routes = [
  { path: '', component: PetComponent },
  { path: 'pets', component: PetComponent },
  { path: 'veterinarians', component: VeterinarianComponent },
  { path: 'appointments', component: AppointmentComponent },
];
