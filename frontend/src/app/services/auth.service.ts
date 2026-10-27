import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        if (response.token) {
          localStorage.setItem('jwt_token', response.token);
          localStorage.setItem('user_role', response.user.role);
        }
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  getUserRole(): string | null {
    return localStorage.getItem('user_role');
  }

  logout(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
