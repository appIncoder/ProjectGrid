import { Injectable, inject } from '@angular/core';
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';

import { toUserLicenseStatus, type UserLicenseStatus } from '../models';
import { AuthService } from './auth.service';
import { FirebaseSdkService } from './firebase-sdk.service';
import { provisionPendingUser, type UserProvisioningPayload } from './user-provisioning';

export interface ManagedUser {
  id: string;
  label: string;
  email: string;
  username: string;
  /** 'legacy' : compte créé avant la gestion des licences (considéré comme actif). */
  licenseStatus: UserLicenseStatus | 'legacy';
  /** Date de la demande de compte (comptes créés via « Demander un compte »). */
  requestedAt: Date | null;
}

export type CreateLicensedUserPayload = UserProvisioningPayload;

/** Gestion des comptes utilisateurs et de leurs licences (réservé au super-utilisateur). */
@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private readonly firebaseSdk = inject(FirebaseSdkService);
  private readonly auth = inject(AuthService);

  async listUsers(): Promise<ManagedUser[]> {
    const snapshot = await getDocs(collection(this.firebaseSdk.firestore(), 'users'));
    return snapshot.docs
      .map((item) => {
        const data = item.data();
        const email = String(data['email'] ?? '').trim();
        const license = data['license'] as { requestedAt?: { toDate?: () => Date } } | undefined;
        return {
          id: item.id,
          label: String(data['label'] ?? data['displayName'] ?? email ?? item.id).trim() || item.id,
          email,
          username: String(data['username'] ?? '').trim(),
          licenseStatus: toUserLicenseStatus(license) ?? 'legacy',
          requestedAt: license?.requestedAt?.toDate?.() ?? null,
        } satisfies ManagedUser;
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }

  /**
   * Crée le compte (licence « en attente », cf. provisionPendingUser) puis le valide aussitôt :
   * le super-utilisateur n'a pas à passer par la file de validation pour ses propres créations.
   */
  async createLicensedUser(payload: CreateLicensedUserPayload): Promise<string> {
    const uid = await provisionPendingUser(payload);
    await this.setLicenseStatus(uid, 'active');
    return uid;
  }

  async setLicenseStatus(userId: string, status: UserLicenseStatus): Promise<void> {
    // Chemins pointés : conserve license.requestedAt d'une éventuelle demande de compte.
    await updateDoc(doc(this.firebaseSdk.firestore(), 'users', userId), {
      'license.status': status,
      'license.updatedAt': serverTimestamp(),
      'license.updatedBy': this.auth.user?.id ?? null,
      updatedAt: serverTimestamp(),
    });
  }
}
