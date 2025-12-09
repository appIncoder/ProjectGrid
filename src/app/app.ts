import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  title = 'ProjectManagementApp';

  constructor(public auth: AuthService) { }

  loginMock() {
    this.auth.loginMock();
  }

  logoutMock() {
    this.auth.logoutMock();
  }
}
