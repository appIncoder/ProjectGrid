import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterModule } from '@angular/router';

import { ProjectDataService } from '../../services/project-data.service';
import type { ActivityStatus, Health, PhaseId, ProjectDetail, ProjectListItem, ProjectStatus } from '../../models';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgbDropdownModule],
  templateUrl: './projects-page.html',
  styleUrls: ['./projects-page.scss'],
})
export class ProjectsPage implements OnInit, OnDestroy {
  searchTerm = '';
  statusFilter: ProjectStatus | 'Tous' = 'Tous';
  healthFilter: Health | 'Tous' = 'Tous';
  statuses: (ProjectStatus | 'Tous')[] = ['Tous', 'Planifié', 'En cours', 'En pause', 'Clôturé'];
  healthOptions: (Health | 'Tous')[] = ['Tous', 'good', 'warning', 'critical'];

  projects: ProjectListItem[] = [];
  isLoading = false;
  loadError: string | null = null;
  private destroyed = false;

  constructor(
    private router: Router,
    private projectData: ProjectDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.loadProjectsFromApi();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  async refreshProjects(): Promise<void> {
    await this.loadProjectsFromApi();
  }

  private async loadProjectsFromApi(): Promise<void> {
    this.isLoading = true;
    this.loadError = null;

    try {
      const list = await this.projectData.listProjects();
      if (!list.length) {
        this.projects = [];
        return;
      }

      const details = await Promise.all(list.map((p) => this.projectData.getProjectById(p.id)));
      this.projects = details
        .filter((d): d is ProjectDetail => !!d)
        .map((d) => this.toProjectListItem(d));
    } catch (e) {
      console.error('[ProjectsPage] loadProjectsFromApi error', e);
      this.loadError = "Impossible de charger les projets depuis l'API.";
      this.projects = [];
    } finally {
      this.isLoading = false;
      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  private toProjectListItem(detail: ProjectDetail): ProjectListItem {
    const currentPhase = this.computeCurrentPhase(detail);
    return {
      id: detail.id,
      name: detail.name,
      owner: this.extractOwner(detail),
      role: 'Membre',
      status: this.computeStatus(detail),
      health: this.computeHealth(detail),
      currentPhase: currentPhase.replace('Phase', 'Phase '),
    };
  }

  private extractOwner(detail: ProjectDetail): string {
    const anyDetail = detail as any;
    return (
      anyDetail.owner ??
      anyDetail.projectManager ??
      anyDetail.sponsor ??
      anyDetail.createdBy ??
      '—'
    );
  }

  private computeCurrentPhase(detail: ProjectDetail): PhaseId {
    const phases =
      Array.isArray(detail.phases) && detail.phases.length
        ? detail.phases
        : (['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'] as PhaseId[]);
    const matrix: any = detail.taskMatrix ?? {};

    for (const ph of phases) {
      for (const actId of Object.keys(matrix)) {
        const tasks: any[] = matrix?.[actId]?.[ph] ?? [];
        if (tasks.some((t) => !['done', 'notapplicable'].includes((t?.status ?? 'todo') as string))) {
          return ph;
        }
      }
    }

    return phases[phases.length - 1] ?? 'Phase1';
  }

  private computeHealth(detail: ProjectDetail): Health {
    const matrix: any = detail.taskMatrix ?? {};
    let total = 0;
    let bad = 0;

    for (const actId of Object.keys(matrix)) {
      const byPhase = matrix[actId];
      if (!byPhase) continue;
      for (const ph of Object.keys(byPhase)) {
        const tasks: any[] = byPhase?.[ph] ?? [];
        for (const t of tasks) {
          total++;
          const s = (t?.status ?? 'todo') as ActivityStatus;
          if (s === 'notdone') bad += 2;
          else if (s === 'todo') bad += 1;
        }
      }
    }

    if (total === 0) return 'good';
    const ratio = bad / (total * 2);
    if (ratio > 0.45) return 'critical';
    if (ratio > 0.2) return 'warning';
    return 'good';
  }

  private computeStatus(detail: ProjectDetail): ProjectStatus {
    const matrix: any = detail.taskMatrix ?? {};
    let total = 0;
    let done = 0;
    let inProgress = 0;
    let onHold = 0;

    for (const actId of Object.keys(matrix)) {
      const byPhase = matrix[actId] ?? {};
      for (const ph of Object.keys(byPhase)) {
        const tasks: any[] = byPhase?.[ph] ?? [];
        for (const t of tasks) {
          total++;
          const s = (t?.status ?? 'todo') as ActivityStatus;
          if (s === 'done' || s === 'notapplicable') done++;
          if (s === 'inprogress') inProgress++;
          if (s === 'onhold') onHold++;
        }
      }
    }

    if (total === 0) return 'Planifié';
    if (done === total) return 'Clôturé';
    if (inProgress > 0) return 'En cours';
    if (onHold > 0) return 'En pause';
    return 'En cours';
  }

  get filteredProjects(): ProjectListItem[] {
    return this.projects.filter((p) => {
      const matchesSearch =
        !this.searchTerm ||
        p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.owner.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus =
        this.statusFilter === 'Tous' || p.status === this.statusFilter;

      const matchesHealth =
        this.healthFilter === 'Tous' || p.health === this.healthFilter;

      return matchesSearch && matchesStatus && matchesHealth;
    });
  }

  getHealthLabel(health: Health): string {
    switch (health) {
      case 'good':
        return 'Tout est OK';
      case 'warning':
        return 'Attention';
      case 'critical':
        return 'Alerte';
    }
  }

  // Actions
  // 🔹 Création projet (à adapter plus tard)
  onCreateProject(): void {
    // ex : page de création
    this.router.navigate(['/project', 'new']);
  }

  // 🔹 Ouvrir la page détail du projet
  onOpen(project: ProjectListItem): void {
    this.router.navigate(['/project', project.id]);
  }

  onEdit(project: ProjectListItem): void {
    this.router.navigate(['/project', project.id, 'edit']);
  }

  onPause(project: ProjectListItem): void {
    project.status = 'En pause';
  }

  onArchive(project: ProjectListItem): void {
    project.status = 'Clôturé';
  }
}
