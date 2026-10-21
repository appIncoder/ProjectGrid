import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  inMemoryPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signOut,
} from 'firebase/auth';
import { doc, initializeFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

import { environment } from '../environments/environment';

export interface UserProvisioningPayload {
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  password: string;
  sendPasswordResetEmail?: boolean;
}

/**
 * Crée le compte Firebase Auth puis le profil Firestore avec une licence « en attente ».
 * Le compte est créé via une instance Firebase secondaire : la session courante (s'il y en a une) reste intacte.
 * Le profil est écrit par le nouvel utilisateur lui-même : les règles Firestore ne l'autorisent qu'avec une licence 'pending'.
 */
export async function provisionPendingUser(payload: UserProvisioningPayload): Promise<string> {
  const email = payload.email.trim().toLowerCase();
  const firstName = payload.firstName.trim();
  const lastName = payload.lastName.trim();
  const label = `${firstName} ${lastName}`.trim() || email;

  const provisioningApp = initializeApp(environment.firebase, `user-provisioning-${Date.now()}`);
  try {
    const provisioningAuth = getAuth(provisioningApp);
    await setPersistence(provisioningAuth, inMemoryPersistence);
    const credential = await createUserWithEmailAndPassword(provisioningAuth, email, payload.password);
    const uid = credential.user.uid;

    const provisioningDb = initializeFirestore(provisioningApp, { experimentalAutoDetectLongPolling: true });
    await setDoc(doc(provisioningDb, 'users', uid), {
      id: uid,
      uid,
      email,
      username: payload.username?.trim() || email,
      firstName,
      lastName,
      label,
      globalRoles: [],
      projectIds: [],
      license: {
        status: 'pending',
        requestedAt: serverTimestamp(),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (payload.sendPasswordResetEmail) {
      await sendPasswordResetEmail(provisioningAuth, email);
    }
    await signOut(provisioningAuth);
    return uid;
  } catch (error) {
    throw new Error(toFrenchProvisioningError(error));
  } finally {
    await deleteApp(provisioningApp);
  }
}

function toFrenchProvisioningError(error: unknown): string {
  const code = String((error as { code?: unknown })?.code ?? '');
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Un compte existe déjà pour cette adresse mail.';
    case 'auth/invalid-email':
      return 'Adresse mail invalide.';
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    case 'auth/operation-not-allowed':
      return "La connexion par adresse mail et mot de passe n'est pas activée dans Firebase.";
    case 'permission-denied':
      return "Droits insuffisants pour enregistrer le profil de l'utilisateur.";
    default:
      return 'Impossible de créer le compte.';
  }
}
