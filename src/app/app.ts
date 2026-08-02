import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
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
export class App implements OnInit, OnDestroy {
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

  /** Variante rail (76px) de la sidebar sur les écrans denses de l'espace projet. */
  isProjectWorkspaceRoute = false;
  private routerEventsSub: Subscription | null = null;

  constructor(
    public auth: AuthService,
    public projectService: ProjectService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.isProjectWorkspaceRoute = this.router.url.startsWith('/project/');
    this.routerEventsSub = this.router.events
      .pipe(filter((evt): evt is NavigationEnd => evt instanceof NavigationEnd))
      .subscribe((evt) => {
        this.isProjectWorkspaceRoute = evt.urlAfterRedirects.startsWith('/project/');
      });
  }

  ngOnDestroy(): void {
    this.routerEventsSub?.unsubscribe();
    this.routerEventsSub = null;
  }

  get isSuperUser(): boolean {
    return this.auth.isSuperUser;
  }

  get currentUserLabel(): string {
    return String(this.auth.user?.label || this.auth.user?.username || 'Utilisateur').trim();
  }

  get currentUserInitial(): string {
    return (this.currentUserLabel.charAt(0) || 'U').toUpperCase();
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
