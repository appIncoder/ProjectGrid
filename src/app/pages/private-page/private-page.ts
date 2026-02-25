import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

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
  private readonly defaultPhaseLongNames: Record<string, string> = {
    Phase1: 'Phase 1',
    Phase2: 'Phase 2',
    Phase3: 'Phase 3',
    Phase4: 'Phase 4',
    Phase5: 'Phase 5',
    Phase6: 'Phase 6',
  };

  myProjects: Project[] = [];
  selectedProject: Project | null = null;
  selectedProjectDetail: ProjectDetail | null = null;
  private projectDetailsById = new Map<string, ProjectDetail>();

  isLoading = false;
  loadError: string | null = null;
  private destroyed = false;
  private routerEventsSub: Subscription | null = null;

  constructor(
    private router: Router,
    private projectService: ProjectService,
    private projectData: ProjectDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // On ne bloque pas le rendu
    void this.loadProjectsFromApi();
    this.routerEventsSub = this.router.events
      .pipe(filter((evt): evt is NavigationEnd => evt instanceof NavigationEnd))
      .subscribe((evt) => {
        const url = evt.urlAfterRedirects;
        if (url === '/' || url.startsWith('/projects-overview')) {
          void this.loadProjectsFromApi();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.routerEventsSub?.unsubscribe();
    this.routerEventsSub = null;
  }

  async refresh(): Promise<void> {
    await this.loadProjectsFromApi();
  }

  private async loadProjectsFromApi(): Promise<void> {
    if (this.isLoading) return;
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
        this.selectedProjectDetail = null;
        this.projectDetailsById.clear();
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
          this.projectDetailsById.set(d.id, d);
          return this.toDashboardProject(d);
        });

      this.myProjects = dashboardProjects;
      this.selectedProject = this.myProjects[0] ?? null;
      this.selectedProjectDetail = this.selectedProject
        ? this.projectDetailsById.get(this.selectedProject.id) ?? null
        : null;

      console.log('[PrivatePage] dashboard projects ready', {
        count: this.myProjects.length,
        selected: this.selectedProject?.id ?? null,
      });
    } catch (e: any) {
      console.error('[PrivatePage] loadProjectsFromApi error', e);
      this.loadError = "Impossible de charger les projets depuis l'API.";
      this.myProjects = [];
      this.selectedProject = null;
      this.selectedProjectDetail = null;
      this.projectDetailsById.clear();
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
    const healthName = this.getActiveHealthShortName(detail) || 'Good';
    const health = this.computeHealth(detail);

    return {
      id: detail.id,
      name: detail.name,
      description: (detail as any).description ?? '',
      role: String((detail as any)?.role ?? 'Membre'),
      status: this.computeStatus(taskMatrix),
      health,
      healthName,
      projectManager: this.extractProjectManager(detail),
      sponsor: this.extractSponsor(detail),
      currentPhase,
      changePractitioner: this.extractActivityOwner(detail, 'changement'),
      businessVisionary: this.extractActivityOwner(detail, 'metier'),
      technicalExpert: this.extractActivityOwner(detail, 'technologie'),
      activityMatrix,
    } as Project;
  }

  private extractProjectManager(detail: ProjectDetail): string {
    return String(
      (detail as any)?.projectManager ??
      (detail as any)?.owner ??
      (detail as any)?.activities?.projet?.owner ??
      '—'
    ).trim() || '—';
  }

  private extractSponsor(detail: ProjectDetail): string {
    return String((detail as any)?.sponsor ?? '—').trim() || '—';
  }

  private extractActivityOwner(detail: ProjectDetail, activityId: ActivityId): string {
    return String((detail as any)?.activities?.[activityId]?.owner ?? '—').trim() || '—';
  }

  private computeStatus(taskMatrix: any): string {
    let total = 0;
    let done = 0;
    let inProgress = 0;
    let onHold = 0;

    for (const actId of Object.keys(taskMatrix ?? {})) {
      const byPhase = taskMatrix?.[actId] ?? {};
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

  private computeHealth(detail: ProjectDetail): Project['health'] {
    const shortName = this.getActiveHealthShortName(detail).toLowerCase();

    if (shortName === 'average') return 'warning';
    if (shortName === 'bad' || shortName === 'blocked') return 'critical';
    return 'good';
  }

  private getActiveHealthShortName(detail: ProjectDetail): string {
    const rows = Array.isArray((detail as any)?.projectHealth) ? (detail as any).projectHealth : [];
    const active = rows.find((h: any) => String(h?.status ?? '').toLowerCase() === 'active');
    return String(active?.shortName ?? '').trim();
  }

  // -------------------------
  // UI helpers / actions
  // -------------------------
  selectProject(project: Project): void {
    this.selectedProject = project;
    this.selectedProjectDetail = this.projectDetailsById.get(project.id) ?? null;
  }

  getSelectedPhases(): PhaseId[] {
    return this.selectedProjectDetail?.phases ?? [];
  }

  getSelectedActivities(): Array<{ id: ActivityId; label: string }> {
    const activities = this.selectedProjectDetail?.activities;
    if (!activities) return [];

    return Object.values(activities)
      .sort((a, b) => {
        const aSeq = Number.isFinite(a.sequence as number) ? Number(a.sequence) : Number.POSITIVE_INFINITY;
        const bSeq = Number.isFinite(b.sequence as number) ? Number(b.sequence) : Number.POSITIVE_INFINITY;
        if (aSeq !== bSeq) return aSeq - bSeq;
        return (a.label ?? '').localeCompare(b.label ?? '', 'fr', { sensitivity: 'base' });
      })
      .map((a) => ({ id: a.id, label: a.label }));
  }

  getSelectedCellStatus(activityId: ActivityId, phase: PhaseId): ActivityStatus {
    const detail = this.selectedProjectDetail;
    if (!detail) return 'todo';
    return detail.taskMatrix?.[activityId]?.[phase]?.length
      ? this.aggregateCellStatus(detail.taskMatrix[activityId][phase] as any[])
      : 'todo';
  }

  getPhaseLongName(phase: PhaseId): string {
    const detail = this.selectedProjectDetail as any;
    const fromDefinitions = String(detail?.phaseDefinitions?.[phase]?.label ?? '').trim();
    if (fromDefinitions) return fromDefinitions;
    return this.defaultPhaseLongNames[phase] ?? String(phase);
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
