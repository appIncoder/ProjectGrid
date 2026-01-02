// project-models.ts

export type PhaseId = 'Phase1' | 'Phase2' | 'Phase3' | 'Phase4' | 'Phase5' | 'Phase6';
export type ActivityId = 'projet' | 'metier' | 'changement' | 'technologie';
  export * from './project.model';
export type ActivityStatus =
  | 'todo'
  | 'inprogress'
  | 'onhold'        // ✅ En attente (Bleu)
  | 'done'
  | 'notdone'
  | 'notapplicable'; // ✅ Non applicable (Gris)




//export type ProjectTab = 'scorecard' | 'risks' | 'budget' | 'roadmap';

/* ----- Scorecard / tâches ----- */
export interface Task {
  id: string;
  label: string;
  status: ActivityStatus; 
}

export interface ActivityDefinition {
  id: ActivityId;
  label: string;
  owner: string; // responsable du suivi de la thématique
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string;

  // ✅ inchangé (utilisé partout)
  phases: PhaseId[];

  // ✅ nouveau : métadonnées des phases
 // phaseDefinitions?: Record<PhaseId, PhaseDefinition>;

  activities: Record<ActivityId, ActivityDefinition>;
  taskMatrix: Record<ActivityId, Record<PhaseId, Task[]>>;
}



/* ----- Risques ----- */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskCellItem {
  id: string;
  label: string;
  level: RiskLevel;
}

export interface TopRisk {
  id: string;
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
  currentPhase: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  role: string;
  status: string;
  health: Health;
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

/* ----- Roadmap / Gantt ----- */
export interface GanttActivityRow {
  activityId: ActivityId;
  label: string;
  rowIndex: number;
  // Compatibility re-export for legacy imports. Prefer importing from './project.model'.
}

