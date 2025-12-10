import { Component, Input, TemplateRef } from '@angular/core';
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
} from '../../models/project-models';

@Component({
  selector: 'app-project-score-card',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule],
  templateUrl: './project-score-card.html',
})
export class ProjectScorecard {
  @Input() project: ProjectDetail | null = null;

  taskStatusOptions: { value: ActivityStatus; label: string }[] = [
    { value: 'done',       label: 'Fait (vert)' },
    { value: 'todo',       label: 'À faire (blanc)' },
    { value: 'inprogress', label: 'En cours (orange)' },
    { value: 'notdone',    label: 'Non fait (rouge)' },
  ];

  taskBeingEdited: Task | null = null;
  editedTaskStatus: ActivityStatus = 'todo';

  constructor(private modalService: NgbModal) {}

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
      case 'done':
        return 'status-done';
      case 'todo':
        return 'status-todo';
      case 'inprogress':
        return 'status-inprogress';
      case 'notdone':
        return 'status-notdone';
      default:
        return 'status-todo';
    }
  }

  getPhaseLabel(phase: PhaseId): string {
    return phase;
  }

  openTaskStatusModal(content: TemplateRef<any>, task: Task): void {
    this.taskBeingEdited = task;
    this.editedTaskStatus = task.status;
    this.modalService.open(content, { size: 'sm', centered: true });
  }

  saveTaskStatus(modal: any): void {
    if (this.taskBeingEdited) {
      this.taskBeingEdited.status = this.editedTaskStatus;
    }
    modal.close();
  }
}
