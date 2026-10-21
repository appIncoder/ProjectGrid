import { Injectable } from '@angular/core';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { isLicenseActive, toUserLicenseStatus, type UserLicenseStatus } from '../models';
import type { AuthBackend, AuthUser, LoginOptions } from './auth-backend';
import { FirebaseSdkService } from './firebase-sdk.service';

export const LICENSE_REVOKED_ERROR_CODE = 'license/revoked';
export const LICENSE_PENDING_ERROR_CODE = 'license/pending';
export const LICENSE_REJECTED_ERROR_CODE = 'license/rejected';

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

    if (!auth.currentUser) return null;
    if ((await this.readLicenseAccess(auth.currentUser.uid)) !== 'granted') {
      await signOut(auth);
      return null;
    }
    return this.toAuthUser(auth.currentUser);
  }

  /**
   * Une licence révoquée, en attente de validation ou refusée empêche la connexion ;
   * en cas d'erreur de lecture, l'accès est conservé.
   */
  private async readLicenseAccess(uid: string): Promise<'granted' | UserLicenseStatus> {
    try {
      const snapshot = await getDoc(doc(this.firebaseSdk.firestore(), 'users', uid));
      if (!snapshot.exists()) return 'granted';
      const license = snapshot.data()['license'];
      return isLicenseActive(license) ? 'granted' : (toUserLicenseStatus(license) ?? 'revoked');
    } catch {
      return 'granted';
    }
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

  async login(username: string, password: string, options: LoginOptions = {}): Promise<AuthUser | null> {
    const login = String(username ?? '').trim();
    if (!login || !password) return null;

    await setPersistence(
      this.firebaseSdk.auth(),
      options.remember === false ? browserSessionPersistence : browserLocalPersistence,
    );
    const email = await this.resolveLoginEmail(login);
    const credential = await signInWithEmailAndPassword(this.firebaseSdk.auth(), email, password);
    const access = await this.readLicenseAccess(credential.user.uid);
    if (access !== 'granted') {
      await signOut(this.firebaseSdk.auth());
      const code = access === 'pending'
        ? LICENSE_PENDING_ERROR_CODE
        : access === 'rejected' ? LICENSE_REJECTED_ERROR_CODE : LICENSE_REVOKED_ERROR_CODE;
      throw Object.assign(new Error("Votre licence n'est pas active."), { code });
    }
    return this.toAuthUser(credential.user);
  }

  async logout(): Promise<void> {
    if (!this.firebaseSdk.isConfigured()) return;
    await signOut(this.firebaseSdk.auth());
  }
}
