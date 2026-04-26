import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { UserRef } from '../../models';

@Component({
  selector: 'app-task-assignment-popover',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-assignment-popover.html',
  styleUrls: ['./task-assignment-popover.scss'],
})
export class TaskAssignmentPopover {
  @Input() visible = false;
  @Input() x = 0;
  @Input() y = 0;
  @Input() roleLabel = '';
  @Input() selectedUserId = '';
  @Input() users: UserRef[] = [];

  @Output() selectedUserIdChange = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onSelectedUserIdChange(value: string): void {
    this.selectedUserId = value;
    this.selectedUserIdChange.emit(value);
  }
}
