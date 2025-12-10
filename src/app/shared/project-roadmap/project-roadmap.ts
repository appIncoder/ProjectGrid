import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  ActivityId,
  GanttActivityRow,
  GanttLinkView,
  GanttPhaseBand,
  GanttTaskView,
  PhaseId,
  ProjectDetail,
  Task,
} from '../../models/project-models';

@Component({
  selector: 'app-project-roadmap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-roadmap.html',
})
export class ProjectRoadmap implements OnInit, OnChanges {
  @Input() project: ProjectDetail | null = null;

  readonly ganttMonthsCount = 6;

  readonly ganttColWidth = 140;
  readonly ganttRowHeight = 32;
  readonly ganttLeftOffset = 150;
  readonly ganttTopOffset = 70;

  ganttStartDate: Date | null = null;

  ganttMonths: string[] = [];
  ganttPhaseBands: GanttPhaseBand[] = [];
  ganttMilestones: { label: string; monthIndex: number }[] = [];

  ganttActivityRows: GanttActivityRow[] = [];
  ganttTasksView: GanttTaskView[] = [];
  ganttLinksView: GanttLinkView[] = [];
  svgWidth = 0;
  svgHeight = 0;

  phaseToMonthIndex: Record<PhaseId, number> = {
    Phase1: 0,
    Phase2: 1,
    Phase3: 2,
    Phase4: 3,
    Phase5: 4,
    Phase6: 5,
  };

  ganttDependencies: { fromId: string; toId: string }[] = [
    { fromId: 'p1-1', toId: 'p2-1' },
    { fromId: 'p2-1', toId: 'p3-1' },
    { fromId: 'm2-1', toId: 'm3-1' },
    { fromId: 't2-1', toId: 't3-1' },
  ];

  draggingTask: GanttTaskView | null = null;
  dragStartClientX = 0;
  dragStartTaskX = 0;

  ngOnInit(): void {
    this.buildGanttCalendar();
    this.buildRoadmap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && !changes['project'].firstChange) {
      this.buildRoadmap();
    }
  }

private buildGanttCalendar(): void {
  const now = new Date();

  // Début de la période Gantt = 1er jour du mois courant
  this.ganttStartDate = new Date(now.getFullYear(), now.getMonth(), 1);

  this.ganttMonths = [];

  for (let i = 0; i < this.ganttMonthsCount; i++) {
    const d = new Date(this.ganttStartDate.getFullYear(), this.ganttStartDate.getMonth() + i, 1);
    this.ganttMonths.push(
      d.toLocaleString('fr-BE', { month: 'short' }) // janv., févr., ...
    );
  }

  this.ganttPhaseBands = [
    { id: 'Phase1', label: 'Phase 1', startMonthIndex: 0, endMonthIndex: 0 },
    { id: 'Phase2', label: 'Phase 2', startMonthIndex: 1, endMonthIndex: 1 },
    { id: 'Phase3', label: 'Phase 3', startMonthIndex: 2, endMonthIndex: 3 },
    { id: 'Phase4', label: 'Phase 4', startMonthIndex: 3, endMonthIndex: 4 },
    { id: 'Phase5', label: 'Phase 5', startMonthIndex: 4, endMonthIndex: 4 },
    { id: 'Phase6', label: 'Phase 6', startMonthIndex: 5, endMonthIndex: 5 },
  ];

  this.ganttMilestones = [
    { label: 'Kick-off', monthIndex: 0 },
    { label: 'Pilote',   monthIndex: 2 },
    { label: 'Go live',  monthIndex: 4 },
  ];
}


  private buildRoadmap(): void {
    if (!this.project) {
      this.ganttActivityRows = [];
      this.ganttTasksView = [];
      this.ganttLinksView = [];
      return;
    }

    const flatTasks: {
      task: Task;
      activityId: ActivityId;
      activityLabel: string;
      phase: PhaseId;
    }[] = [];

    const activities = Object.values(this.project.activities);

    for (const activity of activities) {
      for (const phase of this.project.phases) {
        const tasks = this.project.taskMatrix[activity.id]?.[phase] ?? [];
        for (const task of tasks) {
          flatTasks.push({
            task,
            activityId: activity.id,
            activityLabel: activity.label,
            phase,
          });
        }
      }
    }

    this.ganttActivityRows = flatTasks.map((t, index) => ({
      activityId: t.activityId,
      label: t.activityLabel,
      rowIndex: index,
    }));

    this.ganttTasksView = flatTasks.map((t, index) => {
      const monthIndex = this.phaseToMonthIndex[t.phase] ?? 0;
      const x = this.ganttLeftOffset + monthIndex * this.ganttColWidth + 10;
      const y = this.ganttTopOffset + index * this.ganttRowHeight + 6;
      const width = this.ganttColWidth - 20;
      const height = this.ganttRowHeight - 12;

      return {
        id: t.task.id,
        label: t.task.label,
        activityId: t.activityId,
        phase: t.phase,
        rowIndex: index,
        monthIndex,
        x,
        y,
        width,
        height,
      };
    });

    this.svgWidth = this.ganttLeftOffset + this.ganttMonthsCount * this.ganttColWidth + 40;
    this.svgHeight = this.ganttTopOffset + this.ganttActivityRows.length * this.ganttRowHeight + 40;

    this.updateGanttLinks();
  }

  private updateGanttLinks(): void {
    const links: GanttLinkView[] = [];

    for (const dep of this.ganttDependencies) {
      const from = this.ganttTasksView.find(t => t.id === dep.fromId);
      const to = this.ganttTasksView.find(t => t.id === dep.toId);
      if (!from || !to) continue;

      const startX = from.x + from.width;
      const startY = from.y + from.height / 2;
      const endX = to.x;
      const endY = to.y + to.height / 2;
      const midX = startX + 15;

      const path = `M ${startX} ${startY}
                    L ${midX} ${startY}
                    L ${midX} ${endY}
                    L ${endX} ${endY}`;

      links.push({
        fromId: dep.fromId,
        toId: dep.toId,
        path,
      });
    }

    this.ganttLinksView = links;
  }

  // ---- drag & drop des barres Gantt ----

  onGanttBarMouseDown(event: MouseEvent, task: GanttTaskView): void {
    this.draggingTask = task;
    this.dragStartClientX = event.clientX;
    this.dragStartTaskX = task.x;
    event.stopPropagation();
    event.preventDefault();
  }

  onGanttMouseMove(event: MouseEvent): void {
    if (!this.draggingTask) return;
    const dx = event.clientX - this.dragStartClientX;
    this.draggingTask.x = this.dragStartTaskX + dx;
  }

  onGanttMouseUp(event: MouseEvent): void {
    if (!this.draggingTask) return;

    const centerX = this.draggingTask.x + this.draggingTask.width / 2;
    let monthIndex = Math.round((centerX - this.ganttLeftOffset) / this.ganttColWidth);
    monthIndex = Math.max(0, Math.min(this.ganttMonthsCount - 1, monthIndex));

    this.draggingTask.monthIndex = monthIndex;
    this.draggingTask.x = this.ganttLeftOffset + monthIndex * this.ganttColWidth + 10;

    this.updateGanttLinks();
    this.draggingTask = null;
  }

private getMonthStartDate(monthIndex: number): Date | null {
  if (!this.ganttStartDate) return null;
  return new Date(
    this.ganttStartDate.getFullYear(),
    this.ganttStartDate.getMonth() + monthIndex,
    1
  );
}

private getMonthEndDate(monthIndex: number): Date | null {
  if (!this.ganttStartDate) return null;
  // Jour 0 du mois suivant = dernier jour du mois courant
  return new Date(
    this.ganttStartDate.getFullYear(),
    this.ganttStartDate.getMonth() + monthIndex + 1,
    0
  );
}
getTaskStartLabel(task: GanttTaskView): string {
  const d = this.getMonthStartDate(task.monthIndex);
  if (!d) return '';
  return d.toLocaleDateString('fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

getTaskEndLabel(task: GanttTaskView): string {
  const d = this.getMonthEndDate(task.monthIndex);
  if (!d) return '';
  return d.toLocaleDateString('fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}


}
