import { Component } from '@angular/core';
import { LoginBox } from '../../shared/login-box/login-box';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [LoginBox],
  template: `
    <h2 class="mb-3">Connexion</h2>
    <app-login-box></app-login-box>
  `
})
export class LoginPage { }
