import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-task-hover-tooltip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-hover-tooltip.html',
  styleUrls: ['./task-hover-tooltip.scss'],
})
export class TaskHoverTooltip {
  @Input() visible = false;
  @Input() x = 0;
  @Input() y = 0;
  @Input() title = '';
  @Input() start = '';
  @Input() end = '';
  @Input() status = '';
}
