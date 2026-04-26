import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from './services/auth.service';
import { ProjectService } from './services/project.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  title = 'ProjectManagementApp';
  private static readonly SUPER_USER_EMAIL = 'etienne.darquennes@gmail.com';

  constructor(public auth: AuthService, public projectService: ProjectService) { }

  get isSuperUser(): boolean {
    const email = String(this.auth.user?.username ?? '').trim().toLowerCase();
    return email === App.SUPER_USER_EMAIL;
  }

  logout() {
    this.auth.logout();
  }
}
