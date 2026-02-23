import { Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { ProjectTaskEditModal } from '../project-task-edit-modal/project-task-edit-modal';
import { TaskHoverTooltip } from '../task-hover-tooltip/task-hover-tooltip';

import {
  ActivityDefinition,
  ActivityId,
  ActivityStatus,
  PhaseId,
  ProjectDetail,
  Task,
  TaskCategory,
  UserRef,
  DependencyType,
  GanttDependency,
  EditableDependencyRow,
} from '../../models';

import { ProjectService } from '../../services/project.service';

// Dependency types are imported from models/gantt.model

@Component({
  selector: 'app-project-score-card',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule, ProjectTaskEditModal, TaskHoverTooltip],
  templateUrl: './project-score-card.html',
  styleUrls: ['./project-score-card.scss'],
})
export class ProjectScorecard implements OnChanges {
  @Input() project: ProjectDetail | null = null;
  @Input() users: UserRef[] = [];
  @ViewChild('scorecardWrap', { static: false }) scorecardWrapRef?: ElementRef<HTMLElement>;

  taskHoverCard: {
    x: number;
    y: number;
    label: string;
    start: string;
    end: string;
    status: string;
  } | null = null;

  taskStatusOptions: { value: ActivityStatus; label: string }[] = [
    { value: 'todo',          label: 'À faire (blanc)' },
    { value: 'inprogress',    label: 'En cours (orange)' },
    { value: 'onhold',        label: 'En attente (bleu)' },
    { value: 'done',          label: 'Fait (vert)' },
    { value: 'notdone',       label: 'Non fait (rouge)' },
    { value: 'notapplicable', label: 'Non applicable (gris)' },
  ];

  taskCategoryOptions: { value: TaskCategory; label: string }[] = [
    { value: 'projectManagement',    label: 'Gestion du projet' },
    { value: 'businessManagement',   label: 'Gestion du métier' },
    { value: 'changeManagement',     label: 'Gestion du changement' },
    { value: 'technologyManagement', label: 'Gestion de la technologie' },
  ];

  // ---- Contexte d'édition ----
  private editingActivityId: ActivityId | null = null;
  private editingPhase: PhaseId | null = null;
  private taskBeingEdited: Task | null = null;
  isCreateMode = false;

  editedTaskLabel = '';
  editedTaskStatus: ActivityStatus = 'todo';
  editedStartDate = '';
  editedEndDate = '';
  editedCategory: TaskCategory = 'projectManagement';
  editedPhase: PhaseId | null = null;
  editedReporterId = '';
  editedAccountantId = '';
  editedResponsibleId = '';

  // ✅ Dépendances éditées dans le popup
  editedDependencies: EditableDependencyRow[] = [];

  private draggedTask: {
    taskId: string;
    fromActivityId: ActivityId;
    fromPhase: PhaseId;
  } | null = null;
  private dropTarget: { activityId: ActivityId; phase: PhaseId } | null = null;

  // ✅ Options de type
  dependencyTypeOptions: { value: DependencyType; label: string }[] = [
    { value: 'F2S', label: 'Finish to Start (F2S)' },
    { value: 'F2F', label: 'Finish to Finish (F2F)' },
    { value: 'S2S', label: 'Start to Start (S2S)' },
  ];

  editError: string | null = null;
  contextMenu: {
    x: number;
    y: number;
    activityId: ActivityId;
    phase: PhaseId;
    taskId: string;
    currentStatus: ActivityStatus;
  } | null = null;

  constructor(
    private modalService: NgbModal,
    private projectService: ProjectService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && this.project) {
      // ✅ Seed & cohérence centralisés dans le service
      this.projectService.registerProject(this.project);

      // ✅ Ensure container exists (non destructif)
      this.ensureProjectDependenciesContainer();
    }
  }

  // ---- Data helpers ----
  getActivities(): ActivityDefinition[] {
    if (!this.project) return [];
    return Object.values(this.project.activities).sort((a, b) => {
      const aSeq = Number.isFinite(a.sequence as number) ? Number(a.sequence) : Number.POSITIVE_INFINITY;
      const bSeq = Number.isFinite(b.sequence as number) ? Number(b.sequence) : Number.POSITIVE_INFINITY;
      if (aSeq !== bSeq) return aSeq - bSeq;
      return (a.label ?? '').localeCompare(b.label ?? '', 'fr', { sensitivity: 'base' });
    });
  }

  getPhases(): PhaseId[] {
    return this.project?.phases ?? [];
  }

  getTasks(activityId: ActivityId, phase: PhaseId): Task[] {
    if (!this.project) return [];
    return this.project.taskMatrix[activityId]?.[phase] ?? [];
  }

  getTotalTaskCount(): number {
    if (!this.project) return 0;
    let total = 0;
    for (const activityId of Object.keys(this.project.taskMatrix) as ActivityId[]) {
      const phaseMap = this.project.taskMatrix[activityId] ?? {};
      for (const phaseId of this.project.phases) {
        total += (phaseMap[phaseId] ?? []).length;
      }
    }
    return total;
  }

  getActivityCount(): number {
    return this.getActivities().length;
  }

  getPhaseCount(): number {
    return this.getPhases().length;
  }

  getStatusClass(status: ActivityStatus): string {
    switch (status) {
      case 'done':          return 'status-done';
      case 'todo':          return 'status-todo';
      case 'inprogress':    return 'status-inprogress';
      case 'onhold':        return 'status-onhold';
      case 'notdone':       return 'status-notdone';
      case 'notapplicable': return 'status-notapplicable';
      default:              return 'status-todo';
    }
  }

  getTaskStatusText(status: ActivityStatus): string {
    switch (status) {
      case 'done':
        return 'Done';
      case 'inprogress':
        return 'In progress';
      case 'onhold':
        return 'On hold';
      case 'notdone':
        return 'Not done';
      case 'notapplicable':
        return 'N/A';
      case 'todo':
      default:
        return 'Todo';
    }
  }

  private formatIsoDate(iso?: string): string {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
  }

  showTaskHoverCard(event: MouseEvent, task: Task): void {
    const wrap = this.scorecardWrapRef?.nativeElement;
    const target = event.currentTarget as HTMLElement | null;
    if (!wrap || !target) return;

    const boxW = 280;
    const boxH = 84;
    const margin = 8;

    const wrapRect = wrap.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const scrollLeft = wrap.scrollLeft;
    const scrollTop = wrap.scrollTop;

    const preferredX = targetRect.right - wrapRect.left + scrollLeft + 12;
    const fallbackX = targetRect.left - wrapRect.left + scrollLeft - boxW - 12;
    const minX = scrollLeft + margin;
    const maxX = scrollLeft + wrap.clientWidth - boxW - margin;
    const x = preferredX <= maxX ? preferredX : Math.max(minX, Math.min(maxX, fallbackX));

    const centerY = targetRect.top - wrapRect.top + scrollTop + targetRect.height / 2;
    const minY = scrollTop + margin;
    const maxY = scrollTop + wrap.clientHeight - boxH - margin;
    const y = Math.max(minY, Math.min(maxY, centerY - boxH / 2));

    this.taskHoverCard = {
      x,
      y,
      label: task.label ?? '',
      start: this.formatIsoDate(task.startDate),
      end: this.formatIsoDate(task.endDate),
      status: this.getTaskStatusText(task.status),
    };
  }

  hideTaskHoverCard(): void {
    this.taskHoverCard = null;
  }

  onTaskContextMenu(event: MouseEvent, activityId: ActivityId, phase: PhaseId, task: Task): void {
    event.preventDefault();
    event.stopPropagation();

    const wrap = this.scorecardWrapRef?.nativeElement;
    if (!wrap) return;

    const wrapRect = wrap.getBoundingClientRect();
    const scrollLeft = wrap.scrollLeft;
    const scrollTop = wrap.scrollTop;

    const menuW = 220;
    const menuH = 210;
    const margin = 8;

    const rawX = event.clientX - wrapRect.left + scrollLeft;
    const rawY = event.clientY - wrapRect.top + scrollTop;

    const minX = scrollLeft + margin;
    const minY = scrollTop + margin;
    const maxX = scrollLeft + wrap.clientWidth - menuW - margin;
    const maxY = scrollTop + wrap.clientHeight - menuH - margin;

    this.contextMenu = {
      x: Math.max(minX, Math.min(maxX, rawX)),
      y: Math.max(minY, Math.min(maxY, rawY)),
      activityId,
      phase,
      taskId: task.id,
      currentStatus: task.status,
    };
  }

  applyQuickStatus(status: ActivityStatus): void {
    if (!this.project || !this.contextMenu) return;
    const ctx = this.contextMenu;
    this.projectService.updateTask({
      projectId: this.project.id,
      activityId: ctx.activityId,
      fromPhase: ctx.phase,
      taskId: ctx.taskId,
      status,
    });
    this.closeContextMenu();
  }

  closeContextMenu(): void {
    this.contextMenu = null;
  }

  @HostListener('window:click')
  onWindowClick(): void {
    this.closeContextMenu();
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.closeContextMenu();
  }

  getPhaseLabel(phase: PhaseId): string {
    return phase;
  }

  onTaskDragStart(event: DragEvent, activityId: ActivityId, phase: PhaseId, task: Task): void {
    this.draggedTask = {
      taskId: task.id,
      fromActivityId: activityId,
      fromPhase: phase,
    };
    event.dataTransfer?.setData('text/plain', task.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onTaskDragEnd(): void {
    this.draggedTask = null;
    this.dropTarget = null;
  }

  onTaskDragOver(event: DragEvent, activityId: ActivityId, phase: PhaseId): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dropTarget = { activityId, phase };
  }

  onTaskDragLeave(activityId: ActivityId, phase: PhaseId): void {
    if (this.dropTarget?.activityId === activityId && this.dropTarget?.phase === phase) {
      this.dropTarget = null;
    }
  }

  onTaskDrop(event: DragEvent, toActivityId: ActivityId, toPhase: PhaseId): void {
    event.preventDefault();
    this.dropTarget = null;
    if (!this.project || !this.draggedTask) return;

    const { taskId, fromActivityId, fromPhase } = this.draggedTask;
    this.draggedTask = null;

    if (fromActivityId === toActivityId && fromPhase === toPhase) return;

    this.projectService.updateTask({
      projectId: this.project.id,
      activityId: fromActivityId,
      toActivityId,
      fromPhase,
      toPhase,
      taskId,
      phase: toPhase,
      category: this.mapActivityToCategory(toActivityId),
    });
  }

  isDropTarget(activityId: ActivityId, phase: PhaseId): boolean {
    return this.dropTarget?.activityId === activityId && this.dropTarget?.phase === phase;
  }

  private mapActivityToCategory(activityId: ActivityId): TaskCategory {
    switch (activityId) {
      case 'projet':
        return 'projectManagement';
      case 'metier':
        return 'businessManagement';
      case 'changement':
        return 'changeManagement';
      case 'technologie':
      default:
        return 'technologyManagement';
    }
  }

  // =======================
  // ✅ Dépendances: stockage sur le project
  // =======================

  private ensureProjectDependenciesContainer(): void {
    if (!this.project) return;
    const anyProj = this.project as any;
    if (!Array.isArray(anyProj.ganttDependencies)) anyProj.ganttDependencies = [];
  }

  private getProjectDependencies(): GanttDependency[] {
    if (!this.project) return [];
    const anyProj = this.project as any;
    return (Array.isArray(anyProj.ganttDependencies) ? anyProj.ganttDependencies : []) as GanttDependency[];
  }

  private setProjectDependencies(next: GanttDependency[]): void {
    if (!this.project) return;
    const anyProj = this.project as any;
    anyProj.ganttDependencies = next;
  }

  // ✅ Liste des tâches (pour select "activité liée")
  getAllTasksFlat(): Task[] {
    if (!this.project) return [];
    const out: Task[] = [];
    for (const act of Object.keys(this.project.taskMatrix) as ActivityId[]) {
      const byPhase = this.project.taskMatrix[act];
      for (const ph of this.project.phases) {
        const tasks = byPhase?.[ph] ?? [];
        for (const t of tasks) out.push(t);
      }
    }
    return out;
  }

  // ✅ Options (sans la tâche courante)
  getLinkableTasks(): Task[] {
    const all = this.getAllTasksFlat();
    const curId = this.taskBeingEdited?.id;
    return all.filter(t => t.id !== curId);
  }

  addDependencyRow(): void {
    // défaut: F2S + aucune cible
    this.editedDependencies.push({ toId: '', type: 'F2S' });
  }

  removeDependencyRow(index: number): void {
    this.editedDependencies.splice(index, 1);
  }

  // =======================
  // ---- Modal ----
  // =======================

  openTaskEditModal(
    content: TemplateRef<any>,
    activityId: ActivityId,
    phase: PhaseId,
    task: Task
  ): void {
    if (!this.project) return;

    this.taskBeingEdited = task;
    this.isCreateMode = false;
    this.editingActivityId = activityId;
    this.editingPhase = phase;

    this.editedTaskLabel = task.label ?? '';
    this.editedTaskStatus = task.status;

    this.editedStartDate = task.startDate ?? '';
    this.editedEndDate = task.endDate ?? '';

    this.editedCategory = task.category ?? 'projectManagement';
    this.editedPhase = task.phase ?? phase;
    this.editedReporterId = task.reporterId ?? '';
    this.editedAccountantId = task.accountantId ?? '';
    this.editedResponsibleId = task.responsibleId ?? '';

    // ✅ charge les dépendances existantes pour cette tâche (fromId = task.id)
    this.ensureProjectDependenciesContainer();
    const deps = this.getProjectDependencies().filter(d => d.fromId === task.id);
    this.editedDependencies = deps.map(d => ({
      toId: d.toId,
      type: (d.type ?? 'F2S'),
    }));

    this.editError = null;
    this.modalService.open(content, { size: 'lg', centered: true });
  }

  openCreateTaskModal(content: TemplateRef<any>): void {
    if (!this.project) return;

    const defaultActivityId = this.getActivities()[0]?.id ?? 'projet';
    const defaultPhase = this.getPhases()[0] ?? 'Phase1';

    this.taskBeingEdited = null;
    this.isCreateMode = true;
    this.editingActivityId = defaultActivityId;
    this.editingPhase = defaultPhase;

    this.editedTaskLabel = '';
    this.editedTaskStatus = 'todo';
    this.editedStartDate = '';
    this.editedEndDate = '';
    this.editedCategory = this.mapActivityToCategory(defaultActivityId);
    this.editedPhase = defaultPhase;
    this.editedReporterId = '';
    this.editedAccountantId = '';
    this.editedResponsibleId = '';
    this.editedDependencies = [];
    this.editError = null;

    this.modalService.open(content, { size: 'lg', centered: true });
  }

  private mapCategoryToActivity(category: TaskCategory): ActivityId {
    switch (category) {
      case 'projectManagement':
        return 'projet';
      case 'businessManagement':
        return 'metier';
      case 'changeManagement':
        return 'changement';
      case 'technologyManagement':
      default:
        return 'technologie';
    }
  }

  saveTaskEdit(modal: any): void {
    if (!this.project) {
      modal.dismiss();
      return;
    }

    this.editError = null;

    const label = (this.editedTaskLabel ?? '').trim();
    if (!label) {
      this.editError = "Le nom de l’activité ne peut pas être vide.";
      return;
    }

    if (this.isCreateMode) {
      if (!this.editedPhase) {
        this.editError = 'La phase est obligatoire.';
        return;
      }
      if (!this.editedCategory) {
        this.editError = "Le type d'activité est obligatoire.";
        return;
      }
      if (!this.editedStartDate || !this.editedEndDate) {
        this.editError = 'Les dates de debut et de fin sont obligatoires.';
        return;
      }
    }

    if (this.editedStartDate && this.editedEndDate) {
      const start = new Date(this.editedStartDate);
      const end = new Date(this.editedEndDate);
      if (start.getTime() > end.getTime()) {
        this.editError = "La date de début ne peut pas être après la date de fin.";
        return;
      }
    }

    // =======================
    // ✅ Validation + sauvegarde dépendances
    // =======================
    const curTaskId = this.taskBeingEdited?.id ?? null;
    const linkableIds = new Set(this.getLinkableTasks().map(t => t.id));

    const cleanedRows: EditableDependencyRow[] = (this.editedDependencies ?? [])
      .map(r => ({ toId: (r.toId ?? '').trim(), type: (r.type ?? 'F2S') as DependencyType }))
      .filter(r => !!r.toId); // ignore lignes vides

    // pas de self-link
    if (curTaskId && cleanedRows.some(r => r.toId === curTaskId)) {
      this.editError = "Une activité ne peut pas dépendre d’elle-même.";
      return;
    }

    // cible doit exister
    if (cleanedRows.some(r => !linkableIds.has(r.toId))) {
      this.editError = "Une des activités liées n’existe pas (ou n’est pas sélectionnée).";
      return;
    }

    // pas de doublons (même cible + même type)
    const seen = new Set<string>();
    for (const r of cleanedRows) {
      const key = `${r.type}__${r.toId}`;
      if (seen.has(key)) {
        this.editError = "Il y a des dépendances en double (même type + même activité liée).";
        return;
      }
      seen.add(key);
    }

    // ✅ commit dans project.ganttDependencies
    this.ensureProjectDependenciesContainer();
    if (this.isCreateMode) {
      const targetPhase: PhaseId = this.editedPhase ?? this.editingPhase ?? 'Phase1';
      const activityId = this.mapCategoryToActivity(this.editedCategory);
      const createdTask = this.projectService.createTask({
        projectId: this.project.id,
        activityId,
        phase: targetPhase,
        label,
        status: this.editedTaskStatus,
        startDate: this.editedStartDate,
        endDate: this.editedEndDate,
        category: this.editedCategory,
        reporterId: this.editedReporterId,
        accountantId: this.editedAccountantId,
        responsibleId: this.editedResponsibleId,
      });
      if (!createdTask) {
        this.editError = 'Impossible de creer la tache.';
        return;
      }

      if (cleanedRows.length) {
        const allDeps = this.getProjectDependencies();
        const added: GanttDependency[] = cleanedRows.map((r) => ({
          fromId: createdTask.id,
          toId: r.toId,
          type: r.type,
        }));
        this.setProjectDependencies([...allDeps, ...added]);
      }
    } else {
      if (!this.taskBeingEdited || !this.editingActivityId || !this.editingPhase) {
        modal.dismiss();
        return;
      }

      const allDeps = this.getProjectDependencies();
      const kept = allDeps.filter((d) => d.fromId !== this.taskBeingEdited!.id);
      const added: GanttDependency[] = cleanedRows.map((r) => ({
        fromId: this.taskBeingEdited!.id,
        toId: r.toId,
        type: r.type,
      }));
      this.setProjectDependencies([...kept, ...added]);

      this.projectService.updateTask({
        projectId: this.project.id,
        activityId: this.editingActivityId,
        fromPhase: this.editingPhase,
        toPhase: this.editedPhase || undefined,
        taskId: this.taskBeingEdited.id,
        label,
        status: this.editedTaskStatus,
        startDate: this.editedStartDate,
        endDate: this.editedEndDate,
        category: this.editedCategory,
        reporterId: this.editedReporterId,
        accountantId: this.editedAccountantId,
        responsibleId: this.editedResponsibleId,
        phase: this.editedPhase || undefined,
      });

      this.editingPhase = this.editedPhase;
    }

    modal.close();
  }
}
