import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import type { ActivityId, Item, PhaseId, ProjectDetail, ProjectPhaseActivityReport, ProjectTab, UserRef } from '../../models';
import { ProjectDataService, type ProjectHealthDefaultRef } from '../../services/project-data.service';
import { ProjectService } from '../../services/project.service';

// Composants d’onglet
import { ProjectScorecard } from '../../shared/project-score-card/project-score-card';
import { ProjectRisks } from '../../shared/project-risks/project-risks';
import { ProjectBudget } from '../../shared/project-budget/project-budget';
import { ProjectRoadmap } from '../../shared/project-roadmap/project-roadmap';
import { ProjectBoard } from '../../shared/project-board/project-board';
import { ProjectRessources } from '../../shared/project-ressources/project-ressources';
import { ProjectChangeManagement } from '../../shared/project-change-management/project-change-management';
import { ProjectProjectManagement } from '../../shared/project-project-management/project-project-management';
import { ProjectBusinessManagement } from '../../shared/project-business-management/project-business-management';
import { ProjectTechnologyManagement } from '../../shared/project-technology-management/project-technology-management';

type WorkflowSuggestion =
  | {
      kind: 'phase';
      key: string;
      currentPhase: PhaseId;
      nextPhase: PhaseId;
      currentPhaseLabel: string;
      nextPhaseLabel: string;
    }
  | {
      kind: 'parent';
      key: string;
      activityId: ActivityId;
      phase: PhaseId;
      parentId: string;
      parentLabel: string;
      phaseLabel: string;
    };

interface PhaseActivityReport {
  title: string;
  text: string;
  persistedId?: string;
}

@Component({
  selector: 'app-project-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ProjectScorecard,
    ProjectRisks,
    ProjectBudget,
    ProjectRoadmap,
    ProjectBoard,
    ProjectRessources,
    ProjectChangeManagement,
    ProjectProjectManagement,
    ProjectBusinessManagement,
    ProjectTechnologyManagement,
  ],
  templateUrl: './project-page.html',
  styleUrls: ['./project-page.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ProjectPage implements OnInit, OnDestroy {
  project: ProjectDetail | null = null;
  users: UserRef[] = [];
  healthDefaults: ProjectHealthDefaultRef[] = [];
  selectedHealthShortName = '';
  activeTab: ProjectTab = 'scorecard';

  isLoading = false;
  loadError: string | null = null;
  saveError: string | null = null;
  isSaving = false;
  isUpdatingHealth = false;
  workflowSuggestion: WorkflowSuggestion | null = null;
  phaseActivityReport: PhaseActivityReport | null = null;

  private readonly subs = new Subscription();
  private readonly dismissedWorkflowSuggestions = new Set<string>();
  private destroyed = false;
  private pendingSaveReason: string | null = null;
  private saveInFlight = false;
  private saveRequestedWhileInFlight = false;

  constructor(
    private route: ActivatedRoute,
    private data: ProjectDataService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // ✅ recharge si l'ID change (important quand on navigue entre projets)
    this.subs.add(this.route.paramMap.subscribe((pm) => {
      const projectId = pm.get('id');
      void this.loadProject(projectId);
    }));

    this.subs.add(this.projectService.mutations$.subscribe((evt) => {
      if (!this.project || evt.projectId !== this.project.id) return;
      this.schedulePersist(evt.type);
    }));
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.subs.unsubscribe();
  }

  async reload(): Promise<void> {
    const projectId = this.route.snapshot.paramMap.get('id');
    await this.loadProject(projectId);
  }

  private async loadProject(projectId: string | null): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.saveError = null;
    this.project = null;

    console.log('[ProjectPage] loadProject()', { projectId });

    try {
      const [p, users, healthDefaults] = await Promise.all([
        this.data.getProjectById(projectId),
        this.data.listUsers(projectId).catch(() => [] as UserRef[]),
        this.data.listProjectHealthDefaults().catch(() => [] as ProjectHealthDefaultRef[]),
      ]);

      console.log('[ProjectPage] getProjectById result', { found: !!p, projectId });

      if (!p) {
        this.loadError = "Projet introuvable (ou réponse API invalide).";
        this.project = null;
        return;
      }

      this.project = this.normalizeForView(p, projectId);
      this.users = users;
      this.healthDefaults = (healthDefaults ?? []).filter((h) => String(h?.status ?? '').toLowerCase() === 'active');
      this.selectedHealthShortName = this.getActiveProjectHealthShortName(this.project) || 'Good';
      this.activeTab = this.activeTab || 'scorecard';
      this.projectService.currentProjectId = this.project.id;
      this.evaluateWorkflowSuggestions();

      console.log('[ProjectPage] project bound to template', {
        id: this.project.id,
        name: this.project.name,
        phases: this.project.phases?.length ?? 0,
        activities: Object.keys((this.project as any).activities ?? {}).length,
        taskMatrixRows: Object.keys(((this.project as any).activityMatrix ?? (this.project as any).taskMatrix) ?? {}).length,
      });
    } catch (e) {
      console.error('[ProjectPage] loadProject error', e);
      this.loadError = "Impossible de charger le projet.";
      this.project = null;
    } finally {
      this.isLoading = false;
      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  private schedulePersist(reason: string): void {
    this.pendingSaveReason = reason;
    this.evaluateWorkflowSuggestions();
    void this.persistProjectProcedure();
  }

  private async persistProjectProcedure(): Promise<void> {
    if (!this.project) return;
    if (this.saveInFlight) {
      this.saveRequestedWhileInFlight = true;
      return;
    }

    this.saveInFlight = true;
    this.isSaving = true;
    this.saveError = null;
    try {
      do {
        this.saveRequestedWhileInFlight = false;

        if (!this.project) break;
        const projectSnapshot =
          typeof structuredClone === 'function'
            ? structuredClone(this.project)
            : JSON.parse(JSON.stringify(this.project));

        try {
          await this.data.runProjectProcedure(projectSnapshot.id, 'save_project', { project: projectSnapshot });
          this.pendingSaveReason = null;
        } catch (e) {
          console.error('[ProjectPage] persistProjectProcedure error', {
            reason: this.pendingSaveReason,
            projectId: projectSnapshot.id,
            e,
          });
          const detail = (e as any)?.error?.detail ?? (e as any)?.message ?? '';
          this.saveError = detail
            ? `Les modifications n'ont pas pu être enregistrées: ${detail}`
            : "Les modifications n'ont pas pu être enregistrées.";
          // Annule localement la modification rejetée par le backend.
          await this.loadProject(projectSnapshot.id);
          break;
        }
      } while (this.saveRequestedWhileInFlight);
    } finally {
      this.saveInFlight = false;
      this.isSaving = false;
      if (!this.destroyed) this.cdr.detectChanges();
    }
  }

  get currentPhaseName(): string | null {
    if (!this.project) return null;
    const defs = (this.project as any).phaseDefinitions as
      Record<string, { isCurrent?: boolean; label?: string }> | undefined;
    if (defs) {
      for (const phase of this.project.phases) {
        if (defs[phase]?.isCurrent) return defs[phase].label ?? phase;
      }
    }
    // Fallback : première phase
    const first = this.project.phases[0];
    if (!first) return null;
    return defs?.[first]?.label ?? first;
  }

  get workflowSuggestionTitle(): string {
    if (!this.workflowSuggestion) return '';
    return this.workflowSuggestion.kind === 'phase'
      ? 'Changement de phase proposé'
      : 'Clôture d’activité proposée';
  }

  get workflowSuggestionText(): string {
    const suggestion = this.workflowSuggestion;
    if (!suggestion) return '';
    if (suggestion.kind === 'phase') {
      return `Toutes les activités de la phase ${suggestion.currentPhaseLabel} sont terminées, non faites ou N/A. Vous pouvez générer le rapport de phase pour préparer la réunion Go / No Go.`;
    }
    return `Toutes les tâches filles de l’activité "${suggestion.parentLabel}" sont terminées. Vous pouvez clôturer cette activité mère.`;
  }

  get workflowSuggestionPrimaryLabel(): string {
    const suggestion = this.workflowSuggestion;
    if (!suggestion) return '';
    return suggestion.kind === 'phase'
      ? `GO - passer à ${suggestion.nextPhaseLabel}`
      : 'Clôturer l’activité';
  }

  acceptWorkflowSuggestion(): void {
    const suggestion = this.workflowSuggestion;
    if (!this.project || !suggestion) return;

    if (suggestion.kind === 'phase') {
      this.applyPhaseChange(suggestion.currentPhase, suggestion.nextPhase);
      this.dismissedWorkflowSuggestions.add(suggestion.key);
      this.workflowSuggestion = null;
      this.schedulePersist('workflow_phase_advanced');
      return;
    }

    const parent = this.findParentItem(
      this.project,
      suggestion.activityId,
      suggestion.phase,
      suggestion.parentId
    );
    if (!parent) {
      this.dismissWorkflowSuggestion();
      return;
    }

    parent.status = 'done';
    this.dismissedWorkflowSuggestions.add(suggestion.key);
    this.workflowSuggestion = null;
    this.schedulePersist('workflow_parent_activity_closed');
  }

  rejectGoNoGoSuggestion(): void {
    const suggestion = this.workflowSuggestion;
    if (!suggestion || suggestion.kind !== 'phase') return;
    this.dismissedWorkflowSuggestions.add(suggestion.key);
    this.workflowSuggestion = null;
  }

  dismissWorkflowSuggestion(): void {
    if (this.workflowSuggestion) {
      this.dismissedWorkflowSuggestions.add(this.workflowSuggestion.key);
    }
    this.workflowSuggestion = null;
  }

  generatePhaseActivityReport(): void {
    if (!this.project || this.workflowSuggestion?.kind !== 'phase') return;

    const suggestion = this.workflowSuggestion;
    const lines: string[] = [];
    const matrix = this.getActivityMatrix(this.project);
    const childMatrix = this.getChildMatrix(this.project);
    const generatedAt = new Date();
    const generatedAtIso = generatedAt.toISOString();

    lines.push(`Rapport d'activités - ${suggestion.currentPhaseLabel}`);
    lines.push(`Projet: ${this.project.name}`);
    lines.push(`Généré le: ${generatedAt.toLocaleString('fr-BE')}`);
    lines.push(`Phase suivante proposée: ${suggestion.nextPhaseLabel}`);
    lines.push('');

    for (const activityId of Object.keys(this.project.activities ?? {}) as ActivityId[]) {
      const activity = this.project.activities?.[activityId];
      const parents = matrix?.[activityId]?.[suggestion.currentPhase] ?? [];
      if (!parents.length) continue;

      lines.push(`## ${activity?.label ?? activityId}`);

      for (const parent of parents) {
        const children = childMatrix?.[activityId]?.[suggestion.currentPhase]?.[parent.id] ?? [];
        const childSummary = this.summarizeStatuses(children);
        const parentStatus = this.getStatusLabel(parent.status);
        const owner = this.getUserLabel(parent.responsibleId);
        const reporter = this.getUserLabel(parent.reporterId);

        lines.push(`- ${parent.label}`);
        lines.push(`  Statut: ${parentStatus}`);
        if (owner) lines.push(`  Assigné: ${owner}`);
        if (reporter) lines.push(`  Rapporteur: ${reporter}`);
        if (parent.startDate || parent.endDate) {
          lines.push(`  Période: ${parent.startDate || 'n/a'} -> ${parent.endDate || 'n/a'}`);
        }
        lines.push(`  Tâches filles: ${children.length || 0}${childSummary ? ` (${childSummary})` : ''}`);

        const comments = Array.isArray(parent.comments) ? parent.comments : [];
        if (comments.length) {
          lines.push(`  Commentaires activité: ${comments.length}`);
        }

        for (const child of children) {
          lines.push(`    - ${child.label} [${this.getStatusLabel(child.status)}]`);
        }
      }

      lines.push('');
    }

    const report: ProjectPhaseActivityReport = {
      id: this.createPhaseReportId(suggestion.currentPhase),
      phaseId: suggestion.currentPhase,
      phaseLabel: suggestion.currentPhaseLabel,
      nextPhaseId: suggestion.nextPhase,
      nextPhaseLabel: suggestion.nextPhaseLabel,
      title: `Rapport Go / No Go - ${suggestion.currentPhaseLabel}`,
      content: lines.join('\n').trim(),
      generatedAt: generatedAtIso,
    };

    this.project.phaseActivityReports = [
      report,
      ...((this.project.phaseActivityReports ?? []).filter((item) => item.id !== report.id)),
    ];

    this.phaseActivityReport = {
      title: report.title,
      text: report.content,
      persistedId: report.id,
    };

    this.schedulePersist('workflow_phase_activity_report_generated');
  }

  closePhaseActivityReport(): void {
    this.phaseActivityReport = null;
  }

  async copyPhaseActivityReport(): Promise<void> {
    const text = this.phaseActivityReport?.text;
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(text);
  }

  setTab(tab: ProjectTab): void {
    this.activeTab = tab;
  }

  async onProjectHealthChange(nextShortName: string): Promise<void> {
    if (!this.project || this.isUpdatingHealth) return;
    const selected = String(nextShortName ?? '').trim();
    if (!selected) return;

    const current = this.getActiveProjectHealthShortName(this.project);
    if (current && current.toLowerCase() === selected.toLowerCase()) return;

    this.isUpdatingHealth = true;
    this.isSaving = true;
    this.saveError = null;
    try {
      const updated = await this.data.updateProjectHealth(this.project.id, selected);
      this.project = {
        ...this.project,
        projectHealth: Array.isArray(updated) ? updated : [],
      } as ProjectDetail;
      this.selectedHealthShortName = this.getActiveProjectHealthShortName(this.project) || selected;
      this.projectService.registerProject(this.project);
      this.data.cacheProject(this.project);
    } catch (e) {
      console.error('[ProjectPage] onProjectHealthChange error', e);
      this.saveError = "La mise à jour de l'état de santé a échoué.";
      this.selectedHealthShortName = current || this.selectedHealthShortName;
    } finally {
      this.isUpdatingHealth = false;
      this.isSaving = false;
      if (!this.destroyed) this.cdr.detectChanges();
    }
  }

  private getActiveProjectHealthShortName(project: ProjectDetail | null): string {
    const rows = Array.isArray((project as any)?.projectHealth) ? (project as any).projectHealth : [];
    const active = rows.find((h: any) => String(h?.status ?? '').toLowerCase() === 'active');
    return String(active?.shortName ?? '').trim();
  }

  private normalizeForView(p: ProjectDetail, requestedId: string | null): ProjectDetail {
    const phases = Array.isArray((p as any)?.phases) && (p as any).phases.length
      ? (p as any).phases
      : ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'];

    const activities = ((p as any)?.activities && typeof (p as any).activities === 'object')
      ? (p as any).activities
      : {
          projet: { id: 'projet', label: 'Gestion du projet', owner: '—', sequence: 1 },
          metier: { id: 'metier', label: 'Gestion du métier', owner: '—', sequence: 2 },
          changement: { id: 'changement', label: 'Gestion du changement', owner: '—', sequence: 3 },
          technologie: { id: 'technologie', label: 'Gestion de la technologie', owner: '—', sequence: 4 },
        };

    const matrix = (((p as any)?.activityMatrix && typeof (p as any).activityMatrix === 'object')
      ? (p as any).activityMatrix
      : (((p as any)?.taskMatrix && typeof (p as any).taskMatrix === 'object')
          ? (p as any).taskMatrix
          : {}));
    const taskMatrix = { ...matrix };
    const projectTasksMatrix = ((((p as any)?.projectItemsMatrix ?? (p as any)?.projectTasksMatrix) && typeof ((p as any)?.projectItemsMatrix ?? (p as any)?.projectTasksMatrix) === 'object')
      ? ((p as any).projectItemsMatrix ?? (p as any).projectTasksMatrix)
      : {});

    for (const activityId of Object.keys(activities)) {
      if (!taskMatrix[activityId] || typeof taskMatrix[activityId] !== 'object') {
        taskMatrix[activityId] = {};
      }
      if (!projectTasksMatrix[activityId] || typeof projectTasksMatrix[activityId] !== 'object') {
        projectTasksMatrix[activityId] = {};
      }
      for (const phase of phases) {
        if (!Array.isArray(taskMatrix[activityId][phase])) {
          taskMatrix[activityId][phase] = [];
        }
        if (!projectTasksMatrix[activityId][phase] || typeof projectTasksMatrix[activityId][phase] !== 'object') {
          projectTasksMatrix[activityId][phase] = {};
        }
      }
    }

    // Ensure at least one phase has isCurrent: true (default: first phase)
    const rawDefs = (p as any)?.phaseDefinitions as Record<string, { isCurrent?: boolean }> | undefined;
    const hasCurrentPhase = rawDefs && phases.some((ph: string) => rawDefs[ph]?.isCurrent === true);
    const phaseDefinitions = rawDefs ?? {};
    if (!hasCurrentPhase && phases.length > 0) {
      const firstPhase = phases[0];
      phaseDefinitions[firstPhase] = { ...phaseDefinitions[firstPhase], isCurrent: true };
    }

    return {
      ...p,
      id: String((p as any)?.id ?? requestedId ?? ''),
      name: String((p as any)?.name ?? `Projet ${(p as any)?.id ?? requestedId ?? ''}`),
      description: String((p as any)?.description ?? ''),
      phases,
      activities,
      phaseDefinitions: Object.keys(phaseDefinitions).length ? phaseDefinitions : undefined,
      activityMatrix: taskMatrix,
      taskMatrix,
      projectItemsMatrix: projectTasksMatrix,
      projectTasksMatrix,
      milestones: Array.isArray((p as any)?.milestones) ? (p as any).milestones : [],
      phaseActivityReports: Array.isArray((p as any)?.phaseActivityReports) ? (p as any).phaseActivityReports : [],
      otherResources: Array.isArray((p as any)?.otherResources) ? (p as any).otherResources : [],
    } as ProjectDetail;
  }

  private evaluateWorkflowSuggestions(): void {
    if (!this.project || this.workflowSuggestion) return;

    const parentSuggestion = this.findParentClosureSuggestion(this.project);
    if (parentSuggestion) {
      this.workflowSuggestion = parentSuggestion;
      return;
    }

    const phaseSuggestion = this.findPhaseChangeSuggestion(this.project);
    if (phaseSuggestion) {
      this.workflowSuggestion = phaseSuggestion;
    }
  }

  private findPhaseChangeSuggestion(project: ProjectDetail): WorkflowSuggestion | null {
    const currentPhase = this.getCurrentPhaseId(project);
    if (!currentPhase) return null;

    const nextPhase = this.getNextPhaseId(project, currentPhase);
    if (!nextPhase) return null;

    const key = `phase:${project.id}:${currentPhase}:${nextPhase}`;
    if (this.dismissedWorkflowSuggestions.has(key)) return null;

    const matrix = this.getActivityMatrix(project);
    const phaseActivities: Item[] = [];
    for (const activityId of Object.keys(project.activities ?? {}) as ActivityId[]) {
      phaseActivities.push(...(matrix?.[activityId]?.[currentPhase] ?? []));
    }

    if (!phaseActivities.length) return null;
    if (!phaseActivities.every((item) => this.isPhaseReadyStatus(item?.status))) return null;

    return {
      kind: 'phase',
      key,
      currentPhase,
      nextPhase,
      currentPhaseLabel: this.getPhaseLabel(project, currentPhase),
      nextPhaseLabel: this.getPhaseLabel(project, nextPhase),
    };
  }

  private findParentClosureSuggestion(project: ProjectDetail): WorkflowSuggestion | null {
    const parentMatrix = this.getActivityMatrix(project);
    const childMatrix = this.getChildMatrix(project);
    const phases = Array.isArray(project.phases) ? project.phases : [];

    for (const activityId of Object.keys(project.activities ?? {}) as ActivityId[]) {
      for (const phase of phases) {
        const parents = parentMatrix?.[activityId]?.[phase] ?? [];
        for (const parent of parents) {
          if (!parent?.id || this.isClosureReadyStatus(parent.status)) continue;

          const children = childMatrix?.[activityId]?.[phase]?.[parent.id] ?? [];
          if (!children.length) continue;
          if (!children.every((child) => this.isClosureReadyStatus(child?.status))) continue;

          const key = `parent:${project.id}:${activityId}:${phase}:${parent.id}`;
          if (this.dismissedWorkflowSuggestions.has(key)) continue;

          return {
            kind: 'parent',
            key,
            activityId,
            phase,
            parentId: parent.id,
            parentLabel: parent.label || parent.id,
            phaseLabel: this.getPhaseLabel(project, phase),
          };
        }
      }
    }

    return null;
  }

  private applyPhaseChange(currentPhase: PhaseId, nextPhase: PhaseId): void {
    if (!this.project) return;
    const phaseDefinitions = ((this.project as any).phaseDefinitions ?? {}) as Record<string, any>;
    for (const phase of this.project.phases ?? []) {
      phaseDefinitions[phase] = {
        ...(phaseDefinitions[phase] ?? {}),
        isCurrent: phase === nextPhase,
      };
    }
    if (!phaseDefinitions[currentPhase]) {
      phaseDefinitions[currentPhase] = { id: currentPhase, isCurrent: false };
    } else {
      phaseDefinitions[currentPhase].isCurrent = false;
    }
    if (!phaseDefinitions[nextPhase]) {
      phaseDefinitions[nextPhase] = { id: nextPhase, isCurrent: true };
    } else {
      phaseDefinitions[nextPhase].isCurrent = true;
    }
    (this.project as any).phaseDefinitions = phaseDefinitions;
  }

  private findParentItem(
    project: ProjectDetail,
    activityId: ActivityId,
    phase: PhaseId,
    parentId: string
  ): Item | null {
    return this.getActivityMatrix(project)?.[activityId]?.[phase]?.find((item) => item.id === parentId) ?? null;
  }

  private getCurrentPhaseId(project: ProjectDetail): PhaseId | null {
    const defs = (project as any).phaseDefinitions as Record<string, { isCurrent?: boolean }> | undefined;
    const current = (project.phases ?? []).find((phase) => defs?.[phase]?.isCurrent === true);
    return current ?? project.phases?.[0] ?? null;
  }

  private getNextPhaseId(project: ProjectDetail, currentPhase: PhaseId): PhaseId | null {
    const phases = project.phases ?? [];
    const index = phases.indexOf(currentPhase);
    return index >= 0 ? phases[index + 1] ?? null : null;
  }

  private getPhaseLabel(project: ProjectDetail, phase: PhaseId): string {
    return (project as any).phaseDefinitions?.[phase]?.label ?? phase;
  }

  private getActivityMatrix(project: ProjectDetail): Record<ActivityId, Record<PhaseId, Item[]>> {
    return ((project as any).activityMatrix ?? project.taskMatrix ?? {}) as Record<ActivityId, Record<PhaseId, Item[]>>;
  }

  private getChildMatrix(project: ProjectDetail): Record<ActivityId, Record<PhaseId, Record<string, Item[]>>> {
    return ((project as any).projectItemsMatrix ?? (project as any).projectTasksMatrix ?? {}) as Record<ActivityId, Record<PhaseId, Record<string, Item[]>>>;
  }

  private isPhaseReadyStatus(status: unknown): boolean {
    const normalized = String(status ?? '').toLowerCase();
    return normalized === 'done' || normalized === 'notdone' || normalized === 'notapplicable';
  }

  private isClosureReadyStatus(status: unknown): boolean {
    const normalized = String(status ?? '').toLowerCase();
    return normalized === 'done' || normalized === 'notapplicable';
  }

  private summarizeStatuses(items: Item[]): string {
    if (!items.length) return '';
    const counts = new Map<string, number>();
    for (const item of items) {
      const label = this.getStatusLabel(item.status);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, count]) => `${label}: ${count}`).join(', ');
  }

  private getStatusLabel(status: unknown): string {
    switch (String(status ?? '').toLowerCase()) {
      case 'todo':
        return 'To Do';
      case 'inprogress':
        return 'In Progress';
      case 'onhold':
        return 'On Hold';
      case 'done':
        return 'Terminé';
      case 'notdone':
        return 'Non fait';
      case 'notapplicable':
        return 'N/A';
      default:
        return String(status ?? 'n/a') || 'n/a';
    }
  }

  private getUserLabel(userId: string | undefined): string {
    const id = String(userId ?? '').trim();
    if (!id) return '';
    return this.users.find((user) => user.id === id)?.label ?? id;
  }

  private createPhaseReportId(phase: PhaseId): string {
    return `phase-report-${phase}-${Date.now().toString(36)}`;
  }
}
