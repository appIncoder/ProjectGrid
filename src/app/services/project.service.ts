// src/app/services/project.service.ts
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
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
  toActivityId?: ActivityId;

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

export interface CreateTaskPayload {
  projectId: string;
  activityId: ActivityId;
  phase: PhaseId;
  label: string;
  status: ActivityStatus;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  category: TaskCategory;
  reporterId?: string;
  accountantId?: string;
  responsibleId?: string;
}

export interface ProjectMutationEvent {
  type: 'task_updated' | 'schedule_updated' | 'dependencies_updated';
  projectId: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly mutationsSubject = new Subject<ProjectMutationEvent>();

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

  get mutations$(): Observable<ProjectMutationEvent> {
    return this.mutationsSubject.asObservable();
  }

  markProjectMutated(projectId: string, type: ProjectMutationEvent['type'] = 'task_updated'): void {
    if (!projectId) return;
    this.mutationsSubject.next({ type, projectId });
  }

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
    const raw = String(iso ?? '').trim();
    if (!raw) return null;

    // Accept both "YYYY-MM-DD" and full ISO datetime like "YYYY-MM-DDTHH:mm:ss".
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;

    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
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
  createTask(payload: CreateTaskPayload): Task | null {
    const project = this.projects.get(payload.projectId);
    if (!project) return null;

    const matrix = project.taskMatrix as Record<string, Record<string, Task[]>>;
    if (!matrix[payload.activityId]) matrix[payload.activityId] = {};
    if (!Array.isArray(matrix[payload.activityId][payload.phase])) {
      matrix[payload.activityId][payload.phase] = [];
    }

    if (!project.phases.includes(payload.phase)) {
      project.phases.push(payload.phase);
    }

    const taskId = this.generateTaskId(project);
    const task: Task = {
      id: taskId,
      label: payload.label,
      status: payload.status,
      startDate: payload.startDate,
      endDate: payload.endDate,
      category: payload.category,
      phase: payload.phase,
      reporterId: payload.reporterId || undefined,
      accountantId: payload.accountantId || undefined,
      responsibleId: payload.responsibleId || undefined,
    };

    matrix[payload.activityId][payload.phase].push(task);
    this.markProjectMutated(payload.projectId, 'task_updated');
    return task;
  }

  updateTask(payload: UpdateTaskPayload): void {
    const project = this.projects.get(payload.projectId);
    if (!project) return;

    const fromActivityId = payload.activityId;
    const toActivityId = payload.toActivityId ?? payload.activityId;
    const fromRow = project.taskMatrix?.[fromActivityId];
    const toRow = project.taskMatrix?.[toActivityId];
    if (!fromRow || !toRow) return;

    const fromList = fromRow[payload.fromPhase] ?? [];
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
    const targetPhase = payload.toPhase ?? payload.fromPhase;
    const shouldMove = toActivityId !== fromActivityId || targetPhase !== payload.fromPhase;

    if (shouldMove) {
      const toList = toRow[targetPhase] ?? [];

      fromRow[payload.fromPhase] = fromList.filter((t) => t.id !== payload.taskId);

      if (!toList.some((t) => t.id === payload.taskId)) {
        toList.push(task);
      }
      toRow[targetPhase] = toList;

      (task as any).phase = targetPhase;
    } else {
      (task as any).phase = (task as any).phase ?? payload.fromPhase;
    }

    this.mutationsSubject.next({ type: 'task_updated', projectId: payload.projectId });
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
    this.mutationsSubject.next({ type: 'schedule_updated', projectId: params.projectId });
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

  private generateTaskId(project: ProjectDetail): string {
    const taken = new Set<string>();
    const matrix = project.taskMatrix as Record<string, Record<string, Task[]>>;

    for (const activityId of Object.keys(matrix)) {
      const phaseMap = matrix[activityId] ?? {};
      for (const phaseId of Object.keys(phaseMap)) {
        const tasks = phaseMap[phaseId] ?? [];
        for (const task of tasks) {
          if (task?.id) taken.add(task.id);
        }
      }
    }

    const stamp = Date.now().toString(36);
    let n = 1;
    while (true) {
      const candidate = `task-${stamp}-${n}`;
      if (!taken.has(candidate)) return candidate;
      n++;
    }
  }
}
