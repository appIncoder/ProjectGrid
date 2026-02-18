import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type {
  ActivityStatus,
  DependencyType,
  EditableDependencyRow,
  PhaseId,
  Task,
  TaskCategory,
} from '../../models';

@Component({
  selector: 'app-project-task-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-task-edit-modal.html',
  styleUrls: ['./project-task-edit-modal.scss'],
})
export class ProjectTaskEditModal {
  @Input() editError: string | null = null;

  @Input() editedTaskLabel = '';
  @Output() editedTaskLabelChange = new EventEmitter<string>();

  @Input() editedTaskStatus: ActivityStatus = 'todo';
  @Output() editedTaskStatusChange = new EventEmitter<ActivityStatus>();

  @Input() editedStartDate = '';
  @Output() editedStartDateChange = new EventEmitter<string>();

  @Input() editedEndDate = '';
  @Output() editedEndDateChange = new EventEmitter<string>();

  @Input() editedCategory: TaskCategory = 'projectManagement';
  @Output() editedCategoryChange = new EventEmitter<TaskCategory>();

  @Input() editedPhase: PhaseId | null = null;
  @Output() editedPhaseChange = new EventEmitter<PhaseId | null>();

  @Input() taskStatusOptions: { value: ActivityStatus; label: string }[] = [];
  @Input() taskCategoryOptions: { value: TaskCategory; label: string }[] = [];
  @Input() dependencyTypeOptions: { value: DependencyType; label: string }[] = [];

  @Input() phases: PhaseId[] = [];
  @Input() editedDependencies: EditableDependencyRow[] = [];
  @Input() linkableTasks: Task[] = [];

  @Output() addDependency = new EventEmitter<void>();
  @Output() removeDependency = new EventEmitter<number>();

  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
}
