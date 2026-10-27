import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { DestinationService } from './services/destination.service';
import { ApplicationService } from './services/application.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Overseas Mobility Portal';
  
  // Auth Form Data
  isRegistering = false;
  authData = { username: '', email: '', password: '', role: 'student' };
  
  // Domain Data
  destinations: any[] = [];
  applications: any[] = [];
  
  // New Destination Form (Admin/Prof)
  newDestination = { universityName: '', country: '', availableSlots: 1, description: '' };
  
  // Application Form (Student)
  selectedDestinationId = '';
  motivationalLetter = '';
  gpa = 28;

  message = '';

  constructor(
    public authService: AuthService,
    private destinationService: DestinationService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.loadDashboardData();
    }
  }

  toggleAuthMode(): void {
    this.isRegistering = !this.isRegistering;
    this.message = '';
  }

  onLogin(): void {
    this.authService.login({ email: this.authData.email, password: this.authData.password }).subscribe({
      next: () => {
        this.message = 'Login effettuato!';
        this.loadDashboardData();
      },
      error: (err) => this.message = err.error?.message || 'Errore durante il login'
    });
  }

  onRegister(): void {
    this.authService.register(this.authData).subscribe({
      next: () => {
        this.message = 'Registrazione completata! Ora puoi effettuare il login.';
        this.isRegistering = false;
      },
      error: (err) => this.message = err.error?.message || 'Errore durante la registrazione'
    });
  }

  onLogout(): void {
    this.authService.logout();
    this.destinations = [];
    this.applications = [];
    this.message = 'Logout effettuato.';
  }

  loadDashboardData(): void {
    this.destinationService.getDestinations().subscribe({
      next: (data) => this.destinations = data,
      error: (err) => console.error(err)
    });

    this.applicationService.getApplications().subscribe({
      next: (data) => this.applications = data,
      error: (err) => console.error(err)
    });
  }

  onCreateDestination(): void {
    this.destinationService.createDestination(this.newDestination).subscribe({
      next: () => {
        this.message = 'Nuova destinazione aggiunta con successo!';
        this.newDestination = { universityName: '', country: '', availableSlots: 1, description: '' };
        this.loadDashboardData();
      },
      error: (err) => this.message = err.error?.message || 'Errore nella creazione'
    });
  }

  onSubmitApplication(): void {
    const payload = {
      destinationId: this.selectedDestinationId,
      motivationalLetter: this.motivationalLetter,
      gpa: this.gpa
    };

    this.applicationService.submitApplication(payload).subscribe({
      next: () => {
        this.message = 'Candidatura inviata con successo!';
        this.motivationalLetter = '';
        this.loadDashboardData();
      },
      error: (err) => this.message = err.error?.message || 'Errore durante l\'invio della candidatura'
    });
  }
}
