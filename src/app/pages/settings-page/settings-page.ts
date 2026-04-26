import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormGroup, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import type { PeriodPreset } from '../../models/params.model';
import type { DependencyType, ViewMode } from '../../models/gantt.model';
import type { ActivityStatus, ProjectDetail, ProjectMember, ProjectRole, ProjectWorkflow } from '../../models';
import { DEFAULT_PROJECT_SETTINGS, type ProjectSettings } from '../../models';
import { AuthService } from '../../services/auth.service';
import { ProjectDataService } from '../../services/project-data.service';
import { DEFAULT_WORKFLOW } from '../../services/project-type-fallbacks';
import { ProjectService } from '../../services/project.service';

export const PROJECT_ROLE_OPTIONS: Array<{ value: ProjectRole; label: string; description: string }> = [
  { value: 'projectManager',    label: 'Project Manager',    description: 'Accès admin complet au projet' },
  { value: 'businessManager',   label: 'Business Manager',   description: 'CRUD sur les activités "Gestion du métier"' },
  { value: 'changeManager',     label: 'Change Manager',     description: 'CRUD sur les activités "Gestion du changement"' },
  { value: 'technologyManager', label: 'Technology Manager', description: 'CRUD sur les activités "Gestion de la technologie"' },
  { value: 'projectMember',     label: 'Project Member',     description: 'CRUD sur les activités/tâches qui lui sont assignées' },
  { value: 'businessMember',    label: 'Business Member',    description: 'CRUD sur les tâches métier assignées' },
  { value: 'changeMember',      label: 'Change Member',      description: 'CRUD sur les tâches changement assignées' },
  { value: 'technologyMember',  label: 'Technology Member',  description: 'CRUD sur les tâches technologie assignées' },
];

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './settings-page.html',
  styleUrls: ['./settings-page.scss'],
})
export class SettingsPage implements OnInit, OnDestroy {
  private static readonly SUPER_USER_EMAIL = 'etienne.darquennes@gmail.com';

  // ── Projet sélectionné ───────────────────────────────────────────────────
  projectList: Array<{ id: string; name: string }> = [];
  selectedProjectId = '';
  project: ProjectDetail | null = null;
  isProjectLoading = false;
  projectLoadError: string | null = null;

  // ── Affichage (backend) ──────────────────────────────────────────────────
  form!: FormGroup;
  savedState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

  readonly dependencyType: DependencyType[] = ['F2S', 'F2F', 'S2S'];
  readonly periodPresets: Array<{ value: PeriodPreset; label: string }> = [
    { value: '3m',     label: '3 mois' },
    { value: '6m',     label: '6 mois' },
    { value: '12m',    label: '1 an' },
    { value: 'custom', label: 'Personnalisée' },
  ];
  readonly viewModes: Array<{ value: ViewMode; label: string }> = [
    { value: 'split',       label: 'Split' },
    { value: 'focusLeft',   label: 'Agrandir table' },
    { value: 'focusRight',  label: 'Agrandir Gantt' },
  ];

  // ── Onglets ──────────────────────────────────────────────────────────────
  activeTab: 'project' | 'access' = 'project';

  // ── Membres & rôles (Firestore) ──────────────────────────────────────────
  readonly roleOptions = PROJECT_ROLE_OPTIONS;

  members: ProjectMember[] = [];
  allUsers: Array<{ id: string; label: string }> = [];
  isMembersLoading = false;
  membersError: string | null = null;
  membersSaveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

  addForm = { userId: '', roles: [] as ProjectRole[] };
  addError: string | null = null;
  editingMemberId: string | null = null;
  editingRoles: ProjectRole[] = [];

  private subs = new Subscription();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private dataService: ProjectDataService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      periodPreset:          DEFAULT_PROJECT_SETTINGS.periodPreset as PeriodPreset,
      hoverHintsEnabled:     DEFAULT_PROJECT_SETTINGS.hoverHintsEnabled,
      linkTooltipsEnabled:   DEFAULT_PROJECT_SETTINGS.linkTooltipsEnabled,
      viewMode:              DEFAULT_PROJECT_SETTINGS.viewMode as ViewMode,
      defaultDependencyType: DEFAULT_PROJECT_SETTINGS.defaultDependencyType as DependencyType,
    });

    void this.loadProjectList();

    // Priorité : query param > projet courant ouvert
    this.subs.add(this.route.queryParamMap.subscribe((params) => {
      const idFromParam = params.get('projectId') ?? '';
      const idToUse = idFromParam || this.projectService.currentProjectId || '';
      if (idToUse && idToUse !== this.selectedProjectId) {
        this.selectedProjectId = idToUse;
        void this.onProjectSelected();
      }
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ── Sélection de projet ──────────────────────────────────────────────────

  private async loadProjectList(): Promise<void> {
    try {
      this.projectList = await this.dataService.listProjects();
    } catch {
      this.projectList = [];
    }
  }

  async onProjectSelected(): Promise<void> {
    if (!this.selectedProjectId) {
      this.project = null;
      this.members = [];
      this.form.reset(DEFAULT_PROJECT_SETTINGS);
      return;
    }

    // Sync query param
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { projectId: this.selectedProjectId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.isProjectLoading = true;
    this.projectLoadError = null;
    this.project = null;

    try {
      const p = await this.dataService.getProjectById(this.selectedProjectId) as ProjectDetail | null;
      if (!p) {
        this.projectLoadError = 'Projet introuvable.';
        return;
      }
      this.project = p;
      await this.loadDisplaySettings(p.id);
      this.loadWorkflow();
      void this.loadMembers(p.id);
    } catch (e) {
      console.error('[SettingsPage] onProjectSelected error', e);
      this.projectLoadError = 'Impossible de charger le projet.';
    } finally {
      this.isProjectLoading = false;
      this.cdr.detectChanges();
    }
  }

  goToActiveProject(): void {
    const projectId = String(this.project?.id ?? this.selectedProjectId ?? '').trim();
    if (!projectId) return;

    void this.router.navigate(['/project', projectId]);
  }

  // ── Paramètres d'affichage ───────────────────────────────────────────────

  private async loadDisplaySettings(projectId: string): Promise<void> {
    this.savedState = 'idle';
    const stored = await this.dataService.getProjectDisplayInteractions(projectId);
    this.form.reset({
      periodPreset:          stored.periodPreset,
      hoverHintsEnabled:     stored.hoverHintsEnabled,
      linkTooltipsEnabled:   stored.linkTooltipsEnabled,
      viewMode:              stored.viewMode,
      defaultDependencyType: stored.defaultDependencyType,
    });
    if (this.project) {
      this.project = { ...this.project, displayInteractions: stored };
    }
  }

  async save(): Promise<void> {
    if (!this.project?.id) { this.savedState = 'error'; return; }
    this.savedState = 'saving';
    const v = this.form.getRawValue() as ProjectSettings;
    try {
      const saved = await this.dataService.saveProjectDisplayInteractions(this.project.id, {
      periodPreset:          v.periodPreset,
      hoverHintsEnabled:     v.hoverHintsEnabled,
      linkTooltipsEnabled:   v.linkTooltipsEnabled,
      viewMode:              v.viewMode,
      defaultDependencyType: v.defaultDependencyType,
      });
      this.project = { ...this.project, displayInteractions: saved };
      this.form.reset(saved);
      this.savedState = 'saved';
      setTimeout(() => (this.savedState = 'idle'), 1500);
    } catch (e) {
      console.error('[SettingsPage] save display interactions error', e);
      this.savedState = 'error';
    }
  }

  async resetToDefaults(): Promise<void> {
    if (!this.project?.id) return;

    const defaults = this.project.projectTypeId
      ? await this.dataService.getProjectTypeDefaults(this.project.projectTypeId)
      : null;
    const next = defaults?.displayInteractions ?? DEFAULT_PROJECT_SETTINGS;
    this.form.reset(next);
    await this.save();
  }

  // ── Gestion des membres ──────────────────────────────────────────────────

  private async loadMembers(projectId: string): Promise<void> {
    this.isMembersLoading = true;
    this.membersError = null;
    try {
      const [members, users] = await Promise.all([
        this.dataService.listProjectMembers(projectId),
        this.dataService.listUsers(projectId),
      ]);
      this.members = members;
      this.allUsers = users;
    } catch (e) {
      console.error('[SettingsPage] loadMembers error', e);
      this.membersError = 'Impossible de charger les membres.';
    } finally {
      this.isMembersLoading = false;
      this.cdr.detectChanges();
    }
  }

  get availableUsersForAdd(): Array<{ id: string; label: string }> {
    const existing = new Set(this.members.map((m) => m.userId));
    return this.allUsers.filter((u) => !existing.has(u.id));
  }

  isRoleSelectedForAdd(role: ProjectRole): boolean { return this.addForm.roles.includes(role); }

  toggleRoleForAdd(role: ProjectRole): void {
    const idx = this.addForm.roles.indexOf(role);
    idx >= 0 ? this.addForm.roles.splice(idx, 1) : this.addForm.roles.push(role);
  }

  async addMember(): Promise<void> {
    this.addError = null;
    if (!this.addForm.userId) { this.addError = 'Sélectionnez un utilisateur.'; return; }
    if (!this.addForm.roles.length) { this.addError = 'Attribuez au moins un rôle.'; return; }

    const user = this.allUsers.find((u) => u.id === this.addForm.userId);
    if (!user) return;

    const next = [...this.members, { userId: user.id, label: user.label, roles: [...this.addForm.roles] }];
    await this.persistMembers(next);
    if (this.membersSaveState !== 'error') this.addForm = { userId: '', roles: [] };
  }

  startEditMember(member: ProjectMember): void {
    this.editingMemberId = member.userId;
    this.editingRoles = [...member.roles];
  }

  cancelEditMember(): void { this.editingMemberId = null; this.editingRoles = []; }

  isRoleSelectedForEdit(role: ProjectRole): boolean { return this.editingRoles.includes(role); }

  toggleRoleForEdit(role: ProjectRole): void {
    const idx = this.editingRoles.indexOf(role);
    idx >= 0 ? this.editingRoles.splice(idx, 1) : this.editingRoles.push(role);
  }

  async saveEditMember(): Promise<void> {
    if (!this.editingMemberId || !this.editingRoles.length) return;
    const next = this.members.map((m) =>
      m.userId === this.editingMemberId ? { ...m, roles: [...this.editingRoles] } : m
    );
    await this.persistMembers(next);
    if (this.membersSaveState !== 'error') this.cancelEditMember();
  }

  async removeMember(member: ProjectMember): Promise<void> {
    await this.persistMembers(this.members.filter((m) => m.userId !== member.userId));
  }

  private async persistMembers(next: ProjectMember[]): Promise<void> {
    if (!this.project?.id) return;
    this.membersSaveState = 'saving';
    try {
      await this.dataService.setProjectMembers(this.project.id, next);
      this.members = next;
      this.membersSaveState = 'saved';
      this.cdr.detectChanges();
      setTimeout(() => { this.membersSaveState = 'idle'; this.cdr.detectChanges(); }, 1500);
    } catch (e) {
      console.error('[SettingsPage] persistMembers error', e);
      this.membersSaveState = 'error';
      this.cdr.detectChanges();
    }
  }

  getRoleLabel(role: ProjectRole): string {
    return this.roleOptions.find((r) => r.value === role)?.label ?? role;
  }

  trackByUserId(_: number, m: ProjectMember) { return m.userId; }

  // ── Workflow des statuts ─────────────────────────────────────────────────

  workflowStatuses: Array<{ id: ActivityStatus; label: string; sequence: number }> = [];
  workflowSaveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  workflowError: string | null = null;
  newWorkflowStatusLabel = '';

  private loadWorkflow(): void {
    const wf = (this.project as any)?.workflow as ProjectWorkflow | undefined;
    const statuses = wf?.statuses ?? DEFAULT_WORKFLOW.statuses;
    this.workflowStatuses = statuses
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => ({ id: s.id, label: s.label, sequence: s.sequence }));
  }

  get canManageWorkflow(): boolean {
    const user = this.authService.user;
    if (!user?.id) return false;
    const email = user.username.toLowerCase();
    if (email === SettingsPage.SUPER_USER_EMAIL) return true;
    const ownerEmail = this.project?.owner?.toLowerCase() ?? '';
    const projectManagerEmail = this.project?.projectManager?.toLowerCase() ?? '';
    return email === ownerEmail || email === projectManagerEmail;
  }

  addWorkflowStatus(): void {
    if (!this.canManageWorkflow) return;

    const label = this.newWorkflowStatusLabel.trim();
    if (!label) {
      this.workflowError = 'Le libellé du nouveau statut est obligatoire.';
      return;
    }

    const nextId = this.ensureUniqueWorkflowStatusId(this.slugifyWorkflowStatusId(label));
    this.workflowStatuses = [
      ...this.workflowStatuses,
      { id: nextId, label, sequence: this.workflowStatuses.length + 1 },
    ];
    this.newWorkflowStatusLabel = '';
    this.workflowError = null;
  }

  moveWorkflowStatus(index: number, direction: -1 | 1): void {
    if (!this.canManageWorkflow) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= this.workflowStatuses.length) return;

    const next = this.workflowStatuses.slice();
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    this.workflowStatuses = next.map((status, idx) => ({ ...status, sequence: idx + 1 }));
    this.workflowError = null;
  }

  async saveWorkflow(): Promise<void> {
    if (!this.project?.id) return;
    if (!this.canManageWorkflow) {
      this.workflowError = "Seuls l'owner du projet et le super user peuvent modifier le workflow.";
      this.workflowSaveState = 'error';
      return;
    }

    const statuses = this.workflowStatuses.map((s, i) => ({
      id: this.slugifyWorkflowStatusId(s.id),
      label: s.label.trim() || s.id,
      sequence: i + 1,
    }));

    if (statuses.some((s) => !s.label)) {
      this.workflowError = 'Tous les libellés sont obligatoires.';
      return;
    }

    if (new Set(statuses.map((s) => s.id)).size !== statuses.length) {
      this.workflowError = 'Chaque statut doit avoir un identifiant unique.';
      return;
    }

    this.workflowSaveState = 'saving';
    this.workflowError = null;

    try {
      const workflow: ProjectWorkflow = { statuses };
      await this.dataService.saveProjectWorkflow(this.project.id, workflow);
      (this.project as any).workflow = workflow;
      this.workflowSaveState = 'saved';
      this.cdr.detectChanges();
      setTimeout(() => { this.workflowSaveState = 'idle'; this.cdr.detectChanges(); }, 1500);
    } catch (e) {
      console.error('[SettingsPage] saveWorkflow error', e);
      this.workflowError = "Impossible de sauvegarder le workflow.";
      this.workflowSaveState = 'error';
      this.cdr.detectChanges();
    }
  }

  resetWorkflowToDefault(): void {
    this.workflowStatuses = DEFAULT_WORKFLOW.statuses
      .slice()
      .map((s) => ({ id: s.id, label: s.label, sequence: s.sequence }));
    this.newWorkflowStatusLabel = '';
    this.workflowError = null;
  }

  trackByWorkflowId(_: number, s: { id: string }) { return s.id; }

  private slugifyWorkflowStatusId(value: string): ActivityStatus {
    const normalized = String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return (normalized || 'custom_status') as ActivityStatus;
  }

  private ensureUniqueWorkflowStatusId(baseId: ActivityStatus): ActivityStatus {
    const existingIds = new Set(this.workflowStatuses.map((status) => status.id));
    if (!existingIds.has(baseId)) return baseId;

    let index = 2;
    let nextId = `${baseId}_${index}` as ActivityStatus;
    while (existingIds.has(nextId)) {
      index += 1;
      nextId = `${baseId}_${index}` as ActivityStatus;
    }
    return nextId;
  }
}
