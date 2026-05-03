import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AppButton } from '../design-system/button/button';

@Component({
  selector: 'app-project-add-task-button',
  standalone: true,
  imports: [CommonModule, AppButton],
  templateUrl: './project-add-task-button.html',
  styleUrls: ['./project-add-task-button.scss'],
})
export class ProjectAddTaskButton {
  @Input() label = 'Ajouter une tache';
  @Input() disabled = false;
  @Output() action = new EventEmitter<void>();
}
