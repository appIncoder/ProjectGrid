import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
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
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h3>Changer mon mot de passe</h3>
          <button type="button" class="close-btn" (click)="close()">×</button>
        </header>

        <form [formGroup]="form" class="modal-body">
          <label class="field">
            <span class="label">Mot de passe actuel</span>
            <input
              class="control"
              type="password"
              formControlName="currentPassword"
              autocomplete="current-password"
              [class.invalid]="isInvalid('currentPassword')"
            />
            <div class="error" *ngIf="isInvalid('currentPassword')">Mot de passe actuel requis.</div>
          </label>

          <label class="field">
            <span class="label">Nouveau mot de passe</span>
            <input
              class="control"
              type="password"
              formControlName="newPassword"
              autocomplete="new-password"
              [class.invalid]="isInvalid('newPassword')"
            />
            <div class="error" *ngIf="isInvalid('newPassword')">Nouveau mot de passe requis (min 8 caractères).</div>
          </label>

          <label class="field">
            <span class="label">Confirmer</span>
            <input
              class="control"
              type="password"
              formControlName="confirmNewPassword"
              autocomplete="new-password"
              [class.invalid]="isInvalid('confirmNewPassword')"
            />
            <div class="error" *ngIf="isInvalid('confirmNewPassword')">La confirmation ne correspond pas.</div>
          </label>
        </form>

        <footer class="modal-footer">
          <button type="button" class="btn secondary" (click)="close()">Annuler</button>
          <button type="button" class="btn primary" (click)="save()" [disabled]="form.invalid || saving">
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </footer>
      </div>
    </div>

    <style>
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #e6e6e6;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 18px;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
      }

      .close-btn:hover {
        background: #f0f0f0;
      }

      .modal-body {
        padding: 20px;
      }

      .field {
        display: block;
        margin-bottom: 16px;
      }

      .label {
        display: block;
        margin-bottom: 6px;
        color: #333;
        font-weight: 500;
      }

      .control {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #dcdcdc;
        border-radius: 8px;
        background: #fff;
        font-size: 14px;
      }

      .control.invalid {
        border-color: #d0333a;
        box-shadow: 0 0 0 2px rgba(208, 51, 58, 0.12);
      }

      .error {
        margin-top: 4px;
        color: #a35;
        font-size: 12px;
      }

      .modal-footer {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        padding: 16px 20px;
        border-top: 1px solid #e6e6e6;
      }

      .btn {
        padding: 10px 16px;
        border-radius: 8px;
        border: 1px solid #d0d0d0;
        background: #fff;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .btn.secondary:hover {
        background: #f5f5f5;
      }

      .btn.primary {
        border-color: #2a6;
        background: #2a6;
        color: #fff;
      }

      .btn.primary:hover:not(:disabled) {
        background: #1e5;
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    </style>
  `,
})
export class ChangePasswordModalComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private firebaseSdk = inject(FirebaseSdkService);

  closeModal = output<void>();
  passwordChanged = output<void>();

  form!: FormGroup;
  saving = false;

  constructor() {
    this.form = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmNewPassword: ['', [Validators.required]],
      },
      { validators: [this.passwordMatchValidator] }
    );
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const next = group.get('newPassword')?.value?.trim() ?? '';
    const confirm = group.get('confirmNewPassword')?.value?.trim() ?? '';
    if (next && confirm && next !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  }

  close(): void {
    this.closeModal.emit();
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    try {
      const v = this.form.getRawValue();
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user || !user.email) {
        throw new Error('Utilisateur non connecté');
      }

      // Réauthentifier avec le mot de passe actuel
      const credential = EmailAuthProvider.credential(user.email, v.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Changer le mot de passe
      await updatePassword(user, v.newPassword);

      // Mettre à jour Firestore
      const userId = this.auth.user?.id;
      if (userId && this.firebaseSdk.isConfigured()) {
        const userRef = doc(this.firebaseSdk.firestore(), 'users', userId);
        await setDoc(
          userRef,
          {
            passwordLastChangedAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      this.passwordChanged.emit();
      this.close();
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      // TODO: afficher un message d'erreur spécifique
      if (error.code === 'auth/wrong-password') {
        // Mot de passe actuel incorrect
      } else if (error.code === 'auth/weak-password') {
        // Nouveau mot de passe trop faible
      }
    } finally {
      this.saving = false;
    }
  }
}