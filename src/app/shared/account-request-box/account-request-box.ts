import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { provisionPendingUser } from '../../services/user-provisioning';

/** Formulaire public de demande de compte : le compte est créé « en attente » jusqu'à sa validation par le super-utilisateur. */
@Component({
  selector: 'app-account-request-box',
  imports: [ReactiveFormsModule],
  templateUrl: './account-request-box.html',
  styleUrls: ['./account-request-box.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountRequestBox {
  readonly backToLogin = output<void>();

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly submittedEmail = signal('');

  readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    passwordConfirm: ['', Validators.required],
  });

  async onSubmit(): Promise<void> {
    if (this.loading()) return;
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Renseignez tous les champs (mot de passe de 6 caractères minimum).');
      return;
    }
    const { firstName, lastName, email, password, passwordConfirm } = this.form.getRawValue();
    if (password !== passwordConfirm) {
      this.errorMessage.set('Les deux mots de passe ne correspondent pas.');
      return;
    }

    this.loading.set(true);
    try {
      await provisionPendingUser({ firstName, lastName, email, password });
      this.submittedEmail.set(email.trim().toLowerCase());
      this.form.reset();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Impossible d\'envoyer la demande.');
    } finally {
      this.loading.set(false);
    }
  }
}
