// project-models.ts
import type { DependencyType } from './gantt.model';
export type PhaseId = 'Phase1' | 'Phase2' | 'Phase3' | 'Phase4' | 'Phase5' | 'Phase6';
export type ActivityId = 'projet' | 'metier' | 'changement' | 'technologie';

export type ActivityStatus =
  | 'todo'
  | 'inprogress'
  | 'onhold'        // ✅ En attente (Bleu)
  | 'done'
  | 'notdone'
  | 'notapplicable'; // ✅ Non applicable (Gris)




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


export type ProjectDetail = {
  id: string;
  name: string;
  description: string; // ✅ AJOUT ICI (obligatoire)
  phases: PhaseId[];
  activities: Record<ActivityId, ActivityDefinition>;
  taskMatrix: Record<ActivityId, Record<PhaseId, Task[]>>;

  // ✅ dépendances Gantt persistées (fake aujourd’hui, API demain)
  ganttDependencies?: Array<{
    fromId: string;
    toId: string;
    type?: DependencyType; // 'F2S' | 'F2F' | 'S2S'
  }>;
};


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
