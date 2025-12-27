// project-models.ts

export type PhaseId = 'Phase1' | 'Phase2' | 'Phase3' | 'Phase4' | 'Phase5' | 'Phase6';
export type ActivityId = 'projet' | 'metier' | 'changement' | 'technologie';
export type ActivityStatus = 'done' | 'todo' | 'inprogress' | 'notdone';

export type ProjectTab = 'scorecard' | 'risks' | 'budget' | 'roadmap';

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
  phaseDefinitions?: Record<PhaseId, PhaseDefinition>;

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
  isHeader: boolean;   // ⬅️ nouveau : true = ligne titre, false = ligne détail
}


export interface GanttTaskView {
  id: string;
  label: string;
  activityId: ActivityId;
  phase: PhaseId;
  rowIndex: number;

  // Mois "principal" (utile pour phases / dépendances)
  monthIndex: number;

  // Coordonnées/tailles dans le SVG
  x: number;
  y: number;
  width: number;
  height: number;

  // Pour les calculs de dates et la durée
  startMonthIndex?: number;
  endMonthIndex?: number;

  // Indices de jours relatifs au début de la période Gantt (ganttStartDate)
  // 0 = premier jour du Gantt, 1 = +1 jour, etc.
  startDayIndex?: number;
  endDayIndex?: number;
}


export interface GanttLinkView {
  fromId: string;
  toId: string;
  path: string;
}

export interface GanttPhaseBand {
  id: PhaseId;
  label: string;
  startMonthIndex: number;
  endMonthIndex: number;
}

export type TaskCategory =
  | 'projectManagement'
  | 'businessManagement'
  | 'changeManagement'
  | 'technologyManagement';

/* ----- Scorecard / tâches ----- */
export interface Task {
  id: string;
  label: string;
  status: ActivityStatus;

  // ✅ nouveaux champs
  startDate?: string; // format "YYYY-MM-DD"
  endDate?: string;   // format "YYYY-MM-DD"
  category?: TaskCategory;

  // IMPORTANT : une tâche "vit" dans une phase de la matrice
  phase?: PhaseId;
}

export interface PhaseDefinition {
  id: PhaseId;
  label?: string;

  // format ISO "YYYY-MM-DD" (cohérent avec <input type="date">)
  startDate: string;
  endDate: string;
}
