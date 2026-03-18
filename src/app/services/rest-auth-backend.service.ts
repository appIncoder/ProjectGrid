import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import type { AuthBackend, AuthUser } from './auth-backend';

@Injectable({ providedIn: 'root' })
export class RestAuthBackendService implements AuthBackend {
  constructor(private http: HttpClient) {}

  async login(username: string, password: string): Promise<AuthUser | null> {
    const u = username.trim();
    if (!u || !password) return null;

    const url = `${environment.apiBaseUrl}/auth/login`;
    const res = await firstValueFrom(
      this.http.post<{ ok?: boolean; user?: { id?: string; username?: string; label?: string } }>(url, {
        username: u,
        password,
      })
    );

    if (!res?.ok || !res.user?.id) {
      return null;
    }

    return {
      id: String(res.user.id),
      username: String(res.user.username ?? u),
      label: String(res.user.label ?? res.user.username ?? u),
    };
  }

  logout(): void {}
}
