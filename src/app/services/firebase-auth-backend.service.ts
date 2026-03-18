import { Injectable } from '@angular/core';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import type { AuthBackend, AuthUser } from './auth-backend';
import { FirebaseSdkService } from './firebase-sdk.service';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthBackendService implements AuthBackend {
  private readonly knownLoginEmails: Record<string, string> = {
    admin: 'admin@local.invalid',
    'alice.dupont': 'alice.dupont@example.org',
    'bruno.martin': 'bruno.martin@example.org',
    'claire.leroy': 'claire.leroy@example.org',
    'david.lambert': 'david.lambert@example.org',
  };

  constructor(private firebaseSdk: FirebaseSdkService) {}

  private toAuthUser(user: { uid: string; email: string | null; displayName: string | null }): AuthUser {
    const email = String(user.email ?? '').trim();
    const label = String(user.displayName ?? email ?? user.uid).trim() || user.uid;
    return {
      id: user.uid,
      username: email || user.uid,
      label,
    };
  }

  async restoreSession(): Promise<AuthUser | null> {
    if (!this.firebaseSdk.isConfigured()) return null;

    const auth = this.firebaseSdk.auth();
    await setPersistence(auth, browserLocalPersistence);
    if (typeof (auth as { authStateReady?: () => Promise<void> }).authStateReady === 'function') {
      await (auth as { authStateReady: () => Promise<void> }).authStateReady();
    } else {
      await new Promise<void>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, () => {
          unsubscribe();
          resolve();
        });
      });
    }

    return auth.currentUser ? this.toAuthUser(auth.currentUser) : null;
  }

  private async resolveLoginEmail(login: string): Promise<string> {
    const normalized = String(login ?? '').trim();
    if (!normalized) return '';
    if (normalized.includes('@')) return normalized;
    const normalizedKey = normalized.toLowerCase();
    const knownEmail = this.knownLoginEmails[normalizedKey];
    if (knownEmail) return knownEmail;

    try {
      const usersRef = collection(this.firebaseSdk.firestore(), 'users');
      const usernameSnapshot = await getDocs(query(usersRef, where('username', '==', normalized), limit(1)));
      if (!usernameSnapshot.empty) {
        const row = usernameSnapshot.docs[0]?.data() ?? {};
        const email = String(row['email'] ?? '').trim();
        if (email) return email;
      }

      const labelSnapshot = await getDocs(query(usersRef, where('label', '==', normalized), limit(1)));
      if (!labelSnapshot.empty) {
        const row = labelSnapshot.docs[0]?.data() ?? {};
        const email = String(row['email'] ?? '').trim();
        if (email) return email;
      }
    } catch {
      // Firestore can be temporarily unreachable in dev; keep auth usable for known users.
    }

    return normalized;
  }

  async login(username: string, password: string): Promise<AuthUser | null> {
    const login = String(username ?? '').trim();
    if (!login || !password) return null;

    await setPersistence(this.firebaseSdk.auth(), browserLocalPersistence);
    const email = await this.resolveLoginEmail(login);
    const credential = await signInWithEmailAndPassword(this.firebaseSdk.auth(), email, password);
    return this.toAuthUser(credential.user);
  }

  async logout(): Promise<void> {
    if (!this.firebaseSdk.isConfigured()) return;
    await signOut(this.firebaseSdk.auth());
  }
}
