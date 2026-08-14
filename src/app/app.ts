import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import type { ProjectRole } from './models';
import { AuthService } from './services/auth.service';
import { ProjectService } from './services/project.service';

/** Clé de persistance du choix utilisateur (réduit / étendu) pour la sidebar. */
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'pg.sidebar.collapsed';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf, NgFor, NgbTooltipModule],
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

  /** Écran de l'espace projet : suggère un repli automatique de la sidebar tant que l'utilisateur n'a rien choisi. */
  readonly isProjectWorkspaceRoute = signal(false);

  /** Choix explicite de l'utilisateur (réduit/étendu), `null` tant qu'il n'a pas encore utilisé le bouton. */
  private readonly sidebarCollapsedOverride = signal<boolean | null>(this.readStoredSidebarPreference());

  /** État effectif de la sidebar : le choix utilisateur prime, sinon on retombe sur le comportement automatique. */
  readonly sidebarCollapsed = computed(() => this.sidebarCollapsedOverride() ?? this.isProjectWorkspaceRoute());

  private routerEventsSub: Subscription | null = null;

  constructor(
    public auth: AuthService,
    public projectService: ProjectService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.isProjectWorkspaceRoute.set(this.router.url.startsWith('/project/'));
    this.routerEventsSub = this.router.events
      .pipe(filter((evt): evt is NavigationEnd => evt instanceof NavigationEnd))
      .subscribe((evt) => {
        this.isProjectWorkspaceRoute.set(evt.urlAfterRedirects.startsWith('/project/'));
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

  /** Bascule la sidebar entre mode réduit (icônes seules) et mode étendu, et mémorise le choix. */
  toggleSidebar(): void {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsedOverride.set(next);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? '1' : '0');
    } catch {
      // stockage indisponible (navigation privée, quota…) : le choix reste actif pour la session en cours.
    }
  }

  private readStoredSidebarPreference(): boolean | null {
    try {
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (raw === '1') return true;
      if (raw === '0') return false;
    } catch {
      // stockage indisponible : pas de préférence mémorisée.
    }
    return null;
  }

  logout() {
    this.auth.logout();
  }
}
