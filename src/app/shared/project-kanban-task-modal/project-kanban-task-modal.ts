import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppButton } from '../design-system/button/button';

import type { TaskComment } from '../../models';

@Component({
  selector: 'app-project-kanban-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AppButton],
  templateUrl: './project-kanban-task-modal.html',
  styleUrls: ['./project-kanban-task-modal.scss'],
})
export class ProjectKanbanTaskModal {
  @Input() open = false;
  @Input() isSaving = false;
  @Input() error: string | null = null;
  @Input() title = 'Modifier la tache';
  @Input() detailsReadonly = false;

  @Input() taskName = '';
  @Input() parentId = '';
  @Input() parentOptions: Array<{ id: string; label: string }> = [];
  @Input() comments: TaskComment[] = [];
  @Input() newCommentText = '';

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() taskNameChange = new EventEmitter<string>();
  @Output() parentIdChange = new EventEmitter<string>();
  @Output() newCommentTextChange = new EventEmitter<string>();

  get primaryActionLabel(): string {
    return this.detailsReadonly ? 'Ajouter le commentaire' : 'Enregistrer';
  }

  onClose(): void {
    if (this.isSaving) return;
    this.close.emit();
  }
}
