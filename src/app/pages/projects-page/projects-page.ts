import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { ProjectDataService, type ProjectTypeDefaults, type ProjectTypeRef } from '../../services/project-data.service';
import { AuthService } from '../../services/auth.service';
import type { ActivityId, ActivityStatus, Health, PhaseId, ProjectDetail, ProjectListItem, ProjectStatus } from '../../models';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgbDropdownModule, ConfirmDialog],
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
  isCreateModalOpen = false;
  isCreatingProject = false;
  isLoadingProjectTypes = false;
  createProjectError: string | null = null;
  projectTypeOptions: ProjectTypeRef[] = [];
  createProjectForm = {
    projectTypeId: '',
    name: '',
    description: '',
  };
  isDeleteModalOpen = false;
  isDeletingProject = false;
  deleteProjectError: string | null = null;
  deleteTargetProject: ProjectListItem | null = null;
  isSuccessModalOpen = false;
  successTitle = '';
  successMessage = '';
  private destroyed = false;
  private routerEventsSub: Subscription | null = null;

  constructor(
    private router: Router,
    private projectData: ProjectDataService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.loadProjectsFromApi();
    this.routerEventsSub = this.router.events
      .pipe(filter((evt): evt is NavigationEnd => evt instanceof NavigationEnd))
      .subscribe((evt) => {
        if (evt.urlAfterRedirects.startsWith('/projects')) {
          void this.loadProjectsFromApi();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.routerEventsSub?.unsubscribe();
    this.routerEventsSub = null;
  }

  async refreshProjects(): Promise<void> {
    await this.loadProjectsFromApi();
  }

  private async loadProjectsFromApi(): Promise<void> {
    if (this.isLoading) return;
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
    } finally {
      this.isLoading = false;
      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  private toProjectListItem(detail: ProjectDetail): ProjectListItem {
    const currentPhase = this.computeCurrentPhase(detail);
    const healthName = this.getActiveHealthShortName(detail) || 'Good';
    return {
      id: detail.id,
      name: detail.name,
      owner: this.extractOwner(detail),
      role: 'Membre',
      status: this.computeStatus(detail),
      health: this.computeHealth(detail),
      healthName,
      currentPhase: currentPhase.replace('Phase', 'Phase '),
    };
  }

  private extractOwner(detail: ProjectDetail): string {
    const anyDetail = detail as any;
    const activityOwner =
      anyDetail.activities?.projet?.owner ??
      anyDetail.activities?.metier?.owner ??
      anyDetail.activities?.changement?.owner ??
      anyDetail.activities?.technologie?.owner;
    return (
      anyDetail.owner ??
      anyDetail.projectManager ??
      anyDetail.sponsor ??
      anyDetail.createdBy ??
      activityOwner ??
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
  get connectedOwnerLabel(): string {
    const user = this.auth.user;
    return String(user?.label ?? user?.username ?? '—').trim() || '—';
  }

  onCreateProject(): void {
    this.isCreateModalOpen = true;
    this.createProjectError = null;
    this.createProjectForm = {
      projectTypeId: '',
      name: '',
      description: '',
    };
    void this.loadProjectTypesForCreation();
  }

  closeCreateProjectModal(): void {
    if (this.isCreatingProject) return;
    this.isCreateModalOpen = false;
    this.createProjectError = null;
  }

  async submitCreateProject(): Promise<void> {
    const projectTypeId = this.createProjectForm.projectTypeId.trim();
    const name = this.createProjectForm.name.trim();
    const description = this.createProjectForm.description.trim();

    if (!projectTypeId) {
      this.createProjectError = 'Le type de projet est obligatoire.';
      return;
    }

    if (!name) {
      this.createProjectError = 'Le nom du projet est obligatoire.';
      return;
    }

    const owner = this.connectedOwnerLabel;
    const projectId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `p-${Date.now()}`;

    const defaults = await this.projectData.getProjectTypeDefaults(projectTypeId);
    if (!defaults) {
      this.createProjectError = 'Impossible de charger les données du type de projet sélectionné.';
      return;
    }

    const seeded = this.buildProjectSeedFromType(defaults, owner);
    if (!seeded) {
      this.createProjectError = "Le type de projet sélectionné n'est pas compatible avec la structure attendue.";
      return;
    }

    const payload: ProjectDetail & {
      owner?: string;
      createdBy?: string;
      projectManager?: string;
      projectTypeId?: string;
      risks?: unknown[];
      budgetSummary?: {
        initial: number;
        engaged: number;
        spent: number;
        forecast: number;
        currency: string;
      };
      budgetLines?: unknown[];
    } = {
      id: projectId,
      name,
      description,
      phases: seeded.phases,
      phaseDefinitions: seeded.phaseDefinitions,
      activities: seeded.activities,
      activityMatrix: seeded.taskMatrix,
      taskMatrix: seeded.taskMatrix,
      owner,
      createdBy: owner,
      projectManager: owner,
      projectTypeId,
      risks: [],
      budgetSummary: {
        initial: 0,
        engaged: 0,
        spent: 0,
        forecast: 0,
        currency: '€',
      },
      budgetLines: [],
    };

    this.isCreatingProject = true;
    this.createProjectError = null;
    try {
      await this.projectData.saveProject(payload);
      await this.loadProjectsFromApi();
      this.isCreateModalOpen = false;
      await this.router.navigate(['/project', projectId]);
    } catch (e) {
      console.error('[ProjectsPage] submitCreateProject error', e);
      this.createProjectError = "Impossible de créer le projet pour l'instant.";
    } finally {
      this.isCreatingProject = false;
      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
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

  async onDelete(project: ProjectListItem): Promise<void> {
    const id = String(project?.id ?? '').trim();
    if (!id) return;
    this.deleteTargetProject = project;
    this.deleteProjectError = null;
    this.isDeleteModalOpen = true;
  }

  closeDeleteProjectModal(): void {
    if (this.isDeletingProject) return;
    this.isDeleteModalOpen = false;
    this.deleteProjectError = null;
    this.deleteTargetProject = null;
  }

  closeSuccessModal(): void {
    this.isSuccessModalOpen = false;
    this.successTitle = '';
    this.successMessage = '';
  }

  getDeleteProjectMessage(): string {
    const name = this.deleteTargetProject?.name ?? 'ce projet';
    return `Vous êtes sur le point de supprimer définitivement "${name}". Cette action est irréversible et effacera toutes les données liées en base.`;
  }

  async confirmDeleteProject(): Promise<void> {
    const id = String(this.deleteTargetProject?.id ?? '').trim();
    if (!id) return;

    this.isDeletingProject = true;
    this.deleteProjectError = null;
    let deleted = false;
    try {
      await this.projectData.deleteProject(id);
      this.projects = this.projects.filter((p) => p.id !== id);
      await this.loadProjectsFromApi();
      deleted = true;
      this.successTitle = 'Suppression terminée';
      this.successMessage = 'Le projet a été supprimé définitivement avec succès.';
      this.isSuccessModalOpen = true;
    } catch (e) {
      console.error('[ProjectsPage] confirmDeleteProject error', e);
      this.deleteProjectError = "Impossible de supprimer le projet pour l'instant.";
    } finally {
      this.isDeletingProject = false;
      if (deleted) {
        this.closeDeleteProjectModal();
      }
      if (!this.destroyed) this.cdr.detectChanges();
    }
  }

  private async loadProjectTypesForCreation(): Promise<void> {
    this.isLoadingProjectTypes = true;
    try {
      const rows = await this.projectData.listProjectTypes();
      this.projectTypeOptions = rows;
      if (!this.createProjectForm.projectTypeId && rows.length === 1) {
        this.createProjectForm.projectTypeId = rows[0].id;
      }
    } catch (e) {
      console.error('[ProjectsPage] loadProjectTypesForCreation error', e);
      this.projectTypeOptions = [];
      this.createProjectError = "Impossible de charger la liste des projets types.";
    } finally {
      this.isLoadingProjectTypes = false;
      if (!this.destroyed) this.cdr.detectChanges();
    }
  }

  private buildProjectSeedFromType(defaults: ProjectTypeDefaults, owner: string): {
    phases: PhaseId[];
    phaseDefinitions: NonNullable<ProjectDetail['phaseDefinitions']>;
    activities: ProjectDetail['activities'];
    taskMatrix: ProjectDetail['taskMatrix'];
  } | null {
    const phases = defaults.phases
      .map((p) => String(p.id ?? '').trim())
      .filter((id): id is PhaseId => !!id);
    const activitiesRaw = defaults.activities
      .map((a) => ({
        id: String(a.id ?? '').trim() as ActivityId,
        label: String(a.label ?? '').trim(),
        sequence: a.sequence ?? null,
      }))
      .filter((a) => !!a.id);

    if (!phases.length || !activitiesRaw.length) return null;

    const activities = {} as ProjectDetail['activities'];
    const phaseDefinitions = {} as NonNullable<ProjectDetail['phaseDefinitions']>;
    const taskMatrix = {} as ProjectDetail['taskMatrix'];

    for (const p of defaults.phases) {
      const phaseId = String(p.id ?? '').trim() as PhaseId;
      if (!phaseId) continue;
      phaseDefinitions[phaseId] = {
        id: phaseId,
        label: String(p.label ?? phaseId).trim() || phaseId,
        startDate: '',
        endDate: '',
      };
    }

    for (const a of activitiesRaw) {
      const aid = a.id as ActivityId;
      activities[aid] = {
        id: aid,
        label: a.label || aid,
        owner,
        sequence: a.sequence ?? null,
      };
      taskMatrix[aid] = {} as Record<PhaseId, any[]>;
      for (const ph of phases) {
        taskMatrix[aid][ph] = [];
      }
    }

    const uniqueByCell = new Set<string>();
    const defaultsActivities = Array.isArray(defaults.activitiesDefault) && defaults.activitiesDefault.length
      ? defaults.activitiesDefault
      : defaults.tasks;
    for (const t of defaultsActivities) {
      const aid = t.activityId as ActivityId;
      const ph = t.phaseId as PhaseId;
      if (!taskMatrix[aid] || !Array.isArray(taskMatrix[aid][ph])) continue;
      const taskId = t.id || `${aid}-${ph}-${taskMatrix[aid][ph].length + 1}`;
      const cellKey = `${aid}|${ph}|${taskId}`;
      if (uniqueByCell.has(cellKey)) continue;
      uniqueByCell.add(cellKey);
      taskMatrix[aid][ph].push({
        id: taskId,
        label: t.label || taskId,
        status: 'todo',
        phase: ph,
      });
    }

    return { phases, phaseDefinitions, activities, taskMatrix };
  }
}
