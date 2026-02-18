import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { ProjectService } from '../../services/project.service';
import { ProjectDataService } from '../../services/project-data.service';

import type {
  PhaseId,
  ActivityId,
  ActivityStatus,
  Project,
  ProjectDetail,
} from '../../models';

@Component({
  selector: 'app-private-page',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbDropdownModule],
  templateUrl: './private-page.html',
  styleUrls: ['./private-page.scss'],
})
export class PrivatePage implements OnInit, OnDestroy {
  // UI (si ton template les utilise)
  phases: PhaseId[] = ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'];

  activities: { id: ActivityId; label: string }[] = [
    { id: 'projet', label: 'Gestion du projet' },
    { id: 'metier', label: 'Gestion du métier' },
    { id: 'changement', label: 'Gestion du changement' },
    { id: 'technologie', label: 'Gestion de la technologie' },
  ];

  myProjects: Project[] = [];
  selectedProject: Project | null = null;

  isLoading = false;
  loadError: string | null = null;
  private destroyed = false;

  constructor(
    private router: Router,
    private projectService: ProjectService,
    private projectData: ProjectDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // On ne bloque pas le rendu
    void this.loadProjectsFromApi();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  async refresh(): Promise<void> {
    await this.loadProjectsFromApi();
  }

  private async loadProjectsFromApi(): Promise<void> {
    this.isLoading = true;
    this.loadError = null;

    console.log('[PrivatePage] loadProjectsFromApi() start');

    try {
      // 1) liste "light" depuis l’API
      const list = await this.projectData.listProjects();
      console.log('[PrivatePage] listProjects()', list);

      if (!list.length) {
        this.myProjects = [];
        this.selectedProject = null;
        return;
      }

      // 2) charge les détails
      const details = await Promise.all(list.map((p) => this.projectData.getProjectById(p.id)));
      console.log('[PrivatePage] project details loaded', details);

      // 3) transforme en modèle dashboard
      const dashboardProjects = details
        .filter((d): d is ProjectDetail => !!d)
        .map((d) => {
          // ✅ register dans store + normalisation côté service
          // (utile pour les autres écrans si tu relies plus tard)
          this.projectService.registerProject(d);
          return this.toDashboardProject(d);
        });

      this.myProjects = dashboardProjects;
      this.selectedProject = this.myProjects[0] ?? null;

      console.log('[PrivatePage] dashboard projects ready', {
        count: this.myProjects.length,
        selected: this.selectedProject?.id ?? null,
      });
    } catch (e: any) {
      console.error('[PrivatePage] loadProjectsFromApi error', e);
      this.loadError = "Impossible de charger les projets depuis l'API.";
      this.myProjects = [];
      this.selectedProject = null;
    } finally {
      this.isLoading = false;
      console.log('[PrivatePage] loadProjectsFromApi() end');
      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  // -------------------------
  // Mapping ProjectDetail -> Project (dashboard)
  // -------------------------
  private toDashboardProject(detail: ProjectDetail): Project {
    const phases =
      Array.isArray((detail as any).phases) && (detail as any).phases.length
        ? ((detail as any).phases as PhaseId[])
        : (['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'] as PhaseId[]);

    const taskMatrix: any = (detail as any).taskMatrix ?? {};

    // Build activityMatrix for UI
    const activityMatrix: any = {};
    for (const actId of Object.keys(taskMatrix ?? {}) as ActivityId[]) {
      activityMatrix[actId] = {};
      for (const ph of phases) {
        const tasks = taskMatrix?.[actId]?.[ph] ?? [];
        activityMatrix[actId][ph] = this.aggregateCellStatus(tasks);
      }
    }

    const currentPhase = this.computeCurrentPhase(phases, taskMatrix);
    const health = this.computeHealth(taskMatrix);

    return {
      id: detail.id,
      name: detail.name,
      description: (detail as any).description ?? '',
      role: 'Membre', // TODO DB
      status: 'En cours', // TODO DB
      health,
      projectManager: '—', // TODO DB
      sponsor: '—', // TODO DB
      currentPhase,
      changePractitioner: '—',
      businessVisionary: '—',
      technicalExpert: '—',
      activityMatrix,
    } as Project;
  }

  private aggregateCellStatus(tasks: any[]): ActivityStatus {
    if (!Array.isArray(tasks) || tasks.length === 0) return 'todo';

    // du "pire" au "meilleur"
    const order: ActivityStatus[] = [
      'notdone',
      'onhold',
      'inprogress',
      'todo',
      'done',
      'notapplicable',
    ];

    let bestIdx = order.length - 1;

    for (const t of tasks) {
      const s = (t?.status ?? 'todo') as ActivityStatus;
      const idx = order.indexOf(s);
      if (idx >= 0 && idx < bestIdx) bestIdx = idx;
    }

    return order[bestIdx] ?? 'todo';
  }

  private computeCurrentPhase(phases: PhaseId[], taskMatrix: any): PhaseId {
    for (const ph of phases) {
      for (const actId of Object.keys(taskMatrix ?? {})) {
        const tasks: any[] = taskMatrix?.[actId]?.[ph] ?? [];
        if (tasks.some((t) => !['done', 'notapplicable'].includes((t?.status ?? 'todo') as string))) {
          return ph;
        }
      }
    }
    return phases[phases.length - 1] ?? 'Phase1';
  }

  private computeHealth(taskMatrix: any): Project['health'] {
    let total = 0;
    let bad = 0;

    for (const actId of Object.keys(taskMatrix ?? {})) {
      const byPhase = taskMatrix?.[actId];
      if (!byPhase) continue;

      for (const ph of Object.keys(byPhase ?? {})) {
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

  // -------------------------
  // UI helpers / actions
  // -------------------------
  selectProject(project: Project): void {
    this.selectedProject = project;
  }

  getHealthLabel(health: Project['health']): string {
    switch (health) {
      case 'good':
        return 'Tout est OK';
      case 'warning':
        return 'Attention';
      case 'critical':
        return 'Alerte';
      default:
        return '';
    }
  }

  getStatusClass(status: ActivityStatus | undefined): string {
    switch (status) {
      case 'done':
        return 'status-done';
      case 'todo':
        return 'status-todo';
      case 'inprogress':
        return 'status-inprogress';
      case 'notdone':
        return 'status-notdone';
      case 'onhold':
        return 'status-onhold';
      case 'notapplicable':
        return 'status-notapplicable';
      default:
        return 'status-todo';
    }
  }

  onView(project: Project): void {
    console.log('[PrivatePage] onView()', project);
    this.selectProject(project);
    this.router.navigate(['/project', project.id]);
  }

  onEdit(project: Project): void {
    this.router.navigate(['/project', project.id, 'edit']);
  }

  onPause(project: Project): void {
    this.projectService.pauseProject({ projectId: project.id });
    project.status = 'En pause';
  }

  onArchive(project: Project): void {
    this.projectService.archiveProject({ projectId: project.id });
    project.status = 'Archivé';
  }
}
