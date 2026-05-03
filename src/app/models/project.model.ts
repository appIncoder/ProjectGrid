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

/* ----- Scorecard / items ----- */
export interface Item {
  id: string;
  label: string;
  status: ActivityStatus;

  // ✅ nouveaux champs
  startDate?: string; // format "YYYY-MM-DD"
  endDate?: string;   // format "YYYY-MM-DD"
  category?: ItemCategory;
  reporterId?: string;
  accountantId?: string;
  responsibleId?: string;
  parentActivityId?: string;
  comments?: ItemComment[];

  // IMPORTANT : un item "vit" dans une phase de la matrice
  phase?: PhaseId;
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
}

export interface ProjectMilestone {
  id: string;
  label: string;
  date: string;
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
