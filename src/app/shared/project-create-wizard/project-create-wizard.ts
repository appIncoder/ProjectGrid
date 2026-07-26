import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ProjectDataService, type ProjectTypeRef } from '../../services/project-data.service';
import { AuthService } from '../../services/auth.service';
import { DEFAULT_WORKFLOW } from '../../services/project-type-fallbacks';
import { DEFAULT_PROJECT_SETTINGS, type PhaseId, type ProjectDetail, type ProjectRole, type UserRef } from '../../models';
import { AppButton } from '../design-system/button/button';

type WizardStep = 1 | 2 | 3;
type FrameworkMode = 'framework' | 'blank';
type ManagerRole = 'businessManager' | 'changeManager' | 'technologyManager';

interface WizardManagerRow {
  userId: string;
  label: string;
  role: ManagerRole;
}

interface WizardRiskRow {
  title: string;
  description: string;
  probability: string;
  criticity: string;
}

const MANAGER_ROLE_OPTIONS: Array<{ value: ManagerRole; label: string }> = [
  { value: 'businessManager', label: 'Manager du volet Métier' },
  { value: 'changeManager', label: 'Manager du volet Changement' },
  { value: 'technologyManager', label: 'Manager du volet Technologie' },
];

const RISK_PROBABILITY_LEVELS = ['Très faible', 'Faible', 'Moyenne', 'Élevée', 'Très élevée'];
const RISK_CRITICITY_LEVELS: Array<{ value: string; label: string }> = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Élevée' },
  { value: 'critical', label: 'Critique' },
];

@Component({
  selector: 'app-project-create-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, AppButton],
  templateUrl: './project-create-wizard.html',
  styleUrls: ['./project-create-wizard.scss'],
})
export class ProjectCreateWizard implements OnChanges {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  readonly steps: Array<{ id: WizardStep; label: string }> = [
    { id: 1, label: 'Cadrage' },
    { id: 2, label: 'Équipe' },
    { id: 3, label: 'Risques' },
  ];

  readonly managerRoleOptions = MANAGER_ROLE_OPTIONS;
  readonly riskProbabilityLevels = RISK_PROBABILITY_LEVELS;
  readonly riskCriticityLevels = RISK_CRITICITY_LEVELS;

  step: WizardStep = 1;

  isLoadingRefData = false;
  projectTypeOptions: ProjectTypeRef[] = [];
  allUsers: UserRef[] = [];

  // Étape 1 — Cadrage
  mode: FrameworkMode = 'blank';
  projectTypeId = '';
  name = '';
  description = '';
  startDate = '';
  step1Error: string | null = null;

  // Étape 2 — Équipe
  managers: WizardManagerRow[] = [];
  addManagerUserId = '';
  addManagerRole: ManagerRole | '' = '';
  step2Error: string | null = null;

  // Étape 3 — Risques
  risks: WizardRiskRow[] = [];
  newRisk: WizardRiskRow = { title: '', description: '', probability: 'Moyenne', criticity: 'medium' };
  step3Error: string | null = null;

  isCreating = false;
  createError: string | null = null;

  constructor(
    private router: Router,
    private projectData: ProjectDataService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.resetWizard();
      void this.loadReferenceData();
    }
  }

  get creatorLabel(): string {
    const user = this.authService.user;
    return String(user?.label ?? user?.username ?? '—').trim() || '—';
  }

  get isRealSysAdmin(): boolean {
    return this.authService.isRealSysAdmin;
  }

  get availableUsersForManager(): UserRef[] {
    const creatorId = String(this.authService.user?.id ?? '').trim();
    const usedIds = new Set(this.managers.map((m) => m.userId));
    return this.allUsers.filter((u) => u.id !== creatorId && !usedIds.has(u.id));
  }

  get availableManagerRoleOptions(): Array<{ value: ManagerRole; label: string }> {
    const usedRoles = new Set(this.managers.map((m) => m.role));
    return this.managerRoleOptions.filter((r) => !usedRoles.has(r.value));
  }

  private resetWizard(): void {
    this.step = 1;
    this.mode = 'blank';
    this.projectTypeId = '';
    this.name = '';
    this.description = '';
    this.startDate = this.todayIso();
    this.step1Error = null;

    this.managers = [];
    this.addManagerUserId = '';
    this.addManagerRole = '';
    this.step2Error = null;

    this.risks = [];
    this.newRisk = { title: '', description: '', probability: 'Moyenne', criticity: 'medium' };
    this.step3Error = null;

    this.isCreating = false;
    this.createError = null;
  }

  private todayIso(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  private async loadReferenceData(): Promise<void> {
    this.isLoadingRefData = true;
    try {
      const [types, users] = await Promise.all([
        this.projectData.listProjectTypes(),
        this.projectData.listUsers(),
      ]);
      this.projectTypeOptions = types;
      this.allUsers = users;
    } catch (e) {
      console.error('[ProjectCreateWizard] loadReferenceData error', e);
      this.projectTypeOptions = [];
      this.allUsers = [];
    } finally {
      this.isLoadingRefData = false;
      this.cdr.detectChanges();
    }
  }

  goToStep(target: WizardStep): void {
    if (target < this.step) this.step = target;
  }

  goNext(): void {
    if (this.step === 1) {
      this.step1Error = null;
      if (!this.name.trim()) {
        this.step1Error = 'Le nom du projet est obligatoire.';
        return;
      }
      if (this.mode === 'framework' && !this.projectTypeId) {
        this.step1Error = 'Sélectionnez un framework ou démarrez à blanc.';
        return;
      }
      if (!this.startDate) {
        this.step1Error = 'La date de début du projet est obligatoire.';
        return;
      }
      this.step = 2;
      return;
    }

    if (this.step === 2) {
      this.step = 3;
      return;
    }
  }

  goBack(): void {
    if (this.step === 2) this.step = 1;
    else if (this.step === 3) this.step = 2;
  }

  cancel(): void {
    if (this.isCreating) return;
    this.open = false;
    this.closed.emit();
  }

  // ── Étape 2 : équipe ──────────────────────────────────────────────────────

  addManager(): void {
    this.step2Error = null;
    if (!this.addManagerUserId) {
      this.step2Error = 'Sélectionnez un utilisateur.';
      return;
    }
    if (!this.addManagerRole) {
      this.step2Error = 'Sélectionnez le volet à manager.';
      return;
    }
    const user = this.allUsers.find((u) => u.id === this.addManagerUserId);
    if (!user) return;

    this.managers = [...this.managers, { userId: user.id, label: user.label, role: this.addManagerRole }];
    this.addManagerUserId = '';
    this.addManagerRole = '';
  }

  removeManager(userId: string): void {
    this.managers = this.managers.filter((m) => m.userId !== userId);
  }

  getManagerRoleLabel(role: ManagerRole): string {
    return this.managerRoleOptions.find((r) => r.value === role)?.label ?? role;
  }

  // ── Étape 3 : risques ─────────────────────────────────────────────────────

  addRisk(): void {
    this.step3Error = null;
    const title = this.newRisk.title.trim();
    if (!title) {
      this.step3Error = 'L’intitulé du risque est obligatoire.';
      return;
    }
    this.risks = [...this.risks, { ...this.newRisk, title }];
    this.newRisk = { title: '', description: '', probability: 'Moyenne', criticity: 'medium' };
  }

  removeRisk(index: number): void {
    this.risks = this.risks.filter((_, i) => i !== index);
  }

  getCriticityLabel(value: string): string {
    return this.riskCriticityLevels.find((c) => c.value === value)?.label ?? value;
  }

  // ── Création finale ───────────────────────────────────────────────────────

  async submitCreate(): Promise<void> {
    if (this.isCreating) return;

    const creatorId = String(this.authService.user?.id ?? '').trim();
    if (!creatorId) {
      this.createError = 'Utilisateur non authentifié.';
      return;
    }

    const name = this.name.trim();
    const description = this.description.trim();
    const owner = this.creatorLabel;

    this.isCreating = true;
    this.createError = null;

    try {
      let seed: {
        phases: PhaseId[];
        phaseDefinitions: NonNullable<ProjectDetail['phaseDefinitions']>;
        activities: ProjectDetail['activities'];
        taskMatrix: ProjectDetail['taskMatrix'];
      } | null;
      let workflow = DEFAULT_WORKFLOW;
      let displayInteractions = DEFAULT_PROJECT_SETTINGS;

      if (this.mode === 'framework') {
        const defaults = await this.projectData.getProjectTypeDefaults(this.projectTypeId);
        if (!defaults) {
          this.createError = 'Impossible de charger les données du framework sélectionné.';
          return;
        }
        seed = this.projectData.buildProjectSeed(defaults, owner);
        if (!seed) {
          this.createError = "Le framework sélectionné n'est pas compatible avec la structure attendue.";
          return;
        }
        workflow = defaults.workflow ?? DEFAULT_WORKFLOW;
        displayInteractions = defaults.displayInteractions ?? DEFAULT_PROJECT_SETTINGS;
      } else {
        seed = this.projectData.buildBlankProjectSeed(owner);
      }

      const firstPhase = seed.phases[0];
      const phaseDefinitions = {
        ...seed.phaseDefinitions,
        ...(firstPhase
          ? { [firstPhase]: { ...seed.phaseDefinitions[firstPhase], startDate: this.startDate } }
          : {}),
      };

      const projectId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `p-${Date.now()}`;

      const memberRoles: Record<string, ProjectRole[]> = {
        [creatorId]: ['projectManager'],
      };
      for (const m of this.managers) {
        memberRoles[m.userId] = [m.role];
      }

      const payload: ProjectDetail & {
        owner?: string;
        createdBy?: string;
        projectManager?: string;
        projectTypeId?: string;
        memberRoles?: Record<string, ProjectRole[]>;
      } = {
        id: projectId,
        name,
        description,
        phases: seed.phases,
        phaseDefinitions,
        activities: seed.activities,
        activityMatrix: seed.taskMatrix,
        taskMatrix: seed.taskMatrix,
        owner,
        createdBy: owner,
        projectManager: owner,
        ...(this.mode === 'framework' ? { projectTypeId: this.projectTypeId } : {}),
        displayInteractions,
        workflow,
        memberRoles,
      };

      await this.projectData.saveProject(payload);

      await this.projectData.setProjectMembers(projectId, [
        { userId: creatorId, label: owner, roles: ['projectManager'] },
        ...this.managers.map((m) => ({ userId: m.userId, label: m.label, roles: [m.role] as ProjectRole[] })),
      ]);

      for (const risk of this.risks) {
        await this.projectData.createProjectRisk(projectId, {
          title: risk.title,
          description: risk.description,
          probability: risk.probability,
          criticity: risk.criticity,
          status: 'Open',
        });
      }

      this.open = false;
      this.closed.emit();
      await this.router.navigate(['/project', projectId]);
    } catch (e) {
      console.error('[ProjectCreateWizard] submitCreate error', e);
      this.createError = "Impossible de créer le projet pour l'instant.";
    } finally {
      this.isCreating = false;
      this.cdr.detectChanges();
    }
  }
}
