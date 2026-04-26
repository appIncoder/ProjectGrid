import { Injectable } from '@angular/core';
import { initializeApp, type FirebaseApp, getApps } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import { environment } from '../environments/environment';

function isNonEmpty(value: string): boolean {
  return String(value ?? '').trim().length > 0;
}

@Injectable({ providedIn: 'root' })
export class FirebaseSdkService {
  private appInstance: FirebaseApp | null = null;
  private authInstance: Auth | null = null;
  private firestoreInstance: Firestore | null = null;

  isConfigured(): boolean {
    const config = environment.firebase;
    return [
      config.apiKey,
      config.authDomain,
      config.projectId,
      config.appId,
    ].every(isNonEmpty);
  }

  app(): FirebaseApp {
    if (!this.isConfigured()) {
      throw new Error('Firebase is not configured. Fill src/app/environments/environment.ts with the Firebase web config.');
    }

    if (this.appInstance) return this.appInstance;
    this.appInstance = getApps()[0] ?? initializeApp(environment.firebase);
    return this.appInstance;
  }

  auth(): Auth {
    if (this.authInstance) return this.authInstance;
    this.authInstance = getAuth(this.app());
    return this.authInstance;
  }

  firestore(): Firestore {
    if (this.firestoreInstance) return this.firestoreInstance;
    this.firestoreInstance = initializeFirestore(this.app(), {
      experimentalAutoDetectLongPolling: true,
    });
    return this.firestoreInstance;
  }
}
