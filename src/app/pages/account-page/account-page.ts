import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { FirebaseSdkService } from '../../services/firebase-sdk.service';
import { ChangePasswordModalComponent } from '../../shared/change-password-modal/change-password-modal';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import type { ProfileType, AccountRole, AccountModel } from '../../models';

const STORAGE_KEY = 'projectgrid:account';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ChangePasswordModalComponent],
  templateUrl: './account-page.html',
})
export class AccountPage implements OnInit {
  form!: FormGroup; // 👈 initialisé dans ngOnInit
  savedState: 'idle' | 'saved' | 'error' = 'idle';
  saveErrorMessage = '';
  showChangePasswordModal = false;
  private storedAccount: AccountModel | null = null;

  readonly roles: Array<{ value: AccountRole; label: string }> = [
    { value: 'User', label: 'Utilisateur' },
    { value: 'Viewer', label: 'Lecteur' },
    { value: 'PMO', label: 'PMO' },
    { value: 'Admin', label: 'Administrateur' },
  ];

  readonly profileTypes: Array<{ value: ProfileType; label: string }> = [
    { value: 'standard', label: 'Standard' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' },
    { value: 'guest', label: 'Invité' },
  ];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private firebaseSdk: FirebaseSdkService
  ) {}

  async ngOnInit(): Promise<void> {
    this.form = this.fb.group(
      {
        // Profil
        avatarDataUrl: [''],
        username: ['', [Validators.required, Validators.minLength(3)]],
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        role: ['User' as AccountRole, [Validators.required]],
        profileType: ['standard' as ProfileType, [Validators.required]],
      }
    );

    const firestoreAccount = await this.loadAccountFromFirestore();
    const existing = firestoreAccount ?? this.readAccount();
    if (existing) {
      this.form.patchValue({
        avatarDataUrl: existing.avatarDataUrl ?? '',
        username: existing.username,
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        role: existing.role,
        profileType: existing.profileType,
      });
    }
  }

  get avatarUrl(): string | null {
    const v = this.form.get('avatarDataUrl')?.value ?? '';
    return v?.trim() ? v : null;
  }

  openChangePasswordModal(): void {
    this.showChangePasswordModal = true;
  }

  closeChangePasswordModal(): void {
    this.showChangePasswordModal = false;
  }

  onPasswordChanged(): void {
    this.savedState = 'saved';
    setTimeout(() => (this.savedState = 'idle'), 1500);
  }

  isControlInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  async onAvatarFileSelected(evt: Event): Promise<void> {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.savedState = 'error';
      return;
    }

    const dataUrl = await this.fileToDataUrl(file);
    this.form.patchValue({ avatarDataUrl: dataUrl });
  }

  removeAvatar(): void {
    this.form.patchValue({ avatarDataUrl: '' });
  }

  async save(): Promise<void> {
    this.savedState = 'idle';
    this.saveErrorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.saveErrorMessage = this.buildValidationMessage();
      this.savedState = 'error';
      return;
    }

    const v = this.form.getRawValue();
    const accountToSave: AccountModel = {
      avatarDataUrl: v.avatarDataUrl?.trim() || undefined,
      username: v.username!.trim(),
      firstName: v.firstName!.trim(),
      lastName: v.lastName!.trim(),
      email: v.email!.trim(),
      role: v.role as AccountRole,
      profileType: v.profileType as ProfileType,
      passwordLastChangedAt: this.storedAccount?.passwordLastChangedAt ?? this.readAccount()?.passwordLastChangedAt,
    };

    try {
      await this.saveAccountToFirestore(accountToSave);
      this.savedState = 'saved';
      setTimeout(() => (this.savedState = 'idle'), 1500);
    } catch (error: any) {
      console.error('Account save failed:', error);
      this.saveErrorMessage = 'Échec de la sauvegarde. Vérifie ta connexion ou réessaie plus tard.';
      this.savedState = 'error';
    }
  }

  private buildValidationMessage(): string {
    const invalidFields = Object.entries(this.form.controls)
      .filter(([, control]) => control.invalid)
      .map(([name]) => {
        switch (name) {
          case 'username':
            return 'Username';
          case 'firstName':
            return 'Prénom';
          case 'lastName':
            return 'Nom';
          case 'email':
            return 'Adresse mail';
          case 'role':
            return 'Rôle';
          case 'profileType':
            return 'Type de profil';
          default:
            return name;
        }
      });
    return invalidFields.length
      ? `Champs invalides : ${invalidFields.join(', ')}`
      : 'Certains champs sont invalides.';
  }

  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    this.form.reset({
      avatarDataUrl: '',
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      role: 'User',
      profileType: 'standard',
    });
    this.savedState = 'idle';
  }

  private async loadAccountFromFirestore(): Promise<AccountModel | null> {
    const userId = this.getCurrentUserId();
    if (!userId || !this.firebaseSdk.isConfigured()) return null;

    try {
      const userRef = doc(this.firebaseSdk.firestore(), 'users', userId);
      const snapshot = await getDoc(userRef);
      if (!snapshot.exists()) return null;

      const data = snapshot.data();
      const accountFromFirestore: AccountModel = {
        avatarDataUrl: String(data['avatarDataUrl'] ?? '') || undefined,
        username: String(data['username'] ?? ''),
        firstName: String(data['firstName'] ?? ''),
        lastName: String(data['lastName'] ?? ''),
        email: String(data['email'] ?? ''),
        role: String(data['role'] ?? 'User') as AccountRole,
        profileType: String(data['profileType'] ?? 'standard') as ProfileType,
        passwordLastChangedAt: String(data['passwordLastChangedAt'] ?? '') || undefined,
      };
      this.storedAccount = accountFromFirestore;
      this.form.patchValue({
        avatarDataUrl: String(data['avatarDataUrl'] ?? ''),
        username: String(data['username'] ?? ''),
        firstName: String(data['firstName'] ?? ''),
        lastName: String(data['lastName'] ?? ''),
        email: String(data['email'] ?? ''),
        role: String(data['role'] ?? 'User') as AccountRole,
        profileType: String(data['profileType'] ?? 'standard') as ProfileType,
      });
      return accountFromFirestore;
    } catch {
      // Firestore may be temporarily unavailable; keep local fallback if present.
      return null;
    }
  }

  private async saveAccountToFirestore(account: AccountModel): Promise<void> {
    if (!this.firebaseSdk.isConfigured()) {
      throw new Error('Firebase not configured');
    }

    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('No authenticated user');
    }

    const userRef = doc(this.firebaseSdk.firestore(), 'users', userId);
    const accountPayload: Record<string, unknown> = {
      username: account.username,
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      role: account.role,
      profileType: account.profileType,
      avatarDataUrl: account.avatarDataUrl ?? null,
      uid: userId,
      updatedAt: serverTimestamp(),
    };
    if (account.passwordLastChangedAt !== undefined) {
      accountPayload['passwordLastChangedAt'] = account.passwordLastChangedAt;
    }

    await setDoc(
      userRef,
      accountPayload,
      { merge: true }
    );
  }

  private readAccount(): AccountModel | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AccountModel) : null;
    } catch {
      return null;
    }
  }
  private getCurrentUserId(): string | null {
    return this.auth.user?.id ?? null;
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }
}
