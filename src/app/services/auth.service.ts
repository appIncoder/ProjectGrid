import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _isAuthenticated = false;

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  loginMock(): void {
    this._isAuthenticated = true;
  }

  logoutMock(): void {
    this._isAuthenticated = false;
  }
}
