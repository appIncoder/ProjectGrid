import { Injectable } from '@angular/core';

const AUTH_STORAGE_KEY = 'pg_isAuthenticated';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isAuthenticated = false;

  constructor() {
    this._isAuthenticated = false;
    this.clearStorage();
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  loginMock(): void {
    this._isAuthenticated = true;
  }

  logoutMock(): void {
    this._isAuthenticated = false;
    this.clearStorage();
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
