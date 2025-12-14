import {
  Component,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
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

  // ===== Layout (lignes)
  readonly headerRow1Height = 44; // milestones + phases
  readonly headerRow2Height = 32; // titres tableau + mois
  readonly bodyRowHeight = 32;

  // ===== Divider draggable
  readonly dividerW = 10;
  private resizing = false;
  private resizeStartX = 0;
  private resizeStartPanelW = 0;

  // ===== Largeur "panneau tableau" (viewport visible du tableau)
  // -> c'est ça qu'on redimensionne au divider
  tablePanelWidthPx = 400;
  readonly minPanelPercentOfScreen = 0.25; // 👈 seuil 15%
  readonly maxTablePanelWidthPx = 900;     // pour éviter un tableau énorme (ajuste si tu veux)

  // ===== Largeur "contenu tableau" (les 5 colonnes)
  // -> ne change pas quand on atteint le seuil : scrollbar apparaît dans le panneau
  private readonly tableColRatios = [
  0.40, // Tâches (beaucoup de texte)
  0.16, // Début
  0.16, // Fin
  0.14, // Phase
  0.14, // Progression
];

  tableContentWidthPx = 600; // initialise à moitié, cohérent

  // Colonnes calculées (contenu)
  get colTaskW(): number  { return Math.round(this.tableContentWidthPx * this.tableColRatios[0]); }
  get colStartW(): number { return Math.round(this.tableContentWidthPx * this.tableColRatios[1]); }
  get colEndW(): number   { return Math.round(this.tableContentWidthPx * this.tableColRatios[2]); }
  get colPhaseW(): number { return Math.round(this.tableContentWidthPx * this.tableColRatios[3]); }
  get colProgW(): number  { return Math.round(this.tableContentWidthPx * this.tableColRatios[4]); }

  get tableInnerGridTemplate(): string {
    return `${this.colTaskW}px ${this.colStartW}px ${this.colEndW}px ${this.colPhaseW}px ${this.colProgW}px`;
  }

  private getMinTablePanelWidthPx(): number {
    return Math.max(240, Math.round(window.innerWidth * this.minPanelPercentOfScreen));
  }

  // ===== Timeline (Gantt)
  readonly ganttMonthsCount = 6;
  readonly ganttColWidth = 140;
  readonly ganttLeftPadding = 10;
  readonly ganttTopPadding = 0;

  readonly daysPerMonth = 30;
  readonly taskInnerMargin = 10;

  // Tooltips
  readonly hintWidth = 90;
  readonly hintStartDx = -(this.hintWidth + 6);
  readonly hintEndDx = 6;

  get dayWidth(): number {
    return this.ganttColWidth / this.daysPerMonth;
  }

  ganttMonths: string[] = [];
  ganttPhaseBands: GanttPhaseBand[] = [];
  ganttMilestones: { label: string; monthIndex: number }[] = [];

  ganttActivityRows: GanttActivityRow[] = [];
  ganttTasksView: GanttTaskView[] = [];
  ganttLinksView: GanttLinkView[] = [];

  ganttWidth = 0;         // largeur native gantt (selon mois)
  ganttViewportWidth = 0; // largeur d’affichage (>= 2×tableContentWidth)
  ganttBodyHeight = 0;

  ganttStartDate: Date | null = null;

  phaseToMonthIndex: Record<PhaseId, number> = {
    Phase1: 0, Phase2: 1, Phase3: 2, Phase4: 3, Phase5: 4, Phase6: 5,
  };

  ganttDependencies: { fromId: string; toId: string }[] = [
    { fromId: 'p1-1', toId: 'p2-1' },
    { fromId: 'p2-1', toId: 'p3-1' },
    { fromId: 'm2-1', toId: 'm3-1' },
    { fromId: 't2-1', toId: 't3-1' },
  ];

  private baseTasks: {
    task: Task;
    activityId: ActivityId;
    activityLabel: string;
    phase: PhaseId;
  }[] = [];

  private readonly orderedActivities: ActivityId[] = ['projet', 'metier', 'changement', 'technologie'];

  private readonly activityThemeLabel: Record<ActivityId, string> = {
    projet: 'Gestion du projet',
    metier: 'Gestion du métier',
    changement: 'Gestion du changement',
    technologie: 'Gestion de la technologie',
  };

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

  hoverHints: { start?: HoverHint; end?: HoverHint } = {};
  private previewStartDayIndex: number | null = null;
  private previewEndDayIndex: number | null = null;

  private taskByRowIndex: Record<number, GanttTaskView> = {};

  ngOnInit(): void {
    // init “moitié”
    this.tablePanelWidthPx = 400;
    this.tableContentWidthPx = 400;

    this.buildGanttCalendar();
    this.buildRoadmap();

    // assure que le panneau respecte déjà le seuil min à l'init
    this.tablePanelWidthPx = Math.max(this.getMinTablePanelWidthPx(), this.tablePanelWidthPx);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project']) this.buildRoadmap();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    // si l’écran rétrécit, on remonte le seuil min et on clamp le panneau
    const minPanel = this.getMinTablePanelWidthPx();
    if (this.tablePanelWidthPx < minPanel) this.tablePanelWidthPx = minPanel;
  }

  // =======================
  // Divider draggable (modifie uniquement le PANNEAU tableau)
  // =======================

  onResizeHandlePointerDown(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.resizing = true;
    this.resizeStartX = event.clientX;
    this.resizeStartPanelW = this.tablePanelWidthPx;

    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  @HostListener('window:pointermove', ['$event'])
  onWindowPointerMove(event: PointerEvent): void {
    if (!this.resizing) return;

    const dx = event.clientX - this.resizeStartX;
    let nextPanel = this.resizeStartPanelW + dx;

    // seuil min dynamique = 15% viewport
    const minPanel = this.getMinTablePanelWidthPx();
    nextPanel = Math.max(minPanel, nextPanel);

    // max “raisonnable”
    nextPanel = Math.min(this.maxTablePanelWidthPx, nextPanel);

    this.tablePanelWidthPx = nextPanel;

    // IMPORTANT : on ne touche PAS à tableContentWidthPx quand on “compresse” :
    // => si panneau < contenu => scrollbar du tableau apparaît.
  }

  @HostListener('window:pointerup')
  onWindowPointerUp(): void {
    this.resizing = false;
  }

  // =======================
  // Calendrier Gantt
  // =======================

  private buildGanttCalendar(): void {
    const now = new Date();
    this.ganttStartDate = new Date(now.getFullYear(), now.getMonth(), 1);

    this.ganttMonths = [];
    for (let i = 0; i < this.ganttMonthsCount; i++) {
      const d = new Date(this.ganttStartDate.getFullYear(), this.ganttStartDate.getMonth() + i, 1);
      this.ganttMonths.push(d.toLocaleString('fr-BE', { month: 'short' }));
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
      { label: 'Pilote', monthIndex: 2 },
      { label: 'Go live', monthIndex: 4 },
    ];

    this.ganttWidth = this.ganttLeftPadding + this.ganttMonthsCount * this.ganttColWidth + 40;

    // Gantt = au moins 2× la somme des colonnes du tableau (contenu),
    // mais indépendamment du panneau (viewport) tableau.
    this.ganttViewportWidth = Math.max(this.ganttWidth, this.tableContentWidthPx * 2);
  }

  private addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  }

  // =======================
  // Construction Roadmap
  // =======================

  private buildRoadmap(): void {
    if (!this.project) {
      this.baseTasks = [];
      this.ganttActivityRows = [];
      this.ganttTasksView = [];
      this.ganttLinksView = [];
      this.taskByRowIndex = {};
      this.ganttBodyHeight = 0;
      this.hideHints();
      return;
    }

    const flat: typeof this.baseTasks = [];
    const activities = Object.values(this.project.activities);

    for (const activity of activities) {
      for (const phase of this.project.phases) {
        const tasks = this.project.taskMatrix[activity.id]?.[phase] ?? [];
        for (const task of tasks) {
          flat.push({ task, activityId: activity.id, activityLabel: activity.label, phase });
        }
      }
    }

    this.baseTasks = flat;
    this.rebuildGanttFromBase();
  }

  private rebuildGanttFromBase(): void {
    const rows: GanttActivityRow[] = [];
    const tasksView: GanttTaskView[] = [];
    let rowIndex = 0;

    for (const activityId of this.orderedActivities) {
      const activityTasks = this.baseTasks.filter(t => t.activityId === activityId);
      if (!activityTasks.length) continue;

      rows.push({ activityId, label: this.activityThemeLabel[activityId], rowIndex, isHeader: true });

      const monthIndexes = activityTasks.map(t => this.phaseToMonthIndex[t.phase] ?? 0);
      const minMonthIndex = Math.min(...monthIndexes);
      const maxMonthIndex = Math.max(...monthIndexes);

      const startDayIndex = minMonthIndex * this.daysPerMonth;
      const endDayIndex = (maxMonthIndex + 1) * this.daysPerMonth - 1;

      tasksView.push(this.makeSummaryTaskView(activityId, rowIndex, minMonthIndex, maxMonthIndex, startDayIndex, endDayIndex));

      if (this.activityCollapse[activityId]) {
        rowIndex++;
        continue;
      }

      rowIndex++;
      for (const t of activityTasks) {
        rows.push({ activityId, label: '', rowIndex, isHeader: false });

        const monthIndex = this.phaseToMonthIndex[t.phase] ?? 0;
        const dStart = monthIndex * this.daysPerMonth;
        const dEnd = dStart + this.daysPerMonth - 1;

        tasksView.push(this.makeTaskView(t.task.id, t.task.label, activityId, t.phase, rowIndex, monthIndex, dStart, dEnd));
        rowIndex++;
      }
    }

    this.ganttActivityRows = rows;
    this.ganttTasksView = tasksView;

    this.ganttBodyHeight = this.ganttActivityRows.length * this.bodyRowHeight + 40;

    this.rebuildTaskRowIndexMap();
    this.updateGanttLinks();
  }

  private makeSummaryTaskView(
    activityId: ActivityId,
    rowIndex: number,
    minMonthIndex: number,
    maxMonthIndex: number,
    startDayIndex: number,
    endDayIndex: number
  ): GanttTaskView {
    const x = this.ganttLeftPadding + startDayIndex * this.dayWidth + this.taskInnerMargin;
    const y = this.ganttTopPadding + rowIndex * this.bodyRowHeight + 6;
    const width = (endDayIndex - startDayIndex + 1) * this.dayWidth - 2 * this.taskInnerMargin;
    const height = this.bodyRowHeight - 12;

    return {
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
    };
  }

  private makeTaskView(
    id: string,
    label: string,
    activityId: ActivityId,
    phase: PhaseId,
    rowIndex: number,
    monthIndex: number,
    startDayIndex: number,
    endDayIndex: number
  ): GanttTaskView {
    const x = this.ganttLeftPadding + startDayIndex * this.dayWidth + this.taskInnerMargin;
    const y = this.ganttTopPadding + rowIndex * this.bodyRowHeight + 6;
    const width = (endDayIndex - startDayIndex + 1) * this.dayWidth - 2 * this.taskInnerMargin;
    const height = this.bodyRowHeight - 12;

    return {
      id,
      label,
      activityId,
      phase,
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
    };
  }

  private rebuildTaskRowIndexMap(): void {
    this.taskByRowIndex = {};
    const headerRowIndexes = new Set<number>(this.ganttActivityRows.filter(r => r.isHeader).map(r => r.rowIndex));

    for (const t of this.ganttTasksView) {
      if (String(t.id).startsWith('summary-')) continue;
      if (headerRowIndexes.has(t.rowIndex)) continue;
      this.taskByRowIndex[t.rowIndex] = t;
    }
  }

  private updateGanttLinks(): void {
    const links: GanttLinkView[] = [];
    const hMargin = 10;
    const vGap = Math.max(10, Math.round(this.bodyRowHeight * 0.55));

    for (const dep of this.ganttDependencies) {
      const from = this.ganttTasksView.find(t => t.id === dep.fromId);
      const to = this.ganttTasksView.find(t => t.id === dep.toId);
      if (!from || !to) continue;

      const startX = from.x + from.width;
      const startY = from.y + from.height / 2;

      const endX = to.x;
      const endY = to.y + to.height / 2;

      const yUnderSource = from.y + from.height + vGap;
      const yAboveTarget = to.y - vGap;

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

  getRowDisplayLabel(row: GanttActivityRow): string {
    if (!row.isHeader) return '';
    const collapsed = this.activityCollapse[row.activityId];
    return `${collapsed ? '[+]' : '[-]'} ${row.label}`;
  }

  onRowLabelClick(row: GanttActivityRow): void {
    if (!row.isHeader) return;
    this.activityCollapse[row.activityId] = !this.activityCollapse[row.activityId];
    this.rebuildGanttFromBase();
  }

  getRowTask(rowIndex: number): GanttTaskView | null {
    return this.taskByRowIndex[rowIndex] ?? null;
  }

  getTaskProgressPercent(task: GanttTaskView): number {
    const base = this.baseTasks.find(b => b.task.id === task.id);
    const raw = (base as any)?.task?.progress ?? (base as any)?.task?.completion ?? 0;
    const n = Number(raw);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  getTaskStartLabelForTable(task: GanttTaskView): string {
    const preview = !!this.draggingTask && this.draggingTask.id === task.id;
    return this.getTaskStartLabel(task, preview);
  }

  getTaskEndLabelForTable(task: GanttTaskView): string {
    const preview = !!this.draggingTask && this.draggingTask.id === task.id;
    return this.getTaskEndLabel(task, preview);
  }

  getTaskStartLabel(task: GanttTaskView, preview = false): string {
    if (!this.ganttStartDate) return '';
    const dayIndex =
      preview && this.previewStartDayIndex !== null
        ? this.previewStartDayIndex
        : task.startDayIndex ?? (task.startMonthIndex ?? task.monthIndex ?? 0) * this.daysPerMonth;

    const d = this.addDays(this.ganttStartDate, dayIndex);
    return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getTaskEndLabel(task: GanttTaskView, preview = false): string {
    if (!this.ganttStartDate) return '';
    const dayIndex =
      preview && this.previewEndDayIndex !== null
        ? this.previewEndDayIndex
        : task.endDayIndex ??
          (task.endMonthIndex ?? task.monthIndex ?? 0) * this.daysPerMonth + (this.daysPerMonth - 1);

    const d = this.addDays(this.ganttStartDate, dayIndex);
    return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private computeHint(task: GanttTaskView, type: 'start' | 'end', preview = false): HoverHint | null {
    const text = type === 'start' ? this.getTaskStartLabel(task, preview) : this.getTaskEndLabel(task, preview);
    if (!text) return null;

    const bulletX = type === 'start' ? task.x : task.x + task.width;
    const bulletY = task.y + task.height / 2;
    const dx = type === 'start' ? this.hintStartDx : this.hintEndDx;

    return { x: bulletX + dx, y: bulletY, text };
  }

  private computePreviewDaysFromX(task: GanttTaskView): void {
    const totalDays = this.ganttMonthsCount * this.daysPerMonth;

    const currentStart =
      task.startDayIndex ?? (task.startMonthIndex ?? task.monthIndex ?? 0) * this.daysPerMonth;

    const currentEnd = task.endDayIndex ?? currentStart + (this.daysPerMonth - 1);
    const durationDays = Math.max(0, currentEnd - currentStart);

    const rawStart = (task.x - this.ganttLeftPadding - this.taskInnerMargin) / this.dayWidth;

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
  // Drag & drop
  // =======================

  onGanttBarMouseDown(event: MouseEvent, task: GanttTaskView): void {
    this.draggingTask = task;
    this.dragStartClientX = event.clientX;
    this.dragStartTaskX = task.x;
    this.dragHasMoved = false;

    this.computePreviewDaysFromX(task);
    this.showHintsForDraggingTask(task);

    event.stopPropagation();
    event.preventDefault();
  }

  onGanttMouseMove(event: MouseEvent): void {
    if (!this.draggingTask) return;

    const dx = event.clientX - this.dragStartClientX;
    if (Math.abs(dx) > 2) this.dragHasMoved = true;

    this.draggingTask.x = this.dragStartTaskX + dx;

    this.computePreviewDaysFromX(this.draggingTask);
    this.showHintsForDraggingTask(this.draggingTask);
  }

  onGanttMouseUp(event: MouseEvent): void {
    if (!this.draggingTask) return;

    if (!this.dragHasMoved) {
      this.draggingTask = null;
      this.hideHints();
      return;
    }

    if (this.previewStartDayIndex === null || this.previewEndDayIndex === null) {
      this.draggingTask = null;
      this.hideHints();
      return;
    }

    const durationDays = Math.max(0, this.previewEndDayIndex - this.previewStartDayIndex);

    this.draggingTask.startDayIndex = this.previewStartDayIndex;
    this.draggingTask.endDayIndex = this.previewEndDayIndex;

    this.draggingTask.x =
      this.ganttLeftPadding + this.previewStartDayIndex * this.dayWidth + this.taskInnerMargin;

    this.draggingTask.width = (durationDays + 1) * this.dayWidth - 2 * this.taskInnerMargin;

    this.updateGanttLinks();

    this.draggingTask = null;
    this.hideHints();
  }
}
