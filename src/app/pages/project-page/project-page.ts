import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import type { ProjectDetail, ProjectTab, UserRef } from '../../models';
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

  private readonly subs = new Subscription();
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
    const projectTasksMatrix = ((((p as any)?.projectTasksMatrix) && typeof (p as any).projectTasksMatrix === 'object')
      ? (p as any).projectTasksMatrix
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
      projectTasksMatrix,
      milestones: Array.isArray((p as any)?.milestones) ? (p as any).milestones : [],
      otherResources: Array.isArray((p as any)?.otherResources) ? (p as any).otherResources : [],
    } as ProjectDetail;
  }
}
