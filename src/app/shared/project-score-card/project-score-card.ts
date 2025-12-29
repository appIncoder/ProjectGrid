import { Component, Input, OnChanges, SimpleChanges, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

import {
  ActivityDefinition,
  ActivityId,
  ActivityStatus,
  PhaseId,
  ProjectDetail,
  Task,
  TaskCategory,
} from '../../models';

import { ProjectService } from '../../services/project.service';

// ✅ Types de dépendances
type DependencyType = 'F2S' | 'F2F' | 'S2S';
type GanttDependency = { fromId: string; toId: string; type?: DependencyType };
type EditableDependencyRow = { toId: string; type: DependencyType };

@Component({
  selector: 'app-project-score-card',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule],
  templateUrl: './project-score-card.html',
})
export class ProjectScorecard implements OnChanges {
  @Input() project: ProjectDetail | null = null;

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

  editedTaskLabel = '';
  editedTaskStatus: ActivityStatus = 'todo';
  editedStartDate = '';
  editedEndDate = '';
  editedCategory: TaskCategory = 'projectManagement';
  editedPhase: PhaseId | null = null;

  // ✅ Dépendances éditées dans le popup
  editedDependencies: EditableDependencyRow[] = [];

  // ✅ Options de type
  dependencyTypeOptions: { value: DependencyType; label: string }[] = [
    { value: 'F2S', label: 'Finish to Start (F2S)' },
    { value: 'F2F', label: 'Finish to Finish (F2F)' },
    { value: 'S2S', label: 'Start to Start (S2S)' },
  ];

  editError: string | null = null;

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
    return Object.values(this.project.activities);
  }

  getPhases(): PhaseId[] {
    return this.project?.phases ?? [];
  }

  getTasks(activityId: ActivityId, phase: PhaseId): Task[] {
    if (!this.project) return [];
    return this.project.taskMatrix[activityId]?.[phase] ?? [];
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

  getPhaseLabel(phase: PhaseId): string {
    return phase;
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

    // ✅ garantit que les dates existent même si Gantt jamais ouvert
    this.projectService.seedMissingTaskDates(this.project.id);

    this.taskBeingEdited = task;
    this.editingActivityId = activityId;
    this.editingPhase = phase;

    this.editedTaskLabel = task.label ?? '';
    this.editedTaskStatus = task.status;

    this.editedStartDate = task.startDate ?? '';
    this.editedEndDate = task.endDate ?? '';

    this.editedCategory = task.category ?? 'projectManagement';
    this.editedPhase = task.phase ?? phase;

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

  saveTaskEdit(modal: any): void {
    if (!this.project || !this.taskBeingEdited || !this.editingActivityId || !this.editingPhase || !this.editedPhase) {
      modal.dismiss();
      return;
    }

    this.editError = null;

    const label = (this.editedTaskLabel ?? '').trim();
    if (!label) {
      this.editError = "Le nom de l’activité ne peut pas être vide.";
      return;
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
    const curTaskId = this.taskBeingEdited.id;
    const linkableIds = new Set(this.getLinkableTasks().map(t => t.id));

    const cleanedRows: EditableDependencyRow[] = (this.editedDependencies ?? [])
      .map(r => ({ toId: (r.toId ?? '').trim(), type: (r.type ?? 'F2S') as DependencyType }))
      .filter(r => !!r.toId); // ignore lignes vides

    // pas de self-link
    if (cleanedRows.some(r => r.toId === curTaskId)) {
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
    const allDeps = this.getProjectDependencies();

    // retire les anciennes deps de cette tâche
    const kept = allDeps.filter(d => d.fromId !== curTaskId);

    // ajoute les nouvelles
    const added: GanttDependency[] = cleanedRows.map(r => ({
      fromId: curTaskId,
      toId: r.toId,
      type: r.type,
    }));

    this.setProjectDependencies([...kept, ...added]);

    // =======================
    // ✅ Toute la mutation "task" passe par ProjectService
    // =======================
    this.projectService.updateTask({
      projectId: this.project.id,
      activityId: this.editingActivityId,
      fromPhase: this.editingPhase,
      toPhase: this.editedPhase,
      taskId: this.taskBeingEdited.id,

      label,
      status: this.editedTaskStatus,
      startDate: this.editedStartDate,
      endDate: this.editedEndDate,
      category: this.editedCategory,
      phase: this.editedPhase,
    });

    // Mise à jour du contexte local (utile si l’utilisateur ré-ouvre direct)
    this.editingPhase = this.editedPhase;

    modal.close();
  }
}
