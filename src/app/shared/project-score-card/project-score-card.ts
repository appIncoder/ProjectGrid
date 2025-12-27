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
} from '../../models/project-models';

import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-project-score-card',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule],
  templateUrl: './project-score-card.html',
})
export class ProjectScorecard implements OnChanges {
  @Input() project: ProjectDetail | null = null;

  taskStatusOptions: { value: ActivityStatus; label: string }[] = [
    { value: 'done',       label: 'Fait (vert)' },
    { value: 'todo',       label: 'À faire (blanc)' },
    { value: 'inprogress', label: 'En cours (orange)' },
    { value: 'notdone',    label: 'Non fait (rouge)' },
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

  editError: string | null = null;

  constructor(
    private modalService: NgbModal,
    private projectService: ProjectService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && this.project) {
      // ✅ Seed & cohérence centralisés dans le service
      this.projectService.registerProject(this.project);
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
      case 'done':       return 'status-done';
      case 'todo':       return 'status-todo';
      case 'inprogress': return 'status-inprogress';
      case 'notdone':    return 'status-notdone';
      default:           return 'status-todo';
    }
  }

  getPhaseLabel(phase: PhaseId): string {
    return phase;
  }

  // ---- Modal ----
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

    // ✅ Toute la mutation passe par ProjectService
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
