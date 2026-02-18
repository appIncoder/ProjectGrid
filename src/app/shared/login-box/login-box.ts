import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-box.html',
  styleUrls: ['./login-box.scss']
})
export class LoginBox {
  loading = false;
  errorMessage = '';

  model = {
    username: '',
    password: ''
  };

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit(): Promise<void> {
    if (this.loading) return;
    this.errorMessage = '';
    this.loading = true;
    try {
      const ok = await this.auth.login(this.model.username, this.model.password);
      if (!ok) {
        this.errorMessage = "Nom d'utilisateur ou mot de passe incorrect.";
        return;
      }
      this.model.password = '';
      await this.router.navigateByUrl('/');
    } catch {
      this.errorMessage = 'Connexion impossible pour le moment.';
    } finally {
      this.loading = false;
    }
  }
}
