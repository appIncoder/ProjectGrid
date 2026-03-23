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
  ProjectMember,
  ProjectRole,
  RiskLevel,
  Task,
} from '../../models';

type ProgressCell = {
  phaseId: PhaseId;
  percent: number;
  done: number;
  total: number;
};

type DashboardProgressRow = {
  activityId: ActivityId;
  activityLabel: string;
  cells: ProgressCell[];
};

type DashboardRiskRow = {
  id: string;
  shortName: string;
  longName: string;
  title: string;
  impact: string;
  probability: string;
  level: RiskLevel;
  status: string;
  owner: string;
  dueDate: string;
};

type RiskDisplayMode = 'table' | 'matrix';

type DashboardDueTaskRow = {
  taskId: string;
  taskLabel: string;
  activityLabel: string;
  phaseLabel: string;
  dueDate: string;
  dueTs: number;
  daysRemaining: number;
  status: ActivityStatus;
};

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

  selectedProject: Project | null = null;
  selectedProjectDetail: ProjectDetail | null = null;
  selectedProjectMembers: ProjectMember[] = [];
  progressRows: DashboardProgressRow[] = [];
  topRiskRows: DashboardRiskRow[] = [];
  dueItemRows: DashboardDueTaskRow[] = [];
  riskDisplayMode: RiskDisplayMode = 'table';
  readonly riskImpactLevels: string[] = ['Faible', 'Modéré', 'Significatif', 'Majeur', 'Critique'];
  readonly riskProbabilityLevels: string[] = ['Très faible', 'Faible', 'Moyenne', 'Élevée', 'Très élevée'];

  isLoading = false;
  loadError: string | null = null;
  noProjectSelected = false;
  private destroyed = false;
  private routerEventsSub: Subscription | null = null;
  private risksChangedSub: Subscription | null = null;

  constructor(
    private router: Router,
    private projectService: ProjectService,
    private projectData: ProjectDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.loadCurrentProject();
    this.routerEventsSub = this.router.events
      .pipe(filter((evt): evt is NavigationEnd => evt instanceof NavigationEnd))
      .subscribe((evt) => {
        const url = evt.urlAfterRedirects;
        if (url === '/' || url.startsWith('/projects-overview')) {
          void this.loadCurrentProject();
        }
      });
    this.risksChangedSub = this.projectData.risksChanged$.subscribe((evt) => {
      if (!evt?.projectId || evt.projectId !== this.selectedProject?.id) return;
      void this.refreshProjectRiskSnapshot(evt.projectId);
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.routerEventsSub?.unsubscribe();
    this.routerEventsSub = null;
    this.risksChangedSub?.unsubscribe();
    this.risksChangedSub = null;
  }

  async refresh(): Promise<void> {
    await this.loadCurrentProject();
  }

  private async loadCurrentProject(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    this.loadError = null;
    this.noProjectSelected = false;

    try {
      const projectId = await this.projectData.getCurrentProjectId();
      if (!projectId) {
        this.noProjectSelected = true;
        this.selectedProject = null;
        this.selectedProjectDetail = null;
        this.selectedProjectMembers = [];
        this.progressRows = [];
        this.topRiskRows = [];
        this.dueItemRows = [];
        return;
      }

      const detail = await this.projectData.getProjectById(projectId);
      if (!detail) {
        this.noProjectSelected = true;
        this.selectedProject = null;
        this.selectedProjectDetail = null;
        return;
      }

      this.projectService.registerProject(detail);
      this.selectedProjectDetail = detail;
      this.selectedProject = this.toDashboardProject(detail);
      this.refreshDashboardData();
      void this.loadSelectedProjectMembers(projectId);
    } catch (e) {
      console.error('[PrivatePage] loadCurrentProject error', e);
      this.loadError = "Impossible de charger le projet.";
      this.selectedProject = null;
      this.selectedProjectDetail = null;
      this.progressRows = [];
      this.topRiskRows = [];
      this.dueItemRows = [];
    } finally {
      this.isLoading = false;
      if (!this.destroyed) this.cdr.detectChanges();
    }
  }

  // ── Membres ────────────────────────────────────────────────────────────────

  getMemberByRole(role: ProjectRole): string {
    const member = this.selectedProjectMembers.find((m) => m.roles.includes(role));
    return member?.label ?? '—';
  }

  private async loadSelectedProjectMembers(projectId: string): Promise<void> {
    try {
      this.selectedProjectMembers = await this.projectData.listProjectMembers(projectId);
    } catch {
      this.selectedProjectMembers = [];
    }
    if (!this.destroyed) this.cdr.detectChanges();
  }

  // ── Mapping ProjectDetail -> Project (dashboard) ───────────────────────────

  private toDashboardProject(detail: ProjectDetail): Project {
    const phases =
      Array.isArray((detail as any).phases) && (detail as any).phases.length
        ? ((detail as any).phases as PhaseId[])
        : (['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'] as PhaseId[]);

    const taskMatrix: any = (detail as any).taskMatrix ?? {};

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
      projectManager: String((detail as any)?.projectManager ?? '—'),
      sponsor: String((detail as any)?.sponsor ?? '—'),
      currentPhase,
      changePractitioner: '—',
      businessVisionary: '—',
      technicalExpert: '—',
      activityMatrix,
    } as Project;
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

  // ── UI helpers ─────────────────────────────────────────────────────────────

  getSelectedPhases(): PhaseId[] {
    return this.selectedProjectDetail?.phases ?? [];
  }

  getSelectedActivities(): Array<{ id: ActivityId; label: string }> {
    const activities = this.selectedProjectDetail?.activities;
    if (!activities) return [];

    return Object.values(activities)
      .sort((a: any, b: any) => {
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
      case 'good':    return 'Tout est OK';
      case 'warning': return 'Attention';
      case 'critical': return 'Alerte';
      default:        return '';
    }
  }

  getStatusClass(status: ActivityStatus | undefined): string {
    switch (status) {
      case 'done':          return 'status-done';
      case 'todo':          return 'status-todo';
      case 'inprogress':    return 'status-inprogress';
      case 'notdone':       return 'status-notdone';
      case 'onhold':        return 'status-onhold';
      case 'notapplicable': return 'status-notapplicable';
      default:              return 'status-todo';
    }
  }

  goToProjects(): void {
    this.router.navigate(['/projects']);
  }

  goToProject(): void {
    if (this.selectedProject?.id) {
      this.router.navigate(['/project', this.selectedProject.id]);
    }
  }

  // ── Dashboard data ─────────────────────────────────────────────────────────

  private refreshDashboardData(): void {
    const detail = this.selectedProjectDetail;
    if (!detail) {
      this.progressRows = [];
      this.topRiskRows = [];
      this.dueItemRows = [];
      return;
    }
    this.progressRows = this.buildProgressRows(detail);
    this.topRiskRows = this.readTopRisks(detail);
    this.dueItemRows = this.buildDueItemRows(detail);
  }

  private async refreshProjectRiskSnapshot(projectId: string): Promise<void> {
    const detail = await this.projectData.getProjectById(projectId).catch(() => null);
    if (!detail || this.selectedProject?.id !== projectId) return;
    this.selectedProjectDetail = detail;
    this.selectedProject = this.toDashboardProject(detail);
    this.refreshDashboardData();
    if (!this.destroyed) this.cdr.detectChanges();
  }

  private buildProgressRows(detail: ProjectDetail): DashboardProgressRow[] {
    const phases = this.getSelectedPhases();
    const activities = this.getSelectedActivities();
    const rows: DashboardProgressRow[] = [];

    for (const activity of activities) {
      const cells: ProgressCell[] = phases.map((phaseId) => {
        const tasks = detail.taskMatrix?.[activity.id]?.[phaseId] ?? [];
        const total = tasks.length;
        const done = tasks.filter((t) => t.status === 'done' || t.status === 'notapplicable').length;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        return { phaseId, percent, done, total };
      });
      rows.push({ activityId: activity.id, activityLabel: activity.label, cells });
    }

    return rows;
  }

  private readTopRisks(detail: ProjectDetail): DashboardRiskRow[] {
    const rows = Array.isArray((detail as any).projectRisks) ? (detail as any).projectRisks : [];
    const levelRank: Record<RiskLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 };

    return rows
      .filter((r: any) => !!r && !!String(r.title ?? '').trim())
      .sort((a: any, b: any) => {
        const aRank = levelRank[this.mapCriticityToRiskLevel(String(a.criticity ?? ''))] ?? 0;
        const bRank = levelRank[this.mapCriticityToRiskLevel(String(b.criticity ?? ''))] ?? 0;
        if (aRank !== bRank) return bRank - aRank;
        const aResolved = String(a.status ?? '').toLowerCase() === 'closed' ? 1 : 0;
        const bResolved = String(b.status ?? '').toLowerCase() === 'closed' ? 1 : 0;
        if (aResolved !== bResolved) return aResolved - bResolved;
        const aDue = Date.parse(a.dateLastUpdated ?? a.dateCreated ?? '') || Number.POSITIVE_INFINITY;
        const bDue = Date.parse(b.dateLastUpdated ?? b.dateCreated ?? '') || Number.POSITIVE_INFINITY;
        return aDue - bDue;
      })
      .map((r: any) => ({
        id: String(r.riskId ?? ''),
        shortName: String(r.shortName ?? '').trim(),
        longName: String(r.longName ?? r.title ?? '').trim(),
        title: String(r.longName ?? r.title ?? '').trim(),
        impact: this.mapCriticityToImpactLabel(String(r.criticity ?? '')),
        probability: this.normalizeRiskProbabilityLabel(String(r.probability ?? '')),
        level: this.mapCriticityToRiskLevel(String(r.criticity ?? '')),
        status: String(r.status ?? 'Open'),
        owner: '—',
        dueDate: String(r.dateLastUpdated ?? r.dateCreated ?? ''),
      }));
  }

  private mapCriticityToRiskLevel(criticity: string): RiskLevel {
    const norm = criticity.trim().toLowerCase();
    if (norm === 'critical' || norm === 'critique') return 'critical';
    if (norm === 'high' || norm === 'élevée' || norm === 'elevee') return 'high';
    if (norm === 'medium' || norm === 'moyenne' || norm === 'modéré' || norm === 'modere') return 'medium';
    return 'low';
  }

  private mapCriticityToImpactLabel(criticity: string): string {
    const level = this.mapCriticityToRiskLevel(criticity);
    if (level === 'critical') return 'Critique';
    if (level === 'high') return 'Majeur';
    if (level === 'medium') return 'Modéré';
    return 'Faible';
  }

  private normalizeRiskProbabilityLabel(probability: string): string {
    const norm = String(probability ?? '').trim().toLowerCase();
    const matched = this.riskProbabilityLevels.find((p) => p.toLowerCase() === norm);
    return matched ?? this.riskProbabilityLevels[2];
  }

  setRiskDisplayMode(mode: RiskDisplayMode): void {
    this.riskDisplayMode = mode;
  }

  getRiskMatrixDots(impact: string, probability: string): DashboardRiskRow[] {
    return this.topRiskRows.filter((risk) => risk.impact === impact && risk.probability === probability);
  }

  private buildDueItemRows(detail: ProjectDetail): DashboardDueTaskRow[] {
    const rows: DashboardDueTaskRow[] = [];
    const phases = detail.phases ?? [];
    const phaseLabels = phases.reduce<Record<string, string>>((acc, phaseId) => {
      acc[phaseId] = this.getPhaseLongName(phaseId);
      return acc;
    }, {});
    const activityLabels = this.getSelectedActivities().reduce<Record<string, string>>((acc, a) => {
      acc[a.id] = a.label;
      return acc;
    }, {});
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    for (const activityId of Object.keys(detail.taskMatrix ?? {}) as ActivityId[]) {
      const phaseMap = detail.taskMatrix[activityId];
      for (const phaseId of Object.keys(phaseMap ?? {}) as PhaseId[]) {
        const tasks = phaseMap[phaseId] ?? [];
        for (const task of tasks as Task[]) {
          const dueRaw = String(task?.endDate ?? '').trim();
          if (!dueRaw) continue;
          const dueTs = Date.parse(dueRaw);
          if (Number.isNaN(dueTs)) continue;
          const diff = dueTs - todayStart;
          const daysRemaining = Math.floor(diff / 86400000);
          rows.push({
            taskId: String(task.id ?? ''),
            taskLabel: String(task.label ?? ''),
            activityLabel: activityLabels[activityId] ?? String(activityId),
            phaseLabel: phaseLabels[phaseId] ?? String(phaseId),
            dueDate: dueRaw,
            dueTs,
            daysRemaining,
            status: (task.status ?? 'todo') as ActivityStatus,
          });
        }
      }
    }

    return rows.sort((a, b) => a.dueTs - b.dueTs).slice(0, 5);
  }

  getProgressBarClass(percent: number): string {
    if (percent >= 80) return 'progress-good';
    if (percent >= 50) return 'progress-warning';
    return 'progress-critical';
  }

  getRiskLevelLabel(level: RiskLevel): string {
    if (level === 'critical') return 'Critique';
    if (level === 'high') return 'Élevé';
    if (level === 'medium') return 'Moyen';
    return 'Faible';
  }

  getRiskLevelClass(level: RiskLevel): string {
    if (level === 'critical') return 'risk-critical';
    if (level === 'high') return 'risk-high';
    if (level === 'medium') return 'risk-medium';
    return 'risk-low';
  }

  getItemDueClass(daysRemaining: number): string {
    if (daysRemaining < 0) return 'due-overdue';
    if (daysRemaining <= 3) return 'due-soon';
    return 'due-normal';
  }
}
