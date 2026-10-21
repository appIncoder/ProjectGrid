import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  LICENSE_PENDING_ERROR_CODE,
  LICENSE_REJECTED_ERROR_CODE,
  LICENSE_REVOKED_ERROR_CODE,
} from '../../services/firebase-auth-backend.service';
import { AccountRequestBox } from '../account-request-box/account-request-box';

@Component({
  selector: 'app-login-box',
  standalone: true,
  imports: [CommonModule, FormsModule, AccountRequestBox],
  templateUrl: './login-box.html',
  styleUrls: ['./login-box.scss']
})
export class LoginBox {
  loading = false;
  errorMessage = '';
  showPassword = false;
  /** Affiche le formulaire « Demander un compte » à la place de la connexion. */
  readonly requestMode = signal(false);

  model = {
    username: '',
    password: '',
    remember: true,
  };

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit(): Promise<void> {
    if (this.loading) return;
    this.errorMessage = '';
    this.loading = true;
    try {
      const ok = await this.auth.login(this.model.username, this.model.password, this.model.remember);
      if (!ok) {
        this.errorMessage = "Nom d'utilisateur ou mot de passe incorrect.";
        return;
      }
      this.model.password = '';
      await this.router.navigateByUrl('/projects-overview');
    } catch (error) {
      this.errorMessage = this.toLoginErrorMessage((error as { code?: unknown })?.code);
    } finally {
      this.loading = false;
    }
  }

  private toLoginErrorMessage(code: unknown): string {
    switch (code) {
      case LICENSE_PENDING_ERROR_CODE:
        return "Votre demande de compte est en attente de validation par l'administrateur.";
      case LICENSE_REJECTED_ERROR_CODE:
        return "Votre demande de compte a été refusée. Contactez l'administrateur.";
      case LICENSE_REVOKED_ERROR_CODE:
        return "Votre licence n'est pas active. Contactez l'administrateur.";
      default:
        return 'Connexion impossible pour le moment.';
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
