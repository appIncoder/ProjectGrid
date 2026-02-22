import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { LoginBox } from '../../shared/login-box/login-box';
import { PrivatePage } from '../private-page/private-page';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [NgIf, LoginBox, PrivatePage],
  template: `
    <ng-container *ngIf="!auth.isAuthenticated; else privateView">
      <h2 class="mb-3">Connexion</h2>
      <app-login-box></app-login-box>
    </ng-container>
    <ng-template #privateView>
      <app-private-page></app-private-page>
    </ng-template>
  `
})
export class LoginPage {
  constructor(public auth: AuthService) {}
}
