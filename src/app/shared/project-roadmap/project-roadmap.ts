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
  styleUrls: ['./project-roadmap.scss'],
})
export class ProjectRoadmap implements OnInit, OnChanges {
  @Input() project: ProjectDetail | null = null;

  readonly ganttMonthsCount = 6;

  readonly ganttColWidth = 140;
  readonly ganttRowHeight = 32;
  readonly ganttLeftOffset = 150;
  readonly ganttTopOffset = 70;

  // approx : 30 jours par "mois" de Gantt
  readonly daysPerMonth = 30;
  readonly taskInnerMargin = 10;

  // largeur en pixels d’un jour sur l’axe du temps
  get dayWidth(): number {
    return this.ganttColWidth / this.daysPerMonth;
  }

  ganttMonths: string[] = [];
  ganttPhaseBands: GanttPhaseBand[] = [];
  ganttMilestones: { label: string; monthIndex: number }[] = [];

  ganttActivityRows: GanttActivityRow[] = [];
  ganttTasksView: GanttTaskView[] = [];
  ganttLinksView: GanttLinkView[] = [];
  svgWidth = 0;
  svgHeight = 0;

  ganttStartDate: Date | null = null;

  phaseToMonthIndex: Record<PhaseId, number> = {
    Phase1: 0,
    Phase2: 1,
    Phase3: 2,
    Phase4: 3,
    Phase5: 4,
    Phase6: 5,
  };

  // Dépendances entre tâches
  ganttDependencies: { fromId: string; toId: string }[] = [
    { fromId: 'p1-1', toId: 'p2-1' },
    { fromId: 'p2-1', toId: 'p3-1' },
    { fromId: 'm2-1', toId: 'm3-1' },
    { fromId: 't2-1', toId: 't3-1' },
  ];

  // Base : toutes les tâches "réelles"
  private baseTasks: {
    task: Task;
    activityId: ActivityId;
    activityLabel: string;
    phase: PhaseId;
  }[] = [];

  // État ouvert/fermé par activité
  activityCollapse: Record<ActivityId, boolean> = {
    projet: false,
    metier: false,
    changement: false,
    technologie: false,
  };

  // Drag & drop
  draggingTask: GanttTaskView | null = null;
  dragStartClientX = 0;
  dragStartTaskX = 0;
  dragHasMoved = false;

  // Hint de date (tooltip SVG)
  hoverHint: { x: number; y: number; text: string } | null = null;

  ngOnInit(): void {
    this.buildGanttCalendar();
    this.buildRoadmap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && !changes['project'].firstChange) {
      this.buildRoadmap();
    }
  }

  // =======================
  //   Calendrier Gantt
  // =======================

  private buildGanttCalendar(): void {
    const now = new Date();

    // Début de la période Gantt = 1er jour du mois courant
    this.ganttStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.ganttMonths = [];

    for (let i = 0; i < this.ganttMonthsCount; i++) {
      const d = new Date(
        this.ganttStartDate.getFullYear(),
        this.ganttStartDate.getMonth() + i,
        1
      );
      this.ganttMonths.push(d.toLocaleString('fr-BE', { month: 'short' }));
    }

    // Phases
    this.ganttPhaseBands = [
      { id: 'Phase1', label: 'Phase 1', startMonthIndex: 0, endMonthIndex: 0 },
      { id: 'Phase2', label: 'Phase 2', startMonthIndex: 1, endMonthIndex: 1 },
      { id: 'Phase3', label: 'Phase 3', startMonthIndex: 2, endMonthIndex: 3 },
      { id: 'Phase4', label: 'Phase 4', startMonthIndex: 3, endMonthIndex: 4 },
      { id: 'Phase5', label: 'Phase 5', startMonthIndex: 4, endMonthIndex: 4 },
      { id: 'Phase6', label: 'Phase 6', startMonthIndex: 5, endMonthIndex: 5 },
    ];

    // Jalons
    this.ganttMilestones = [
      { label: 'Kick-off', monthIndex: 0 },
      { label: 'Pilote', monthIndex: 2 },
      { label: 'Go live', monthIndex: 4 },
    ];

    this.svgWidth = this.ganttLeftOffset + this.ganttMonthsCount * this.ganttColWidth + 40;
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

  private addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  }

  // =======================
  //   Construction Gantt
  // =======================

  private buildRoadmap(): void {
    if (!this.project) {
      this.baseTasks = [];
      this.ganttActivityRows = [];
      this.ganttTasksView = [];
      this.ganttLinksView = [];
      return;
    }

    const flatBase: {
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
          flatBase.push({
            task,
            activityId: activity.id,
            activityLabel: activity.label,
            phase,
          });
        }
      }
    }

    this.baseTasks = flatBase;
    this.rebuildGanttFromBase();
  }

private rebuildGanttFromBase(): void {
  const rows: GanttActivityRow[] = [];
  const tasksView: GanttTaskView[] = [];
  let rowIndex = 0;

  const orderedActivities: ActivityId[] = ['projet', 'metier', 'changement', 'technologie'];

  for (const activityId of orderedActivities) {
    const activityTasks = this.baseTasks.filter((t) => t.activityId === activityId);
    if (!activityTasks.length) continue;

    const firstLabel = activityTasks[0].activityLabel;
    const isCollapsed = this.activityCollapse[activityId];

    // ---- Ligne titre (toujours présente) ----
    rows.push({
      activityId,
      label: firstLabel,
      rowIndex,
      isHeader: true,
    });

    if (isCollapsed) {
      // ---- Mode synthèse : barre sur la ligne titre uniquement ----

      const monthIndexes = activityTasks.map(
        (t) => this.phaseToMonthIndex[t.phase] ?? 0
      );
      const minMonthIndex = Math.min(...monthIndexes);
      const maxMonthIndex = Math.max(...monthIndexes);

      const startDayIndex = minMonthIndex * this.daysPerMonth;
      const endDayIndex = (maxMonthIndex + 1) * this.daysPerMonth - 1;

      const x =
        this.ganttLeftOffset + startDayIndex * this.dayWidth + this.taskInnerMargin;
      const y = this.ganttTopOffset + rowIndex * this.ganttRowHeight + 6;
      const width =
        (endDayIndex - startDayIndex + 1) * this.dayWidth -
        2 * this.taskInnerMargin;
      const height = this.ganttRowHeight - 12;

      tasksView.push({
        id: `summary-${activityId}`,
        label: firstLabel + ' (synthèse)',
        activityId,
        phase: 'Phase1', // sans importance ici
        rowIndex,
        monthIndex: minMonthIndex,
        startMonthIndex: minMonthIndex,
        endMonthIndex: maxMonthIndex,
        startDayIndex,
        endDayIndex,
        x,
        y,
        width,
        height,
      });

      rowIndex++; // on passe à l’activité suivante
    } else {
      // ---- Mode détaillé : lignes de détail pour chaque tâche ----

      rowIndex++; // on descend sous la ligne titre pour commencer les détails

      for (const t of activityTasks) {
        // Ligne de détail (sans toggler)
        rows.push({
          activityId,
          label: '',     // pas de texte (ou tu peux mettre un bullet si tu veux)
          rowIndex,
          isHeader: false,
        });

        const monthIndex = this.phaseToMonthIndex[t.phase] ?? 0;
        const startDayIndex = monthIndex * this.daysPerMonth;
        const endDayIndex = startDayIndex + this.daysPerMonth - 1;

        const x =
          this.ganttLeftOffset +
          startDayIndex * this.dayWidth +
          this.taskInnerMargin;
        const y = this.ganttTopOffset + rowIndex * this.ganttRowHeight + 6;
        const width =
          (endDayIndex - startDayIndex + 1) * this.dayWidth -
          2 * this.taskInnerMargin;
        const height = this.ganttRowHeight - 12;

        tasksView.push({
          id: t.task.id,
          label: t.task.label,
          activityId,
          phase: t.phase,
          rowIndex,
          monthIndex,
          startMonthIndex: monthIndex,
          endMonthIndex: monthIndex,
          startDayIndex,
          endDayIndex,
          x,
          y,
          width,
          height,
        });

        rowIndex++;
      }
    }
  }

  this.ganttActivityRows = rows;
  this.ganttTasksView = tasksView;

  this.svgHeight =
    this.ganttTopOffset + this.ganttActivityRows.length * this.ganttRowHeight + 40;

  this.updateGanttLinks();
}


private updateGanttLinks(): void {
  const links: GanttLinkView[] = [];
  const horizontalMargin = 8;
  const verticalSpacing = this.ganttRowHeight / 2 + 6;

  for (const dep of this.ganttDependencies) {
    const from = this.ganttTasksView.find((t) => t.id === dep.fromId);
    const to = this.ganttTasksView.find((t) => t.id === dep.toId);
    if (!from || !to) continue;

    const startX = from.x + from.width;
    const startY = from.y + from.height / 2;
    const endX = to.x;
    const endY = to.y + to.height / 2;

    // Règles:
    // - sortir SOUS le cartouche source
    // - arriver AU-DESSUS du cartouche cible
    const yUnderSource = startY + verticalSpacing;
    const yAboveTarget = endY - verticalSpacing;

    // Points intermédiaires en X
    const midX1 = startX + horizontalMargin;
    const midX2 = endX - horizontalMargin;

    // Trajet exclusivement horizontal/vertical :
    // 1. horizontal depuis la source
    // 2. vertical vers "sous la source"
    // 3. horizontal vers la zone proche de la cible
    // 4. vertical jusqu'au niveau "au-dessus de la cible"
    // 5. vertical jusqu'au niveau de la cible
    // 6. horizontal jusque sur le bord de la cible
    const path = `
      M ${startX} ${startY}
      L ${midX1} ${startY}
      L ${midX1} ${yUnderSource}
      L ${midX2} ${yUnderSource}
      L ${midX2} ${yAboveTarget}
      L ${midX2} ${endY}
      L ${endX} ${endY}
    `;

    links.push({
      fromId: dep.fromId,
      toId: dep.toId,
      path,
    });
  }

  this.ganttLinksView = links;
}




  // =======================
  //   Libellés & regroupement
  // =======================

  toggleActivityCollapse(activityId: ActivityId): void {
    this.activityCollapse[activityId] = !this.activityCollapse[activityId];
    this.rebuildGanttFromBase();
  }

getRowDisplayLabel(row: GanttActivityRow): string {
  if (!row.isHeader) {
    return ''; // aucune étiquette sur les lignes de détail
  }
  const collapsed = this.activityCollapse[row.activityId];
  const prefix = collapsed ? '[+]' : '[-]';
  return `${prefix} ${row.label}`;
}


  getTaskStartLabel(task: GanttTaskView): string {
    if (!this.ganttStartDate) return '';

    const dayIndex =
      task.startDayIndex ??
      (task.startMonthIndex ?? task.monthIndex ?? 0) * this.daysPerMonth;

    const d = this.addDays(this.ganttStartDate, dayIndex);
    return d.toLocaleDateString('fr-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  getTaskEndLabel(task: GanttTaskView): string {
    if (!this.ganttStartDate) return '';

    const dayIndex =
      task.endDayIndex ??
      (task.endMonthIndex ?? task.monthIndex ?? 0) * this.daysPerMonth +
        (this.daysPerMonth - 1);

    const d = this.addDays(this.ganttStartDate, dayIndex);
    return d.toLocaleDateString('fr-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // =======================
  //   Drag & drop (par jour)
  // =======================

  onGanttBarMouseDown(event: MouseEvent, task: GanttTaskView): void {
    this.draggingTask = task;
    this.dragStartClientX = event.clientX;
    this.dragStartTaskX = task.x;
    this.dragHasMoved = false;

    event.stopPropagation();
    event.preventDefault();
  }

  onGanttMouseMove(event: MouseEvent): void {
    if (!this.draggingTask) return;

    const dx = event.clientX - this.dragStartClientX;

    if (Math.abs(dx) > 2) {
      this.dragHasMoved = true;
    }

    // Déplacement libre de la barre pendant le drag
    this.draggingTask.x = this.dragStartTaskX + dx;
  }

  onGanttMouseUp(event: MouseEvent): void {
    if (!this.draggingTask) return;

    // Clic simple : aucun déplacement
    if (!this.dragHasMoved) {
      this.draggingTask = null;
      return;
    }

    const totalDays = this.ganttMonthsCount * this.daysPerMonth;

    // Durée en jours de la barre (synthèse ou tâche)
    const currentStartDay =
      this.draggingTask.startDayIndex ??
      (this.draggingTask.startMonthIndex ?? this.draggingTask.monthIndex ?? 0) *
        this.daysPerMonth;
    const currentEndDay =
      this.draggingTask.endDayIndex ??
      currentStartDay + (this.daysPerMonth - 1);
    const durationDays = Math.max(0, currentEndDay - currentStartDay);

    // Calcul du nouvel indice de début à partir de la position x
    const rawStartDay =
      (this.draggingTask.x - this.ganttLeftOffset - this.taskInnerMargin) /
      this.dayWidth;
    let newStartDayIndex = Math.round(rawStartDay);

    // Clamp pour rester dans la fenêtre Gantt
    const maxStart = totalDays - (durationDays + 1);
    newStartDayIndex = Math.max(0, Math.min(maxStart, newStartDayIndex));

    const newEndDayIndex = newStartDayIndex + durationDays;

    // Nouveau mois "principal" basé sur le centre de la barre
    const midDayIndex = newStartDayIndex + durationDays / 2;
    let newMonthIndex = Math.floor(midDayIndex / this.daysPerMonth);
    newMonthIndex = Math.max(0, Math.min(this.ganttMonthsCount - 1, newMonthIndex));

    // Mise à jour de la barre
    this.draggingTask.startDayIndex = newStartDayIndex;
    this.draggingTask.endDayIndex = newEndDayIndex;
    this.draggingTask.monthIndex = newMonthIndex;
    this.draggingTask.startMonthIndex = newMonthIndex;
    this.draggingTask.endMonthIndex = newMonthIndex;

    this.draggingTask.x =
      this.ganttLeftOffset +
      newStartDayIndex * this.dayWidth +
      this.taskInnerMargin;
    this.draggingTask.width =
      (durationDays + 1) * this.dayWidth - 2 * this.taskInnerMargin;

    this.updateGanttLinks();
    this.draggingTask = null;
  }

  // =======================
  //   Hint (tooltip date)
  // =======================

  showHintForTask(task: GanttTaskView, type: 'start' | 'end'): void {
    const text =
      type === 'start'
        ? this.getTaskStartLabel(task)
        : this.getTaskEndLabel(task);

    if (!text) {
      this.hoverHint = null;
      return;
    }

    const bulletX = type === 'start' ? task.x : task.x + task.width;
    const bulletY = task.y + task.height / 2;

    this.hoverHint = {
      x: bulletX,
      y: bulletY,
      text,
    };
  }

  hideHint(): void {
    this.hoverHint = null;
  }

  onRowLabelClick(row: GanttActivityRow): void {
  if (!row.isHeader) {
    return;
  }
  this.toggleActivityCollapse(row.activityId);
}

}
