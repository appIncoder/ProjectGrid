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

import type { ProfileType, AccountRole, AccountModel } from '../../models';

const STORAGE_KEY = 'projectgrid:account';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-page.html',
})
export class AccountPage implements OnInit {
  form!: FormGroup; // 👈 initialisé dans ngOnInit
  savedState: 'idle' | 'saved' | 'error' = 'idle';
  showPassword = false;

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

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
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

        // Sécurité
        currentPassword: [''],
        newPassword: [''],
        confirmNewPassword: [''],
      },
      { validators: [this.passwordChangeValidator] }
    );

    const existing = this.readAccount();
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

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
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

  save(): void {
    this.savedState = 'idle';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.savedState = 'error';
      return;
    }

    const v = this.form.getRawValue();

    const passwordChanged = !!v.newPassword?.trim();

    const accountToSave: AccountModel = {
      avatarDataUrl: v.avatarDataUrl?.trim() || undefined,
      username: v.username!.trim(),
      firstName: v.firstName!.trim(),
      lastName: v.lastName!.trim(),
      email: v.email!.trim(),
      role: v.role as AccountRole,
      profileType: v.profileType as ProfileType,
      passwordLastChangedAt: passwordChanged
        ? new Date().toISOString()
        : this.readAccount()?.passwordLastChangedAt,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accountToSave));

      // UX : reset champs password
      this.form.patchValue({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });

      this.savedState = 'saved';
      setTimeout(() => (this.savedState = 'idle'), 1500);
    } catch {
      this.savedState = 'error';
    }
  }

  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.form.reset({
      avatarDataUrl: '',
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      role: 'User',
      profileType: 'standard',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    this.savedState = 'idle';
  }

  private readAccount(): AccountModel | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AccountModel) : null;
    } catch {
      return null;
    }
  }

  private passwordChangeValidator(group: AbstractControl): ValidationErrors | null {
    const current = group.get('currentPassword')?.value?.trim() ?? '';
    const next = group.get('newPassword')?.value?.trim() ?? '';
    const confirm = group.get('confirmNewPassword')?.value?.trim() ?? '';

    if (!next && !confirm && !current) return null;
    if (!current) return { currentPasswordRequired: true };
    if (!next || next.length < 8) return { newPasswordWeak: true };
    if (next !== confirm) return { newPasswordMismatch: true };
    return null;
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
