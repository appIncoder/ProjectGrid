import { Injectable } from '@angular/core';
import {
  ActivityId,
  PhaseId,
  ProjectDetail,
  Task,
  TaskCategory,
  ActivityStatus,
} from '../models/project-models';

export interface ProjectActionPayload {
  projectId: string;
  reason?: string;
}

export interface UpdateTaskPayload {
  projectId: string;
  activityId: ActivityId;
  fromPhase: PhaseId;
  taskId: string;

  label?: string;
  status?: ActivityStatus;
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string;   // "YYYY-MM-DD"
  category?: TaskCategory;
  toPhase?: PhaseId;  // déplacement éventuel
  phase?: PhaseId;    // (optionnel) cohérence
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  // ===== Mini store temporaire (en attendant Firebase)
  private projects = new Map<string, ProjectDetail>();

  // ===== Règles planning centralisées
  readonly daysPerMonth = 30;
  readonly phaseToMonthIndex: Record<PhaseId, number> = {
    Phase1: 0,
    Phase2: 1,
    Phase3: 2,
    Phase4: 3,
    Phase5: 4,
    Phase6: 5,
  };

private ensurePhaseDefinitions(project: ProjectDetail): void {
  if (project.phaseDefinitions) return;

  const ganttStart = this.getDefaultGanttStartDate();

  const defs: Record<PhaseId, any> = {} as any;
  for (const phase of project.phases) {
    const monthIndex = this.phaseToMonthIndex[phase] ?? 0;

    const startDayIndex = monthIndex * this.daysPerMonth;
    const endDayIndex = startDayIndex + (this.daysPerMonth - 1);

    defs[phase] = {
      id: phase,
      label: phase,
      startDate: this.toIsoDate(this.addDays(ganttStart, startDayIndex)),
      endDate: this.toIsoDate(this.addDays(ganttStart, endDayIndex)),
    };
  }

  project.phaseDefinitions = defs;
}


  // -----------------------------
  // Store / registration
  // -----------------------------
  registerProject(project: ProjectDetail): void {
    this.projects.set(project.id, project);
    this.ensurePhaseDefinitions(project);
    this.seedMissingTaskDates(project.id);


    // ✅ important : seed des dates par défaut dès que le projet est disponible
    this.seedMissingTaskDates(project.id);
  }

  getProject(projectId: string): ProjectDetail | undefined {
    return this.projects.get(projectId);
  }

  // -----------------------------
  // Actions (existantes)
  // -----------------------------
  pauseProject(payload: ProjectActionPayload): void {
    console.log('Service: pauseProject', payload);
  }

  archiveProject(payload: ProjectActionPayload): void {
    console.log('Service: archiveProject', payload);
  }

  // -----------------------------
  // Planning utils (source unique)
  // -----------------------------
  getDefaultGanttStartDate(): Date {
    const now = new Date();
    // identique à ProjectRoadmap.buildGanttCalendar()
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  }

  toIsoDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  parseIsoDateToDayIndex(iso: string, ganttStartDate: Date): number | null {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;

    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);

    const start = new Date(
      ganttStartDate.getFullYear(),
      ganttStartDate.getMonth(),
      ganttStartDate.getDate()
    );
    const cur = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

    const diffMs = cur.getTime() - start.getTime();
    return Math.round(diffMs / 86400000);
  }

  computeDefaultTaskDatesForPhase(phase: PhaseId): { startDate: string; endDate: string } {
    const ganttStart = this.getDefaultGanttStartDate();
    const monthIndex = this.phaseToMonthIndex[phase] ?? 0;

    const startDayIndex = monthIndex * this.daysPerMonth;
    const endDayIndex = startDayIndex + (this.daysPerMonth - 1);

    return {
      startDate: this.toIsoDate(this.addDays(ganttStart, startDayIndex)),
      endDate: this.toIsoDate(this.addDays(ganttStart, endDayIndex)),
    };
  }

  // -----------------------------
  // Seed / coherence
  // -----------------------------
  seedMissingTaskDates(projectId: string): void {
    const project = this.projects.get(projectId);
    if (!project) return;

    for (const activityId of Object.keys(project.taskMatrix) as ActivityId[]) {
      const byPhase = project.taskMatrix[activityId];

      for (const phase of project.phases) {
        const tasks = byPhase?.[phase] ?? [];

        for (const task of tasks) {
          // phase cohérente
          if (!task.phase) task.phase = phase;

          // seed dates si manquantes
          if (!task.startDate || !task.endDate) {
            const def = this.computeDefaultTaskDatesForPhase(phase);
            task.startDate = task.startDate ?? def.startDate;
            task.endDate = task.endDate ?? def.endDate;
          }
        }
      }
    }
  }

  // -----------------------------
  // Task CRUD (centralisé)
  // -----------------------------
  updateTask(payload: UpdateTaskPayload): void {
    const project = this.projects.get(payload.projectId);
    if (!project) return;

    const row = project.taskMatrix[payload.activityId];
    if (!row) return;

    const fromList = row[payload.fromPhase] ?? [];
    const task = fromList.find(t => t.id === payload.taskId);
    if (!task) return;

    // MAJ champs
    if (payload.label !== undefined) task.label = payload.label;
    if (payload.status !== undefined) task.status = payload.status;

    if (payload.startDate !== undefined) task.startDate = payload.startDate || undefined;
    if (payload.endDate !== undefined) task.endDate = payload.endDate || undefined;
    if (payload.category !== undefined) task.category = payload.category;

    // Phase explicite (cohérence)
    if (payload.phase !== undefined) task.phase = payload.phase;

    // Déplacement phase (taskMatrix)
    if (payload.toPhase && payload.toPhase !== payload.fromPhase) {
      const toList = row[payload.toPhase] ?? [];

      row[payload.fromPhase] = fromList.filter(t => t.id !== payload.taskId);

      if (!toList.some(t => t.id === payload.taskId)) {
        toList.push(task);
      }
      row[payload.toPhase] = toList;

      task.phase = payload.toPhase;
    } else {
      task.phase = task.phase ?? payload.fromPhase;
    }
  }

  // -----------------------------
  // Gantt -> Task (dates)
  // -----------------------------
syncGanttDayIndexesToTask(params: {
  projectId: string;
  taskId: string;
  ganttStartDate: Date;
  startDayIndex?: number;
  endDayIndex?: number;
}): void {
  const project = this.projects.get(params.projectId);
  if (!project) return;

  const located = this.findTaskById(project, params.taskId);
  if (!located) return;

  const s = params.startDayIndex ?? 0;
  const e = params.endDayIndex ?? s + (this.daysPerMonth - 1);

  const startIso = this.toIsoDate(this.addDays(params.ganttStartDate, s));
  const endIso = this.toIsoDate(this.addDays(params.ganttStartDate, e));

  located.task.startDate = startIso;
  located.task.endDate = endIso;

  // cohérence (utile si tu affiches la phase ailleurs)
  located.task.phase = located.task.phase ?? located.phase;
}


  private findTaskById(project: ProjectDetail, taskId: string): {
  activityId: ActivityId;
  phase: PhaseId;
  task: Task;
} | null {
  for (const activityId of Object.keys(project.taskMatrix) as ActivityId[]) {
    const byPhase = project.taskMatrix[activityId];
    for (const phase of project.phases) {
      const tasks = byPhase?.[phase] ?? [];
      const found = tasks.find(t => t.id === taskId);
      if (found) return { activityId, phase, task: found };
    }
  }
  return null;
}

}
