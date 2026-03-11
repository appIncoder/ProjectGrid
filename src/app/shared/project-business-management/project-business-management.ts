import { CommonModule } from '@angular/common';
import { Component, Input, NgZone, OnChanges } from '@angular/core';

import { ProjectKanbanTaskModal } from '../project-kanban-task-modal/project-kanban-task-modal';
import { ProjectAddTaskButton } from '../project-add-task-button/project-add-task-button';
import { ProjectDataService } from '../../services/project-data.service';
import type { ActivityStatus, PhaseId, ProjectDetail, Task, TaskComment } from '../../models';

interface ParentActivityLaneVm {
  id: string;
  label: string;
  phase: PhaseId;
  phaseLabel: string;
  tasks: Task[];
  groupedByStatus: Record<ActivityStatus, Task[]>;
}

@Component({
  selector: 'app-project-business-management',
  standalone: true,
  imports: [CommonModule, ProjectKanbanTaskModal, ProjectAddTaskButton],
  templateUrl: './project-business-management.html',
  styleUrls: ['./project-business-management.scss'],
})
export class ProjectBusinessManagement implements OnChanges {
  @Input() project: ProjectDetail | null = null;

  constructor(private projectData: ProjectDataService, private zone: NgZone) {}

  readonly statusColumns: Array<{ id: ActivityStatus; label: string }> = [
    { id: 'todo', label: 'A faire' },
    { id: 'inprogress', label: 'En cours' },
    { id: 'onhold', label: 'En attente' },
    { id: 'done', label: 'Termine' },
    { id: 'notdone', label: 'Non fait' },
    { id: 'notapplicable', label: 'Non applicable' },
  ];

  phaseFilters: Array<{ id: PhaseId; label: string; selected: boolean }> = [];
  filteredLanes: ParentActivityLaneVm[] = [];
  showCurrentPhaseOnly = false;
  currentPhaseId: PhaseId | null = null;
  private savedSelectedPhaseIds: Set<PhaseId> | null = null;
  private allLanes: ParentActivityLaneVm[] = [];
  private hasAppliedDefaultCurrentPhaseFilter = false;
  private draggedTaskCtx: { phase: PhaseId; parentId: string; taskId: string } | null = null;
  private dragOverTarget: { laneId: string; phase: PhaseId; status: ActivityStatus } | null = null;
  isSaving = false;
  saveError: string | null = null;
  modalOpen = false;
  modalError: string | null = null;
  editedTask: Task | null = null;
  editedTaskPhase: PhaseId | null = null;
  editedTaskParentId = '';
  editedTaskName = '';
  newCommentText = '';
  availableParentActivities: Array<{ id: string; label: string }> = [];
  isCreateMode = false;

  ngOnChanges(): void {
    this.rebuild();
  }

  private rebuild(): void {
    this.allLanes = this.buildLanes();
    this.syncPhaseFilters();
    this.currentPhaseId = this.detectCurrentPhase();
    if (!this.hasAppliedDefaultCurrentPhaseFilter) {
      this.activateCurrentPhaseFilterByDefault();
      this.hasAppliedDefaultCurrentPhaseFilter = true;
    }
    this.applyFilters();
  }

  private buildLanes(): ParentActivityLaneVm[] {
    const project = this.project;
    if (!project) return [];

    const phases = project.phases ?? [];
    const matrix = ((project as any).activityMatrix ?? (project as any).taskMatrix) as
      | Record<string, Record<string, Task[]>>
      | undefined;
    const parentRow = matrix?.['metier'] ?? {};
    const childMatrix = ((project as any).projectTasksMatrix?.['metier'] ?? {}) as
      | Record<string, Record<string, Task[]>>
      | undefined;
    const out: ParentActivityLaneVm[] = [];
    for (const phase of phases) {
      const parentActivities = Array.isArray(parentRow[phase]) ? parentRow[phase] : [];
      for (const parent of parentActivities) {
        const parentId = String(parent?.id ?? '').trim();
        if (!parentId) continue;
        const childTasks = childMatrix?.[phase] && Array.isArray(childMatrix[phase][parentId])
          ? childMatrix[phase][parentId]
          : [];

        const tasks = childTasks.length ? childTasks : [parent];
        const groupedByStatus = this.statusColumns.reduce((acc, s) => {
          acc[s.id] = [];
          return acc;
        }, {} as Record<ActivityStatus, Task[]>);
        for (const task of tasks) {
          groupedByStatus[this.normalizeStatus((task as any)?.status)].push(task);
        }

        out.push({
          id: parentId,
          label: String(parent?.label ?? parentId),
          phase,
          phaseLabel: this.getPhaseLabel(phase),
          tasks,
          groupedByStatus,
        });
      }
    }

    return out;
  }

  getColumnTaskCount(status: ActivityStatus): number {
    return this.filteredLanes.reduce((acc, lane) => acc + (lane.groupedByStatus[status]?.length ?? 0), 0);
  }

  trackByPhase(_: number, item: { id: PhaseId }): string {
    return item.id;
  }

  trackByLane(_: number, lane: ParentActivityLaneVm): string {
    return `${lane.phase}:${lane.id}`;
  }

  trackByTask(_: number, task: Task): string {
    return String(task?.id ?? '');
  }

  getStatusClass(status: ActivityStatus): string {
    return `bm-status-${status}`;
  }

  getStatusLabel(status: ActivityStatus): string {
    return this.statusColumns.find((s) => s.id === status)?.label ?? status;
  }

  onTaskDragStart(event: DragEvent, phase: PhaseId, parentId: string, task: Task): void {
    this.draggedTaskCtx = { phase, parentId, taskId: String(task?.id ?? '') };
    event.dataTransfer?.setData('text/plain', this.draggedTaskCtx.taskId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onTaskDragEnd(): void {
    this.draggedTaskCtx = null;
    this.dragOverTarget = null;
  }

  onStatusDragOver(event: DragEvent, lane: ParentActivityLaneVm, targetStatus: ActivityStatus): void {
    event.preventDefault();
    this.dragOverTarget = { laneId: lane.id, phase: lane.phase, status: targetStatus };
  }

  onStatusDragLeave(lane: ParentActivityLaneVm, targetStatus: ActivityStatus): void {
    if (
      this.dragOverTarget?.laneId === lane.id &&
      this.dragOverTarget?.phase === lane.phase &&
      this.dragOverTarget?.status === targetStatus
    ) {
      this.dragOverTarget = null;
    }
  }

  onStatusDrop(event: DragEvent, lane: ParentActivityLaneVm, targetStatus: ActivityStatus): void {
    event.preventDefault();
    this.dragOverTarget = null;
    if (!this.project || !this.draggedTaskCtx) return;
    const dragged = this.draggedTaskCtx;
    this.draggedTaskCtx = null;

    if (lane.phase !== dragged.phase || lane.id !== dragged.parentId) return;

    void this.mutateAndPersist(async () => {
      const taskRef = this.findTaskRef(dragged.phase, dragged.parentId, dragged.taskId);
      if (!taskRef) return;
      taskRef.task.status = targetStatus;
      this.rebuild();
    });
  }

  isDropTarget(lane: ParentActivityLaneVm, status: ActivityStatus): boolean {
    return (
      this.dragOverTarget?.laneId === lane.id &&
      this.dragOverTarget?.phase === lane.phase &&
      this.dragOverTarget?.status === status
    );
  }

  openTaskModal(lane: ParentActivityLaneVm, task: Task): void {
    const taskId = String(task?.id ?? '').trim();
    if (!taskId) return;
    this.modalOpen = true;
    this.modalError = null;
    this.editedTask = task;
    this.editedTaskPhase = lane.phase;
    this.editedTaskParentId = lane.id;
    this.editedTaskName = String(task.label ?? '').trim();
    this.newCommentText = '';
    this.availableParentActivities = this.getParentActivitiesForPhase(lane.phase);
    this.isCreateMode = false;
  }

  openCreateTaskModal(): void {
    if (!this.project) return;
    this.ensureProjectTasksMatrix();
    const phase = this.currentPhaseId ?? this.project.phases?.[0] ?? null;
    if (!phase) return;
    const parents = this.getParentActivitiesForPhase(phase);

    this.modalOpen = true;
    this.modalError = null;
    this.editedTask = null;
    this.editedTaskPhase = phase;
    this.availableParentActivities = parents;
    this.editedTaskParentId = parents[0]?.id ?? '';
    this.editedTaskName = '';
    this.newCommentText = '';
    this.isCreateMode = true;
  }

  closeTaskModal(force = false): void {
    if (this.isSaving && !force) return;
    this.modalOpen = false;
    this.modalError = null;
    this.editedTask = null;
    this.editedTaskPhase = null;
    this.editedTaskParentId = '';
    this.editedTaskName = '';
    this.newCommentText = '';
    this.availableParentActivities = [];
    this.isCreateMode = false;
  }

  getEditedTaskComments(): TaskComment[] {
    return Array.isArray(this.editedTask?.comments) ? this.editedTask!.comments! : [];
  }

  async saveTaskModal(): Promise<void> {
    if (!this.project || !this.editedTaskPhase) return;
    const nextName = this.editedTaskName.trim();
    const nextParentId = this.editedTaskParentId.trim();
    if (!nextName) {
      this.modalError = 'Le nom de la tache est obligatoire.';
      return;
    }
    if (!nextParentId) {
      this.modalError = "L'activite mere est obligatoire.";
      return;
    }

    const phase = this.editedTaskPhase;

    this.modalError = null;
    this.modalOpen = false;
    await this.mutateAndPersist(async () => {
      if (this.isCreateMode) {
        const matrix = this.getProjectTasksMatrix();
        if (!matrix.metier[phase][nextParentId]) matrix.metier[phase][nextParentId] = [];
        const taskId = this.generateTaskId('metier', phase, nextParentId, nextName);
        const created: Task = {
          id: taskId,
          label: nextName,
          status: 'todo',
          parentActivityId: nextParentId,
          comments: [],
        };
        const comment = this.newCommentText.trim();
        if (comment) {
          created.comments!.push({
            text: comment,
            authorName: 'Utilisateur',
            createdAt: new Date().toISOString(),
          });
        }
        matrix.metier[phase][nextParentId].push(created);
        this.rebuild();
        return;
      }

      const taskId = String(this.editedTask?.id ?? '').trim();
      const previousParentId = this.findParentActivityIdForTask(phase, taskId);
      if (!previousParentId) {
        throw new Error('Impossible de retrouver la tache a modifier.');
      }
      const ref = this.findTaskRef(phase, previousParentId, taskId);
      if (!ref) return;
      ref.task.label = nextName;

      const comment = this.newCommentText.trim();
      if (comment) {
        if (!Array.isArray(ref.task.comments)) ref.task.comments = [];
        ref.task.comments.push({
          text: comment,
          authorName: 'Utilisateur',
          createdAt: new Date().toISOString(),
        });
      }

      if (nextParentId !== previousParentId) {
        const matrix = this.getProjectTasksMatrix();
        if (!matrix.metier[phase][nextParentId]) matrix.metier[phase][nextParentId] = [];
        const moved = ref.task;
        ref.list.splice(ref.index, 1);
        moved.parentActivityId = nextParentId;
        matrix.metier[phase][nextParentId].push(moved);
      }

      this.rebuild();
    }, true);
  }

  private getPhaseLabel(phase: PhaseId): string {
    const defs = (this.project as any)?.phaseDefinitions;
    const fromDefinitions = String(defs?.[phase]?.label ?? '').trim();
    return fromDefinitions || String(phase);
  }

  togglePhase(phase: PhaseId): void {
    if (this.showCurrentPhaseOnly) return;
    const target = this.phaseFilters.find((f) => f.id === phase);
    if (!target) return;
    target.selected = !target.selected;
    this.applyFilters();
  }

  toggleCurrentPhaseFilter(): void {
    if (!this.showCurrentPhaseOnly) {
      this.savedSelectedPhaseIds = new Set(
        this.phaseFilters.filter((f) => f.selected).map((f) => f.id)
      );
      this.showCurrentPhaseOnly = true;
      this.phaseFilters = this.phaseFilters.map((f) => ({
        ...f,
        selected: f.id === this.currentPhaseId,
      }));
      this.applyFilters();
      return;
    }

    const saved = this.savedSelectedPhaseIds;
    this.showCurrentPhaseOnly = false;
    this.phaseFilters = this.phaseFilters.map((f) => ({
      ...f,
      selected: saved ? saved.has(f.id) : true,
    }));
    this.savedSelectedPhaseIds = null;
    this.applyFilters();
  }

  selectAllPhases(): void {
    if (this.showCurrentPhaseOnly) return;
    this.phaseFilters = this.phaseFilters.map((f) => ({ ...f, selected: true }));
    this.applyFilters();
  }

  deselectAllPhases(): void {
    if (this.showCurrentPhaseOnly) return;
    this.phaseFilters = this.phaseFilters.map((f) => ({ ...f, selected: false }));
    this.applyFilters();
  }

  private syncPhaseFilters(): void {
    const phases = (this.project?.phases ?? []) as PhaseId[];
    const existing = new Map(this.phaseFilters.map((f) => [f.id, f.selected]));

    if (this.phaseFilters.length === 0) {
      this.phaseFilters = phases.map((phase) => ({
        id: phase,
        label: this.getPhaseLabel(phase),
        selected: true,
      }));
      return;
    }

    this.phaseFilters = phases.map((phase) => ({
      id: phase,
      label: this.getPhaseLabel(phase),
      selected: existing.has(phase) ? !!existing.get(phase) : true,
    }));
  }

  private detectCurrentPhase(): PhaseId | null {
    const phases = this.project?.phases ?? [];
    for (const phase of phases) {
      const lanes = this.allLanes.filter((lane) => lane.phase === phase);
      if (!lanes.length) continue;
      const hasWorkInProgress = lanes.some((lane) =>
        lane.tasks.some((task) => !this.isDone((task as any)?.status))
      );
      if (hasWorkInProgress) return phase;
    }
    return phases.find((phase) => this.allLanes.some((lane) => lane.phase === phase)) ?? null;
  }

  private activateCurrentPhaseFilterByDefault(): void {
    if (!this.currentPhaseId || !this.phaseFilters.length) return;
    this.savedSelectedPhaseIds = new Set(
      this.phaseFilters.filter((f) => f.selected).map((f) => f.id)
    );
    this.showCurrentPhaseOnly = true;
    this.phaseFilters = this.phaseFilters.map((f) => ({
      ...f,
      selected: f.id === this.currentPhaseId,
    }));
  }

  private applyFilters(): void {
    const selected = new Set(this.phaseFilters.filter((f) => f.selected).map((f) => f.id));
    this.filteredLanes = this.allLanes.filter((lane) => selected.has(lane.phase));
  }

  private isDone(status: string): boolean {
    const s = String(status ?? '').toLowerCase();
    return s === 'done' || s === 'notapplicable';
  }

  private async mutateAndPersist(mutator: () => void | Promise<void>, closeModalOnSuccess = false): Promise<void> {
    if (!this.project) return;
    const backup =
      typeof structuredClone === 'function'
        ? structuredClone(this.project)
        : JSON.parse(JSON.stringify(this.project));

    this.isSaving = true;
    this.saveError = null;
    this.modalError = null;
    try {
      await mutator();
      const snapshot =
        typeof structuredClone === 'function'
          ? structuredClone(this.project)
          : JSON.parse(JSON.stringify(this.project));
      await this.projectData.runProjectProcedure(snapshot.id, 'save_project', { project: snapshot });
      if (closeModalOnSuccess) this.zone.run(() => this.closeTaskModal(true));
    } catch (e: any) {
      const msg = String(e?.error?.detail ?? e?.message ?? "Erreur d'enregistrement");
      this.zone.run(() => {
        this.project = backup;
        this.rebuild();
        this.saveError = msg;
        this.modalError = msg;
      });
    } finally {
      this.zone.run(() => {
        this.isSaving = false;
      });
    }
  }

  private ensureProjectTasksMatrix(): void {
    if (!this.project) return;
    const p: any = this.project;
    if (!p.projectTasksMatrix || typeof p.projectTasksMatrix !== 'object') {
      p.projectTasksMatrix = {};
    }
    if (!p.projectTasksMatrix.metier || typeof p.projectTasksMatrix.metier !== 'object') {
      p.projectTasksMatrix.metier = {};
    }

    const activityMatrix = (p.activityMatrix ?? p.taskMatrix ?? {}) as Record<string, Record<string, Task[]>>;
    const parentRow = activityMatrix?.['metier'] ?? {};
    const phases = Array.isArray(p.phases) ? p.phases : [];

    for (const phase of phases) {
      if (!p.projectTasksMatrix.metier[phase] || typeof p.projectTasksMatrix.metier[phase] !== 'object') {
        p.projectTasksMatrix.metier[phase] = {};
      }
      const parents = Array.isArray(parentRow[phase]) ? parentRow[phase] : [];
      for (const parent of parents) {
        const parentId = String(parent?.id ?? '').trim();
        if (!parentId) continue;
        if (!Array.isArray(p.projectTasksMatrix.metier[phase][parentId])) {
          p.projectTasksMatrix.metier[phase][parentId] = [{ ...parent, parentActivityId: parentId, comments: [] }];
        } else {
          for (const t of p.projectTasksMatrix.metier[phase][parentId]) {
            if (t && typeof t === 'object' && !Array.isArray((t as any).comments)) {
              (t as any).comments = [];
            }
          }
        }
      }
    }
  }

  private getProjectTasksMatrix(): Record<'metier', Record<PhaseId, Record<string, Task[]>>> {
    return ((this.project as any).projectTasksMatrix ?? {}) as Record<'metier', Record<PhaseId, Record<string, Task[]>>>;
  }

  private findTaskRef(phase: PhaseId, parentId: string, taskId: string): { list: Task[]; index: number; task: Task } | null {
    this.ensureProjectTasksMatrix();
    const matrix = this.getProjectTasksMatrix();
    const list = matrix?.metier?.[phase]?.[parentId];
    if (!Array.isArray(list)) return null;
    const index = list.findIndex((t) => String(t?.id ?? '') === taskId);
    if (index < 0) return null;
    return { list, index, task: list[index] };
  }

  private findParentActivityIdForTask(phase: PhaseId, taskId: string): string | null {
    const matrix = this.getProjectTasksMatrix();
    const phaseMap = matrix?.metier?.[phase] ?? {};
    for (const parentId of Object.keys(phaseMap)) {
      const list = phaseMap[parentId];
      if (!Array.isArray(list)) continue;
      if (list.some((t) => String(t?.id ?? '') === taskId)) return parentId;
    }
    return null;
  }

  private getParentActivitiesForPhase(phase: PhaseId): Array<{ id: string; label: string }> {
    const matrix = (((this.project as any)?.activityMatrix ?? (this.project as any)?.taskMatrix ?? {}) as Record<string, Record<string, Task[]>>);
    const parents = Array.isArray(matrix?.['metier']?.[phase]) ? matrix['metier'][phase] : [];
    return parents
      .map((p) => ({ id: String(p?.id ?? '').trim(), label: String(p?.label ?? p?.id ?? '').trim() }))
      .filter((p) => !!p.id);
  }

  private generateTaskId(activityType: string, phase: PhaseId, parentId: string, label: string): string {
    const base = String(label || parentId || 'task')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'task';
    const stamp = Date.now().toString(36);
    return `${activityType}-${phase}-${parentId}-${base}-${stamp}`;
  }

  private normalizeStatus(raw: unknown): ActivityStatus {
    const status = String(raw ?? '').trim().toLowerCase();
    if (status === 'done') return 'done';
    if (status === 'inprogress') return 'inprogress';
    if (status === 'onhold') return 'onhold';
    if (status === 'notdone') return 'notdone';
    if (status === 'notapplicable') return 'notapplicable';
    return 'todo';
  }
}
