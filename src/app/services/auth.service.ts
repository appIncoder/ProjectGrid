import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import type { AuthBackend } from './auth-backend';
import { FirebaseAuthBackendService } from './firebase-auth-backend.service';
import { RestAuthBackendService } from './rest-auth-backend.service';

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
  private readonly readyPromise: Promise<void>;
  private readonly backend: AuthBackend =
    environment.backendProvider === 'firebase'
      ? inject(FirebaseAuthBackendService)
      : inject(RestAuthBackendService);

  constructor() {
    this.restoreFromStorage();
    this.readyPromise = this.initializeSession();
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  get user(): AuthSession['user'] | null {
    return this._user;
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  async login(username: string, password: string): Promise<boolean> {
    await this.readyPromise;
    const user = await this.backend.login(username, password);
    if (!user?.id) {
      this.logout();
      return false;
    }

    this._isAuthenticated = true;
    this._user = {
      id: String(user.id),
      username: String(user.username),
      label: String(user.label),
    };
    this.persistToStorage();
    return true;
  }

  private async initializeSession(): Promise<void> {
    if (!this.backend.restoreSession) return;

    try {
      const user = await this.backend.restoreSession();
      if (!user?.id) {
        this._isAuthenticated = false;
        this._user = null;
        this.clearStorage();
        return;
      }

      this._isAuthenticated = true;
      this._user = {
        id: String(user.id),
        username: String(user.username),
        label: String(user.label),
      };
      this.persistToStorage();
    } catch {
      this._isAuthenticated = false;
      this._user = null;
      this.clearStorage();
    }
  }

  logout(): void {
    void this.backend.logout();
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
