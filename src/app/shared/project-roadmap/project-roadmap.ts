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

type HoverHint = { x: number; y: number; text: string };

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

  // Hint sizing (doit rester cohérent avec le HTML)
  readonly hintWidth = 90;
  readonly hintHeight = 20;

  // Décalage tooltip: gauche ne doit pas chevaucher le cartouche
  readonly hintStartDx = -(this.hintWidth + 6);
  readonly hintEndDx = 6;

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

  // Ordre + libellés thématiques
  private readonly orderedActivities: ActivityId[] = ['projet', 'metier', 'changement', 'technologie'];

  private readonly activityThemeLabel: Record<ActivityId, string> = {
    projet: 'Gestion du projet',
    metier: 'Gestion du métier',
    changement: 'Gestion du changement',
    technologie: 'Gestion de la technologie',
  };

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

  // Tooltips SVG: début + fin
  hoverHints: { start?: HoverHint; end?: HoverHint } = {};

  // Preview indices (dates live pendant drag)
  private previewStartDayIndex: number | null = null;
  private previewEndDayIndex: number | null = null;

  // Mapping rowIndex -> task (pour remplir le tableau à gauche)
  private taskByRowIndex: Record<number, GanttTaskView> = {};

  ngOnInit(): void {
    this.buildGanttCalendar();
    this.buildRoadmap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project']) {
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
      this.taskByRowIndex = {};
      this.hideHints();
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

    for (const activityId of this.orderedActivities) {
      const activityTasks = this.baseTasks.filter((t) => t.activityId === activityId);
      if (!activityTasks.length) continue;

      // ---- Ligne titre (toujours présente) ----
      rows.push({
        activityId,
        label: this.activityThemeLabel[activityId],
        rowIndex,
        isHeader: true,
      });

      const isCollapsed = this.activityCollapse[activityId];

      if (isCollapsed) {
        // ---- Mode synthèse : 1 seule barre sur la ligne titre ----
        const monthIndexes = activityTasks.map((t) => this.phaseToMonthIndex[t.phase] ?? 0);
        const minMonthIndex = Math.min(...monthIndexes);
        const maxMonthIndex = Math.max(...monthIndexes);

        const startDayIndex = minMonthIndex * this.daysPerMonth;
        const endDayIndex = (maxMonthIndex + 1) * this.daysPerMonth - 1;

        const x =
          this.ganttLeftOffset + startDayIndex * this.dayWidth + this.taskInnerMargin;
        const y = this.ganttTopOffset + rowIndex * this.ganttRowHeight + 6;
        const width =
          (endDayIndex - startDayIndex + 1) * this.dayWidth - 2 * this.taskInnerMargin;
        const height = this.ganttRowHeight - 12;

        tasksView.push({
          id: `summary-${activityId}`,
          label: `${this.activityThemeLabel[activityId]} (synthèse)`,
          activityId,
          phase: 'Phase1',
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

        rowIndex++; // activité suivante
      } else {
        // ---- Mode éclaté : une ligne par tâche ----
        rowIndex++; // première ligne de détail sous le header

        for (const t of activityTasks) {
          rows.push({
            activityId,
            label: '',
            rowIndex,
            isHeader: false,
          });

          const monthIndex = this.phaseToMonthIndex[t.phase] ?? 0;
          const startDayIndex = monthIndex * this.daysPerMonth;
          const endDayIndex = startDayIndex + this.daysPerMonth - 1;

          const x =
            this.ganttLeftOffset + startDayIndex * this.dayWidth + this.taskInnerMargin;
          const y = this.ganttTopOffset + rowIndex * this.ganttRowHeight + 6;
          const width =
            (endDayIndex - startDayIndex + 1) * this.dayWidth - 2 * this.taskInnerMargin;
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

    this.rebuildTaskRowIndexMap();
    this.updateGanttLinks();
  }

  private rebuildTaskRowIndexMap(): void {
    this.taskByRowIndex = {};

    // On ne remplit le tableau qu'avec les lignes "détail" (pas les headers, pas les synthèses)
    const headerRowIndexes = new Set<number>(
      this.ganttActivityRows.filter(r => r.isHeader).map(r => r.rowIndex)
    );

    for (const t of this.ganttTasksView) {
      if (String(t.id).startsWith('summary-')) continue;
      if (headerRowIndexes.has(t.rowIndex)) continue;
      this.taskByRowIndex[t.rowIndex] = t;
    }
  }

  // =======================
  //   Liens (angles droits)
  // =======================

  private updateGanttLinks(): void {
    const links: GanttLinkView[] = [];
    const hMargin = 10;
    const vGap = Math.max(10, Math.round(this.ganttRowHeight * 0.55));

    for (const dep of this.ganttDependencies) {
      const from = this.ganttTasksView.find((t) => t.id === dep.fromId);
      const to = this.ganttTasksView.find((t) => t.id === dep.toId);
      if (!from || !to) continue;

      const startX = from.x + from.width;
      const startY = from.y + from.height / 2;

      const endX = to.x;
      const endY = to.y + to.height / 2;

      const yUnderSource = from.y + from.height + vGap; // sous source
      const yAboveTarget = to.y - vGap;                 // au-dessus cible

      const xOut = startX + hMargin;
      const xIn = endX - hMargin;

      const path = [
        `M ${startX} ${startY}`,
        `L ${xOut} ${startY}`,
        `L ${xOut} ${yUnderSource}`,
        `L ${xIn} ${yUnderSource}`,
        `L ${xIn} ${yAboveTarget}`,
        `L ${xIn} ${endY}`,
        `L ${endX} ${endY}`,
      ].join(' ');

      links.push({ fromId: dep.fromId, toId: dep.toId, path });
    }

    this.ganttLinksView = links;
  }

  // =======================
  //   Groupe / éclaté
  // =======================

  getRowDisplayLabel(row: GanttActivityRow): string {
    if (!row.isHeader) return '';
    const collapsed = this.activityCollapse[row.activityId];
    const prefix = collapsed ? '[+]' : '[-]';
    return `${prefix} ${row.label}`;
  }

  onRowLabelClick(row: GanttActivityRow): void {
    if (!row.isHeader) return;
    this.activityCollapse[row.activityId] = !this.activityCollapse[row.activityId];
    this.rebuildGanttFromBase();
  }

  // =======================
  //   Tableau gauche : helpers
  // =======================

  getRowTask(rowIndex: number): GanttTaskView | null {
    return this.taskByRowIndex[rowIndex] ?? null;
  }

  getTaskStartLabelForTable(task: GanttTaskView): string {
    const preview = !!this.draggingTask && this.draggingTask.id === task.id;
    return this.getTaskStartLabel(task, preview);
  }

  getTaskEndLabelForTable(task: GanttTaskView): string {
    const preview = !!this.draggingTask && this.draggingTask.id === task.id;
    return this.getTaskEndLabel(task, preview);
  }

  getTaskProgressPercent(task: GanttTaskView): number {
    const base = this.baseTasks.find(b => b.task.id === task.id);
    const raw = (base as any)?.task?.progress ?? (base as any)?.task?.completion ?? 0;

    const n = Number(raw);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  // =======================
  //   Labels dates (support preview)
  // =======================

  getTaskStartLabel(task: GanttTaskView, preview = false): string {
    if (!this.ganttStartDate) return '';

    const dayIndex = preview && this.previewStartDayIndex !== null
      ? this.previewStartDayIndex
      : task.startDayIndex ??
        (task.startMonthIndex ?? task.monthIndex ?? 0) * this.daysPerMonth;

    const d = this.addDays(this.ganttStartDate, dayIndex);
    return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getTaskEndLabel(task: GanttTaskView, preview = false): string {
    if (!this.ganttStartDate) return '';

    const dayIndex = preview && this.previewEndDayIndex !== null
      ? this.previewEndDayIndex
      : task.endDayIndex ??
        (task.endMonthIndex ?? task.monthIndex ?? 0) * this.daysPerMonth + (this.daysPerMonth - 1);

    const d = this.addDays(this.ganttStartDate, dayIndex);
    return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // =======================
  //   Tooltips (2 côtés) + preview live
  // =======================

  private computeHint(task: GanttTaskView, type: 'start' | 'end', preview = false): HoverHint | null {
    const text =
      type === 'start'
        ? this.getTaskStartLabel(task, preview)
        : this.getTaskEndLabel(task, preview);

    if (!text) return null;

    const bulletX = type === 'start' ? task.x : task.x + task.width;
    const bulletY = task.y + task.height / 2;

    const dx = type === 'start' ? this.hintStartDx : this.hintEndDx;

    return { x: bulletX + dx, y: bulletY, text };
  }

  private computePreviewDaysFromX(task: GanttTaskView): void {
    const totalDays = this.ganttMonthsCount * this.daysPerMonth;

    const currentStart =
      task.startDayIndex ??
      (task.startMonthIndex ?? task.monthIndex ?? 0) * this.daysPerMonth;

    const currentEnd =
      task.endDayIndex ?? currentStart + (this.daysPerMonth - 1);

    const durationDays = Math.max(0, currentEnd - currentStart);

    const rawStart =
      (task.x - this.ganttLeftOffset - this.taskInnerMargin) / this.dayWidth;

    let startDay = Math.round(rawStart);

    const maxStart = totalDays - (durationDays + 1);
    startDay = Math.max(0, Math.min(maxStart, startDay));

    this.previewStartDayIndex = startDay;
    this.previewEndDayIndex = startDay + durationDays;
  }

  private showHintsForDraggingTask(task: GanttTaskView): void {
    this.hoverHints = {
      start: this.computeHint(task, 'start', true) ?? undefined,
      end: this.computeHint(task, 'end', true) ?? undefined,
    };
  }

  showHintForTask(task: GanttTaskView, type: 'start' | 'end'): void {
    // Si on drag, on force les 2 en live
    if (this.draggingTask) {
      this.showHintsForDraggingTask(this.draggingTask);
      return;
    }
    const single = this.computeHint(task, type, false);
    this.hoverHints = {
      start: type === 'start' ? single ?? undefined : undefined,
      end: type === 'end' ? single ?? undefined : undefined,
    };
  }

  hideHints(): void {
    this.hoverHints = {};
    this.previewStartDayIndex = null;
    this.previewEndDayIndex = null;
  }

  // =======================
  //   Drag & drop (par jour) + dates live
  // =======================

  onGanttBarMouseDown(event: MouseEvent, task: GanttTaskView): void {
    this.draggingTask = task;
    this.dragStartClientX = event.clientX;
    this.dragStartTaskX = task.x;
    this.dragHasMoved = false;

    // init preview + hints
    this.computePreviewDaysFromX(task);
    this.showHintsForDraggingTask(task);

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

    // Dates live + hints live
    this.computePreviewDaysFromX(this.draggingTask);
    this.showHintsForDraggingTask(this.draggingTask);
  }

  onGanttMouseUp(event: MouseEvent): void {
    if (!this.draggingTask) return;

    // clic sans déplacement
    if (!this.dragHasMoved) {
      this.draggingTask = null;
      this.hideHints();
      return;
    }

    // Persist preview -> task
    if (this.previewStartDayIndex === null || this.previewEndDayIndex === null) {
      this.draggingTask = null;
      this.hideHints();
      return;
    }

    const durationDays = Math.max(0, this.previewEndDayIndex - this.previewStartDayIndex);

    // Recalage exact sur la grille
    this.draggingTask.startDayIndex = this.previewStartDayIndex;
    this.draggingTask.endDayIndex = this.previewEndDayIndex;

    this.draggingTask.x =
      this.ganttLeftOffset +
      this.previewStartDayIndex * this.dayWidth +
      this.taskInnerMargin;

    this.draggingTask.width =
      (durationDays + 1) * this.dayWidth - 2 * this.taskInnerMargin;

    this.updateGanttLinks();

    this.draggingTask = null;
    this.hideHints();
  }
}
