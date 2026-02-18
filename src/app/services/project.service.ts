// src/app/services/project.service.ts
import { Injectable } from '@angular/core';
import type {
  ActivityId,
  PhaseId,
  ProjectDetail,
  Task,
  TaskCategory,
  ActivityStatus,
} from '../models';

const DEFAULT_PHASES: PhaseId[] = ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'];

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
  endDate?: string; // "YYYY-MM-DD"
  category?: TaskCategory;
  reporterId?: string;
  accountantId?: string;
  responsibleId?: string;

  toPhase?: PhaseId; // déplacement éventuel
  phase?: PhaseId;   // cohérence (optionnel)
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  // Mini store (en attendant un store global / backend temps réel)
  private projects = new Map<string, ProjectDetail>();

  // Règles planning
  readonly daysPerMonth = 30;
  readonly phaseToMonthIndex: Record<PhaseId, number> = {
    Phase1: 0,
    Phase2: 1,
    Phase3: 2,
    Phase4: 3,
    Phase5: 4,
    Phase6: 5,
  };

  // -----------------------------
  // Store / registration
  // -----------------------------
  registerProject(project: ProjectDetail): void {
    if (!project || !project.id) return;

    // ✅ normalisation / cohérence
    this.ensurePhaseDefinitions(project);
    this.seedMissingTaskDates(project);

    // ✅ store
    this.projects.set(project.id, project);
  }

  getProject(projectId: string): ProjectDetail | undefined {
    return this.projects.get(projectId);
  }

  // -----------------------------
  // Actions (placeholders)
  // -----------------------------
  pauseProject(payload: ProjectActionPayload): void {
    console.log('[ProjectService] pauseProject', payload);
  }

  archiveProject(payload: ProjectActionPayload): void {
    console.log('[ProjectService] archiveProject', payload);
  }

  // -----------------------------
  // Planning utils (source unique)
  // -----------------------------
  getDefaultGanttStartDate(): Date {
    const now = new Date();
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
  // Robustesse: phases
  // -----------------------------
  private ensurePhaseDefinitions(project: ProjectDetail): void {
    // 1) phases déjà OK
    if (Array.isArray((project as any).phases) && project.phases.length) return;

    // 2) tenter de reconstruire depuis taskMatrix
    const tm: any = (project as any).taskMatrix;
    if (tm && typeof tm === 'object') {
      const activityIds = Object.keys(tm);
      if (activityIds.length) {
        const firstActivity = tm[activityIds[0]];
        if (firstActivity && typeof firstActivity === 'object') {
          const phaseKeys = Object.keys(firstActivity) as PhaseId[];
          if (phaseKeys.length) {
            project.phases = phaseKeys;
            return;
          }
        }
      }
    }

    // 3) fallback
    project.phases = DEFAULT_PHASES;
  }

  // -----------------------------
  // Seed / cohérence (dates)
  // -----------------------------
  private seedMissingTaskDates(project: ProjectDetail): void {
    const taskMatrix: any = (project as any)?.taskMatrix;
    if (!taskMatrix || typeof taskMatrix !== 'object') return;

    const phases: PhaseId[] =
      Array.isArray(project.phases) && project.phases.length ? project.phases : DEFAULT_PHASES;

    for (const activityId of Object.keys(taskMatrix ?? {})) {
      const phaseMap = taskMatrix?.[activityId];
      if (!phaseMap || typeof phaseMap !== 'object') continue;

      for (const phaseId of phases) {
        const tasks = phaseMap?.[phaseId];
        if (!Array.isArray(tasks)) continue;

        const defaults = this.computeDefaultTaskDatesForPhase(phaseId);

        for (const task of tasks as Task[]) {
          if (!task || typeof task !== 'object') continue;

          // ✅ seed ISO dates si manquantes
          task.startDate = task.startDate ?? defaults.startDate;
          task.endDate = task.endDate ?? defaults.endDate;

          // ✅ cohérence phase (utile dans d’autres vues)
          (task as any).phase = (task as any).phase ?? phaseId;
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

    const row = project.taskMatrix?.[payload.activityId];
    if (!row) return;

    const fromList = row[payload.fromPhase] ?? [];
    const task = fromList.find((t) => t.id === payload.taskId);
    if (!task) return;

    // MAJ champs
    if (payload.label !== undefined) task.label = payload.label;
    if (payload.status !== undefined) task.status = payload.status;

    if (payload.startDate !== undefined) task.startDate = payload.startDate || undefined;
    if (payload.endDate !== undefined) task.endDate = payload.endDate || undefined;

    if (payload.category !== undefined) (task as any).category = payload.category;
    if (payload.reporterId !== undefined) (task as any).reporterId = payload.reporterId || undefined;
    if (payload.accountantId !== undefined) (task as any).accountantId = payload.accountantId || undefined;
    if (payload.responsibleId !== undefined) (task as any).responsibleId = payload.responsibleId || undefined;

    // Phase explicite (cohérence)
    if (payload.phase !== undefined) (task as any).phase = payload.phase;

    // Déplacement phase
    if (payload.toPhase && payload.toPhase !== payload.fromPhase) {
      const toList = row[payload.toPhase] ?? [];

      row[payload.fromPhase] = fromList.filter((t) => t.id !== payload.taskId);

      if (!toList.some((t) => t.id === payload.taskId)) {
        toList.push(task);
      }
      row[payload.toPhase] = toList;

      (task as any).phase = payload.toPhase;
    } else {
      (task as any).phase = (task as any).phase ?? payload.fromPhase;
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

    (located.task as any).phase = (located.task as any).phase ?? located.phase;
  }

  private findTaskById(
    project: ProjectDetail,
    taskId: string
  ): { activityId: ActivityId; phase: PhaseId; task: Task } | null {
    const phases: PhaseId[] =
      Array.isArray(project.phases) && project.phases.length ? project.phases : DEFAULT_PHASES;

    for (const activityId of Object.keys(project.taskMatrix ?? {}) as ActivityId[]) {
      const byPhase = project.taskMatrix[activityId];
      for (const phase of phases) {
        const tasks = byPhase?.[phase] ?? [];
        const found = tasks.find((t) => t.id === taskId);
        if (found) return { activityId, phase, task: found };
      }
    }
    return null;
  }
}
