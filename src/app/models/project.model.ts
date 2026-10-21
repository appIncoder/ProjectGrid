// project-models.ts
import type { DependencyType } from './gantt.model';
import type { ProjectSettings } from './settings.model';
export type PhaseId = 'Phase1' | 'Phase2' | 'Phase3' | 'Phase4' | 'Phase5' | 'Phase6';
export type ActivityId = 'projet' | 'metier' | 'changement' | 'technologie';

// ── Workflow des statuts ─────────────────────────────────────────────────────
export interface WorkflowStatus {
  id: ActivityStatus;
  label: string;
  sequence: number;
}

export interface ProjectWorkflow {
  statuses: WorkflowStatus[];
}

export type CoreActivityStatus =
  | 'todo'
  | 'inprogress'
  | 'onhold'
  | 'done'
  | 'notdone'
  | 'notapplicable';

export type ActivityStatus = CoreActivityStatus | (string & {});

export const ACTIVITY_STATUS_LABELS: Record<CoreActivityStatus, string> = {
  todo:          'À faire',
  inprogress:    'En cours',
  onhold:        'En attente',
  done:          'Terminé',
  notdone:       'Non fait',
  notapplicable: 'Non applicable',
};

/** Statuts finaux : une activité dans l'un de ces statuts est considérée comme clôturée. */
export const FINAL_ACTIVITY_STATUSES: readonly CoreActivityStatus[] = ['done', 'notdone', 'notapplicable'];

export function isFinalActivityStatus(status: ActivityStatus | null | undefined): boolean {
  return FINAL_ACTIVITY_STATUSES.includes(status as CoreActivityStatus);
}

export const ACTIVITY_STATUS_OPTIONS: { value: ActivityStatus; label: string }[] =
  (Object.keys(ACTIVITY_STATUS_LABELS) as CoreActivityStatus[]).map((value) => ({
    value,
    label: ACTIVITY_STATUS_LABELS[value],
  }));

/** Anciens libellés anglais par défaut (encore présents dans certains workflows stockés). */
const LEGACY_STATUS_LABELS: Record<string, string> = {
  'to do': ACTIVITY_STATUS_LABELS.todo,
  'todo': ACTIVITY_STATUS_LABELS.todo,
  'in progress': ACTIVITY_STATUS_LABELS.inprogress,
  'on hold': ACTIVITY_STATUS_LABELS.onhold,
  'done': ACTIVITY_STATUS_LABELS.done,
  'not done': ACTIVITY_STATUS_LABELS.notdone,
  'n/a': ACTIVITY_STATUS_LABELS.notapplicable,
};

/** Traduit un libellé de statut par défaut resté en anglais ; les libellés personnalisés sont conservés. */
export function localizeStatusLabel(label: string): string {
  return LEGACY_STATUS_LABELS[String(label ?? '').trim().toLowerCase()] ?? label;
}

/** Libellés anglais stockés en base (santé du projet, statuts de risque) → français. */
const STORED_LABEL_TRANSLATIONS: Record<string, string> = {
  'good': 'Bon',
  'average': 'Moyen',
  'bad': 'Mauvais',
  'blocked': 'Bloqué',
  'no known issues': 'Aucun problème connu',
  'non blocking issues to manage': 'Problèmes non bloquants à gérer',
  'severe issues requiring action': 'Problèmes sérieux nécessitant une action',
  'blocking issues requiring immediate action': 'Problèmes bloquants nécessitant une action immédiate',
  'open': 'Ouvert',
  'in progress': 'En cours',
  'on hold': 'En attente',
  'resolved': 'Résolu',
  'closed': 'Fermé',
};

/** Traduit pour l'affichage un libellé anglais connu provenant de la base ; les autres sont conservés. */
export function localizeStoredLabel(label: string | null | undefined): string {
  const raw = String(label ?? '');
  return STORED_LABEL_TRANSLATIONS[raw.trim().toLowerCase()] ?? raw;
}

/** Libellé français d'un statut d'activité (statuts personnalisés : identifiant brut). */
export function getActivityStatusLabel(status: ActivityStatus): string {
  return ACTIVITY_STATUS_LABELS[status as CoreActivityStatus] ?? status;
}




export type ProjectTab = 'scorecard'
                        | 'risks'
                        | 'change'
                        | 'detail_project'
                        | 'detail_business'
                        | 'detail_technology'
                        | 'budget'
                        | 'roadmap'
                        | 'board'
                        | 'ressources';

export interface ItemComment {
  text: string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
}

/** @deprecated Use ItemComment instead */
export type TaskComment = ItemComment;

export type ItemCategory =
  | 'projectManagement'
  | 'businessManagement'
  | 'changeManagement'
  | 'technologyManagement';

/** @deprecated Use ItemCategory instead */
export type TaskCategory = ItemCategory;

export type ItemType = 'epic' | 'story' | 'subtask';

export const ITEM_TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: 'epic', label: 'Épopée' },
  { value: 'story', label: 'Récit' },
  { value: 'subtask', label: 'Sous-tâche' },
];

/* ----- Scorecard / items ----- */
export interface Item {
  id: string;
  label: string;
  status: ActivityStatus;

  // ✅ nouveaux champs
  startDate?: string; // format "YYYY-MM-DD"
  endDate?: string;   // format "YYYY-MM-DD"
  category?: ItemCategory;
  itemType?: ItemType;
  reporterId?: string;
  accountantId?: string;
  responsibleId?: string;
  parentActivityId?: string;
  comments?: ItemComment[];

  // IMPORTANT : un item "vit" dans une phase de la matrice
  phase?: PhaseId;

  // ✅ audit — horodatage + identité de l'auteur de la dernière modification (CRUD)
  updatedAt?: string; // ISO 8601
  updatedByUserId?: string;
  updatedByLabel?: string;
}

/** @deprecated Use Item instead */
export type Task = Item;

export interface ActivityDefinition {
  id: ActivityId;
  label: string;
  owner: string; // responsable du suivi de la thématique
  sequence?: number | null;
}

export interface ProjectHealthItem {
  healthId: string;
  shortName: string;
  longName: string;
  description: string;
  status: string;
  dateCreated: string;
  dateLastUpdated: string;
}

export interface ProjectRiskItem {
  projectId: string;
  riskId: string;
  shortName: string;
  longName: string;
  title: string;
  description: string;
  probability: string;
  criticity: string;
  status: string;
  dateCreated: string;
  dateLastUpdated: string;
  remainingRiskId: string;
  // ✅ audit — identité de l'auteur de la dernière modification (dateLastUpdated fait déjà l'horodatage)
  updatedByUserId?: string;
  updatedByLabel?: string;
}

export interface ProjectMilestone {
  id: string;
  label: string;
  date: string;
}

export interface ProjectPhaseActivityReport {
  id: string;
  phaseId: PhaseId;
  phaseLabel: string;
  nextPhaseId?: PhaseId;
  nextPhaseLabel?: string;
  title: string;
  content: string;
  generatedAt: string;
}


export type ProjectDetail = {
  id: string;
  name: string;
  description: string; // ✅ AJOUT ICI (obligatoire)
  phases: PhaseId[];
  // optional metadata for phases (used by the roadmap)
  phaseDefinitions?: Record<PhaseId, PhaseDefinition>;
  activities: Record<ActivityId, ActivityDefinition>;
  // Canonical backend field
  activityMatrix?: Record<ActivityId, Record<PhaseId, Item[]>>;
  // Legacy frontend field (kept for backward compatibility during migration)
  taskMatrix: Record<ActivityId, Record<PhaseId, Item[]>>;
  // Items fils par activité mère:
  // activity -> phase -> activityId(parent) -> items[]
  projectItemsMatrix?: Record<ActivityId, Record<PhaseId, Record<string, Item[]>>>;
  /** @deprecated Use projectItemsMatrix instead */
  projectTasksMatrix?: Record<ActivityId, Record<PhaseId, Record<string, Item[]>>>;

  // ✅ dépendances Gantt persistées (fake aujourd'hui, API demain)
  ganttDependencies?: Array<{
    fromId: string;
    toId: string;
    type?: DependencyType; // 'F2S' | 'F2F' | 'S2S'
  }>;
  projectHealth?: ProjectHealthItem[];
  projectRisks?: ProjectRiskItem[];
  milestones?: ProjectMilestone[];
  phaseActivityReports?: ProjectPhaseActivityReport[];
  otherResources?: ProjectOtherResource[];
  memberRoles?: Record<string, ProjectRole[]>;
  owner?: string;
  projectManager?: string;
  projectTypeId?: string;
  workflow?: ProjectWorkflow;
  displayInteractions?: ProjectSettings;
};


/* ----- Risques ----- */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskCellItem {
  id: string;
  label: string;
  shortName?: string;
  longName?: string;
  level: RiskLevel;
}

export interface TopRisk {
  id: string;
  shortName: string;
  longName: string;
  title: string;
  impact: string;
  probability: string;
  level: RiskLevel;
  owner: string;
  dueDate: string;
}

export type RiskStatus = 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'RESOLVED' | 'CLOSED';

export type TopRiskExtended = TopRisk & {
  status?: RiskStatus;
  residualRiskId?: string | null;
};

/* ----- Projects (summary) ----- */
export type Health = 'good' | 'warning' | 'critical';
export type ProjectStatus = 'Planifié' | 'En cours' | 'En pause' | 'Clôturé';

export interface ProjectListItem {
  id: string;
  name: string;
  owner: string;
  role: string;
  status: ProjectStatus;
  health: Health;
  healthName?: string;
  currentPhase: string;
  /** % de tâches terminées (done/notapplicable) sur le total du taskMatrix. */
  progressPct?: number;
  /** Tâches todo/inprogress/onhold restantes. */
  activeCount?: number;
  /** Nombre de risques enregistrés sur le projet. */
  riskCount?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  role: string;
  status: string;
  health: Health;
  healthName?: string;
  projectManager: string;
  sponsor: string;
  currentPhase: PhaseId;
  changePractitioner: string;
  businessVisionary: string;
  technicalExpert: string;
  activityMatrix: Record<ActivityId, Record<PhaseId, ActivityStatus>>;
}

/* ----- Budget ----- */
export interface BudgetSummary {
  initial: number;
  engaged: number;
  spent: number;
  forecast: number;
  currency: string;
}

export interface BudgetLine {
  id: string;
  category: string;
  initial: number;
  spent: number;
  forecast: number;
}

export interface PhaseDefinition {
  id: PhaseId;
  label?: string;

  // format ISO "YYYY-MM-DD" (cohérent avec <input type="date">)
  startDate: string;
  endDate: string;

  /** Phase active (en cours). Par défaut, la première phase d'un projet est active. */
  isCurrent?: boolean;
}

export interface UserRef {
  id: string;
  label: string;
  email?: string;
  /** Licence active : l'utilisateur peut se connecter et être ajouté à une équipe projet. */
  hasLicense?: boolean;
}

/**
 * Statut de licence stocké dans users/{uid}.license.status.
 * Les comptes antérieurs à la gestion des licences n'ont pas ce champ : ils sont considérés comme actifs.
 */
export type UserLicenseStatus = 'active' | 'revoked' | 'pending' | 'rejected';

/**
 * 'pending' : demande de compte faite depuis l'écran de connexion, en attente de validation par le super-utilisateur.
 * 'rejected' : demande refusée. Seuls 'active' et l'absence de statut (comptes historiques) autorisent l'accès.
 */
export function isLicenseActive(license: unknown): boolean {
  const status = (license as { status?: unknown } | null | undefined)?.status;
  return status === undefined || status === null || status === 'active';
}

export function toUserLicenseStatus(license: unknown): UserLicenseStatus | null {
  const status = (license as { status?: unknown } | null | undefined)?.status;
  return status === 'active' || status === 'revoked' || status === 'pending' || status === 'rejected'
    ? status
    : null;
}

// ── Rôles projet ────────────────────────────────────────────────────────────
export type ProjectRole =
  | 'projectManager'      // Admin complet du projet
  | 'businessManager'     // CRUD activités "gestion du métier"
  | 'changeManager'       // CRUD activités "gestion du changement"
  | 'technologyManager'   // CRUD activités "gestion de la technologie"
  | 'projectMember'       // CRUD sur les activités/items qui lui sont assignés
  | 'businessMember'      // CRUD sur les items métier assignés
  | 'changeMember'        // CRUD sur les items changement assignés
  | 'technologyMember';   // CRUD sur les items technologie assignés

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  projectManager:    'Chef de projet',
  businessManager:   'Responsable métier',
  changeManager:     'Responsable du changement',
  technologyManager: 'Responsable technologique',
  projectMember:     'Membre projet',
  businessMember:    'Membre métier',
  changeMember:      'Membre changement',
  technologyMember:  'Membre technologie',
};

export type DayOffType = 'holiday' | 'sick' | 'off';

export interface ProjectMember {
  userId: string;
  label: string;
  roles: ProjectRole[];
  /** Disponibilité en % (0–100). Par défaut : 100. */
  availability?: number;
  /** Taux journalier moyen (€/jour). */
  dailyRate?: number;
  /** Jours non travaillés : clé = "YYYY-MM-DD", valeur = type d'absence. */
  dayOffs?: Record<string, DayOffType>;
}

export type ProjectOtherResourceType = 'material' | 'software' | 'service' | 'other';

export interface ProjectOtherResource {
  id: string;
  label: string;
  type: ProjectOtherResourceType;
  quantity?: number | null;
  unit?: string;
  notes?: string;
}
