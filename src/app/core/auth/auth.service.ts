import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { ApiResponse, TokenData, UserInfo } from '../../shared/models/api.model';
import { AuthActions } from '../../store/auth/auth.actions';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'user_info';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private store = inject(Store);

  login(username: string, password: string, tenantCode?: string): Observable<ApiResponse<TokenData>> {
    return this.http.post<ApiResponse<TokenData>>('/auth/login', {
      username, password, tenant_code: tenantCode || null,
    }).pipe(
      tap(res => {
        if (res.code === 200 && res.data) {
          this.saveTokens(res.data);
          this.store.dispatch(AuthActions.loginSuccess({ user: res.data.user }));
        }
      })
    );
  }

  logout(): void {
    this.http.post('/auth/logout', {}).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  refreshToken(): Observable<ApiResponse<{ access_token: string; expires_in: number }>> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<ApiResponse<any>>('/auth/refresh', { refresh_token: refreshToken }).pipe(
      tap(res => {
        if (res.code === 200 && res.data) {
          localStorage.setItem(TOKEN_KEY, res.data.access_token);
        }
      })
    );
  }

  saveTokens(data: TokenData): void {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  getCurrentUser(): UserInfo | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  hasRole(...roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.store.dispatch(AuthActions.logout());
    this.router.navigate(['/auth/login']);
  }
}
