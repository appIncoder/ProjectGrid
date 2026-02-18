import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

const AUTH_STORAGE_KEY = 'pg_auth_session';

type AuthSession = {
  isAuthenticated: boolean;
  user?: {
    id: string;
    username: string;
    label: string;
  };
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isAuthenticated = false;
  private _user: AuthSession['user'] | null = null;

  constructor(private http: HttpClient) {
    this.restoreFromStorage();
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  get user(): AuthSession['user'] | null {
    return this._user;
  }

  async login(username: string, password: string): Promise<boolean> {
    const u = username.trim();
    if (!u || !password) return false;

    const url = `${environment.apiBaseUrl}/auth/login`;
    const res = await firstValueFrom(
      this.http.post<{ ok?: boolean; user?: { id?: string; username?: string; label?: string } }>(url, {
        username: u,
        password,
      })
    );

    if (!res?.ok || !res.user?.id) {
      this.logoutMock();
      return false;
    }

    this._isAuthenticated = true;
    this._user = {
      id: String(res.user.id),
      username: String(res.user.username ?? u),
      label: String(res.user.label ?? res.user.username ?? u),
    };
    this.persistToStorage();
    return true;
  }

  loginMock(): void {
    this._isAuthenticated = true;
    this._user = { id: 'mock', username: 'mock', label: 'Utilisateur Mock' };
    this.persistToStorage();
  }

  logoutMock(): void {
    this._isAuthenticated = false;
    this._user = null;
    this.clearStorage();
  }

  private restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AuthSession;
      if (parsed?.isAuthenticated) {
        this._isAuthenticated = true;
        this._user = parsed.user ?? null;
      }
    } catch {
      this.clearStorage();
    }
  }

  private persistToStorage(): void {
    try {
      const payload: AuthSession = {
        isAuthenticated: this._isAuthenticated,
        user: this._user ?? undefined,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
