export type BackendProvider = 'rest' | 'firebase';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  databaseURL?: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface AppEnvironment {
  apiBaseUrl: string;
  backendProvider: BackendProvider;
  firebase: FirebaseWebConfig;
}
