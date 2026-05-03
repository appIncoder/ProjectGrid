import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import type { ProjectRole } from './models';
import { AuthService } from './services/auth.service';
import { ProjectService } from './services/project.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf, NgFor],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  title = 'ProjectManagementApp';
  readonly accessCheckRoleOptions: Array<{ value: ProjectRole; label: string }> = [
    { value: 'projectManager', label: 'Project Manager' },
    { value: 'businessManager', label: 'Business Manager' },
    { value: 'changeManager', label: 'Change Manager' },
    { value: 'technologyManager', label: 'Technology Manager' },
    { value: 'projectMember', label: 'Project Member' },
    { value: 'businessMember', label: 'Business Member' },
    { value: 'changeMember', label: 'Change Member' },
    { value: 'technologyMember', label: 'Technology Member' },
  ];

  constructor(
    public auth: AuthService,
    public projectService: ProjectService,
    private router: Router,
  ) { }

  get isSuperUser(): boolean {
    return this.auth.isSuperUser;
  }

  onAccessCheckRoleChange(event: Event): void {
    const role = (event.target as HTMLSelectElement | null)?.value as ProjectRole | '';
    if (!role) {
      this.auth.stopAccessCheck();
      return;
    }

    const option = this.accessCheckRoleOptions.find((item) => item.value === role);
    if (!option) return;
    this.auth.startAccessCheckAs(option.value, option.label);
    if (this.router.url.startsWith('/admin')) {
      void this.router.navigate(['/']);
    }
  }

  stopAccessCheck(): void {
    this.auth.stopAccessCheck();
  }

  logout() {
    this.auth.logout();
  }
}
