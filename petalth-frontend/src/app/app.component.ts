import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VeterinarianComponent } from './components/veterinarian/veterinarian.component';
import { AppointmentComponent } from './components/appointment/appointment.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, VeterinarianComponent, AppointmentComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'pealth-frontend';
}
