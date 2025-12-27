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

import { ProjectService } from '../../services/project.service';

type HoverHint = { x: number; y: number; text: string };
type TaskScheduleOverride = { startDayIndex: number; endDayIndex: number };

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
  readonly headerRow1Height = 44;
  readonly headerRow2Height = 32;
  readonly bodyRowHeight = 32;

  // ===== Divider draggable
  readonly dividerW = 10;
  private resizing = false;
  private resizeStartX = 0;
  private resizeStartPanelW = 0;

  // ===== Largeur panneau tableau
  tablePanelWidthPx = 400;
  readonly minPanelPercentOfScreen = 0.25;
  readonly maxTablePanelWidthPx = 900;

  // ===== Largeur "contenu tableau" (5 colonnes)
  private readonly tableColRatios = [
    0.40, // Tâches
    0.25, // Début
    0.25, // Fin
    0.2,  // Phase
    0.20, // Progression
  ];

  tableContentWidthPx = 600;

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

  readonly taskInnerMargin = 10;

  // Tooltips
  readonly hintWidth = 90;
  readonly hintStartDx = -(this.hintWidth + 6);
  readonly hintEndDx = 6;

  get dayWidth(): number {
    return this.ganttColWidth / this.projectService.daysPerMonth;
  }

  ganttMonths: string[] = [];
  ganttPhaseBands: GanttPhaseBand[] = [];
  ganttMilestones: { label: string; monthIndex: number }[] = [];

  ganttActivityRows: GanttActivityRow[] = [];
  ganttTasksView: GanttTaskView[] = [];
  ganttLinksView: GanttLinkView[] = [];

  ganttWidth = 0;
  ganttViewportWidth = 0;
  ganttBodyHeight = 0;

  ganttStartDate: Date | null = null;

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
    phase: PhaseId; // phase de la cellule d'origine
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

  // =======================
  // Overrides planning (local)
  // =======================
  private scheduleOverrides: Record<string, TaskScheduleOverride> = {};

  // =======================
  // UX validation date (table)
  // =======================
  tableDateErrors: Record<string, string> = {};

  private setTableDateError(taskId: string, msg: string): void {
    this.tableDateErrors[taskId] = msg;
    window.setTimeout(() => {
      if (this.tableDateErrors[taskId] === msg) delete this.tableDateErrors[taskId];
    }, 3500);
  }

  // =======================
  // Drag & drop + resize
  // =======================
  private dragMode: 'move' | 'resize-end' = 'move';

  draggingTask: GanttTaskView | null = null;
  dragStartClientX = 0;
  dragStartTaskX = 0;
  dragHasMoved = false;

  private resizeFixedStartDayIndex: number | null = null;

  hoverHints: { start?: HoverHint; end?: HoverHint } = {};
  private previewStartDayIndex: number | null = null;
  private previewEndDayIndex: number | null = null;

  private taskByRowIndex: Record<number, GanttTaskView> = {};

  constructor(private projectService: ProjectService) {}

  ngOnInit(): void {
    this.tablePanelWidthPx = 400;
    this.tableContentWidthPx = 400;

    this.buildGanttCalendar();
    this.buildRoadmap();

    this.tablePanelWidthPx = Math.max(this.getMinTablePanelWidthPx(), this.tablePanelWidthPx);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project']) {
      if (this.project) {
        // ✅ seed dates + cohérence centralisés
        this.projectService.registerProject(this.project);
      }
      this.buildRoadmap();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const minPanel = this.getMinTablePanelWidthPx();
    if (this.tablePanelWidthPx < minPanel) this.tablePanelWidthPx = minPanel;
  }

  // =======================
  // Divider draggable
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

    const minPanel = this.getMinTablePanelWidthPx();
    nextPanel = Math.max(minPanel, nextPanel);
    nextPanel = Math.min(this.maxTablePanelWidthPx, nextPanel);

    this.tablePanelWidthPx = nextPanel;
  }

  @HostListener('window:pointerup')
  onWindowPointerUp(): void {
    this.resizing = false;
  }

  // =======================
  // Calendrier Gantt (source = ProjectService)
  // =======================

  private buildGanttCalendar(): void {
    this.ganttStartDate = this.projectService.getDefaultGanttStartDate();

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
    this.ganttViewportWidth = Math.max(this.ganttWidth, this.tableContentWidthPx * 2);
  }

  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
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

    if (!this.ganttStartDate) this.buildGanttCalendar();

    // ✅ Seed overrides depuis Task.startDate/endDate (source de vérité)
    this.seedOverridesFromTaskDates();

    const flat: typeof this.baseTasks = [];
    const activities = Object.values(this.project.activities);

    for (const activity of activities) {
      for (const phase of this.project.phases) {
        const tasks = this.project.taskMatrix[activity.id]?.[phase] ?? [];
        for (const task of tasks) {
          flat.push({ task, activityId: activity.id, activityLabel: activity.label, phase });

          // cohérence
          if (!task.phase) task.phase = phase;
        }
      }
    }

    this.baseTasks = flat;
    this.rebuildGanttFromBase();
  }

  private seedOverridesFromTaskDates(): void {
    if (!this.project || !this.ganttStartDate) return;

    const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;

    for (const activityId of Object.keys(this.project.taskMatrix) as ActivityId[]) {
      const byPhase = this.project.taskMatrix[activityId];
      for (const phase of this.project.phases) {
        const tasks = byPhase?.[phase] ?? [];
        for (const task of tasks) {
          const s = this.projectService.parseIsoDateToDayIndex(task.startDate ?? '', this.ganttStartDate);
          const e = this.projectService.parseIsoDateToDayIndex(task.endDate ?? '', this.ganttStartDate);

          if (s === null && e === null) continue;

          const start = s !== null ? this.clamp(s, 0, totalDays - 1) : 0;
          const end = e !== null ? this.clamp(e, 0, totalDays - 1) : Math.min(totalDays - 1, start + (this.projectService.daysPerMonth - 1));

          const fixedStart = Math.min(start, end);
          const fixedEnd = Math.max(start, end);

          this.scheduleOverrides[task.id] = { startDayIndex: fixedStart, endDayIndex: fixedEnd };
        }
      }
    }
  }

  private rebuildGanttFromBase(): void {
    const rows: GanttActivityRow[] = [];
    const tasksView: GanttTaskView[] = [];
    let rowIndex = 0;

    for (const activityId of this.orderedActivities) {
      const activityTasks = this.baseTasks.filter(t => t.activityId === activityId);
      if (!activityTasks.length) continue;

      rows.push({ activityId, label: this.activityThemeLabel[activityId], rowIndex, isHeader: true });

      const monthIndexes = activityTasks.map(t => this.projectService.phaseToMonthIndex[t.phase] ?? 0);
      const minMonthIndex = Math.min(...monthIndexes);
      const maxMonthIndex = Math.max(...monthIndexes);

      const startDayIndex = minMonthIndex * this.projectService.daysPerMonth;
      const endDayIndex = (maxMonthIndex + 1) * this.projectService.daysPerMonth - 1;

      tasksView.push(this.makeSummaryTaskView(activityId, rowIndex, minMonthIndex, maxMonthIndex, startDayIndex, endDayIndex));

      if (this.activityCollapse[activityId]) {
        rowIndex++;
        continue;
      }

      rowIndex++;
      for (const t of activityTasks) {
        rows.push({ activityId, label: '', rowIndex, isHeader: false });

        const monthIndex = this.projectService.phaseToMonthIndex[t.phase] ?? 0;
        const dStart = monthIndex * this.projectService.daysPerMonth;
        const dEnd = dStart + this.projectService.daysPerMonth - 1;

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

  private dayIndexToMonthIndex(dayIndex: number): number {
    return Math.floor(dayIndex / this.projectService.daysPerMonth);
  }

  private monthIndexToPhaseId(monthIndex: number): PhaseId {
    const entries = Object.entries(this.projectService.phaseToMonthIndex) as Array<[PhaseId, number]>;
    const found = entries.find(([, idx]) => idx === monthIndex);
    return found?.[0] ?? 'Phase1';
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
    const ov = this.scheduleOverrides[id];
    const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;

    const start = this.clamp(ov?.startDayIndex ?? startDayIndex, 0, totalDays - 1);
    const end = this.clamp(ov?.endDayIndex ?? endDayIndex, start, totalDays - 1);

    const mStart = this.dayIndexToMonthIndex(start);
    const mEnd = this.dayIndexToMonthIndex(end);

    const x = this.ganttLeftPadding + start * this.dayWidth + this.taskInnerMargin;
    const y = this.ganttTopPadding + rowIndex * this.bodyRowHeight + 6;
    const width = (end - start + 1) * this.dayWidth - 2 * this.taskInnerMargin;
    const height = this.bodyRowHeight - 12;

    return {
      id,
      label,
      activityId,
      phase: this.monthIndexToPhaseId(mStart),
      rowIndex,
      monthIndex: mStart,
      startMonthIndex: mStart,
      endMonthIndex: mEnd,
      startDayIndex: start,
      endDayIndex: end,
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

  // =======================
  // Table helpers
  // =======================

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

  getTaskStartIsoForTable(task: GanttTaskView): string {
    if (!this.ganttStartDate) return '';
    const dayIndex = task.startDayIndex ?? (task.startMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth;
    return this.projectService.toIsoDate(this.projectService.addDays(this.ganttStartDate, dayIndex));
  }

  getTaskEndIsoForTable(task: GanttTaskView): string {
    if (!this.ganttStartDate) return '';
    const dayIndex =
      task.endDayIndex ??
      (task.endMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth + (this.projectService.daysPerMonth - 1);
    return this.projectService.toIsoDate(this.projectService.addDays(this.ganttStartDate, dayIndex));
  }

  // =======================
  // Table -> Gantt + sync -> ProjectService
  // =======================

  onTableStartDateChange(task: GanttTaskView, iso: string): void {
    if (!this.ganttStartDate || !this.project) return;

    const start = this.projectService.parseIsoDateToDayIndex(iso, this.ganttStartDate);
    if (start === null) return;

    const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;

    const oldStart = task.startDayIndex ?? 0;
    const oldEnd = task.endDayIndex ?? oldStart;

    const newStart = this.clamp(start, 0, totalDays - 1);

    if (newStart > oldEnd) {
      this.setTableDateError(task.id, 'La date de début ne peut pas être après la date de fin.');
      return;
    }

    this.applyScheduleFromTable(task, newStart, oldEnd);
  }

  onTableEndDateChange(task: GanttTaskView, iso: string): void {
    if (!this.ganttStartDate || !this.project) return;

    const end = this.projectService.parseIsoDateToDayIndex(iso, this.ganttStartDate);
    if (end === null) return;

    const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;

    const oldStart = task.startDayIndex ?? 0;
    const oldEnd = task.endDayIndex ?? (oldStart + this.projectService.daysPerMonth - 1);

    const newEnd = this.clamp(end, 0, totalDays - 1);

    if (newEnd < oldStart) {
      this.setTableDateError(task.id, 'La date de fin ne peut pas être avant la date de début.');
      return;
    }

    this.applyScheduleFromTable(task, oldStart, newEnd);
  }

  private applyScheduleFromTable(task: GanttTaskView, startDay: number, endDay: number): void {
    if (!this.project || !this.ganttStartDate) return;

    const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;
    const s = this.clamp(startDay, 0, totalDays - 1);
    const e = this.clamp(endDay, s, totalDays - 1);

    // Update view
    task.startDayIndex = s;
    task.endDayIndex = e;

    const mStart = this.dayIndexToMonthIndex(s);
    const mEnd = this.dayIndexToMonthIndex(e);

    task.monthIndex = mStart;
    task.startMonthIndex = mStart;
    task.endMonthIndex = mEnd;
    task.phase = this.monthIndexToPhaseId(mStart);

    task.x = this.ganttLeftPadding + s * this.dayWidth + this.taskInnerMargin;
    task.width = (e - s + 1) * this.dayWidth - 2 * this.taskInnerMargin;

    // Persist override
    this.scheduleOverrides[task.id] = { startDayIndex: s, endDayIndex: e };

    // ✅ Sync -> modèle via service
    this.syncTaskDatesToModel(task);

    // Links
    this.updateGanttLinks();
  }

  // =======================
  // Sync Gantt -> Task (ProjectService)
  // =======================

  private findBase(taskId: string): { task: Task; activityId: ActivityId; phase: PhaseId } | null {
    const b = this.baseTasks.find(x => x.task.id === taskId);
    return b ? { task: b.task, activityId: b.activityId, phase: b.phase } : null;
  }

  private syncTaskDatesToModel(taskView: GanttTaskView): void {
    if (!this.project || !this.ganttStartDate) return;
    if (String(taskView.id).startsWith('summary-')) return;

    const base = this.findBase(taskView.id);
    if (!base) return;

this.projectService.syncGanttDayIndexesToTask({
  projectId: this.project.id,
  taskId: taskView.id,
  ganttStartDate: this.ganttStartDate,
  startDayIndex: taskView.startDayIndex,
  endDayIndex: taskView.endDayIndex,
});

  }

  // =======================
  // Tooltips / hints (inchangé)
  // =======================

  private computeHint(task: GanttTaskView, type: 'start' | 'end', preview = false): HoverHint | null {
    const text = type === 'start' ? this.getTaskStartLabel(task, preview) : this.getTaskEndLabel(task, preview);
    if (!text) return null;

    const bulletX = type === 'start' ? task.x : task.x + task.width;
    const bulletY = task.y + task.height / 2;
    const dx = type === 'start' ? this.hintStartDx : this.hintEndDx;

    return { x: bulletX + dx, y: bulletY, text };
  }

  getTaskStartLabel(task: GanttTaskView, preview = false): string {
    if (!this.ganttStartDate) return '';
    const dayIndex =
      preview && this.previewStartDayIndex !== null
        ? this.previewStartDayIndex
        : task.startDayIndex ?? (task.startMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth;

    const d = this.projectService.addDays(this.ganttStartDate, dayIndex);
    return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getTaskEndLabel(task: GanttTaskView, preview = false): string {
    if (!this.ganttStartDate) return '';
    const dayIndex =
      preview && this.previewEndDayIndex !== null
        ? this.previewEndDayIndex
        : task.endDayIndex ??
          (task.endMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth + (this.projectService.daysPerMonth - 1);

    const d = this.projectService.addDays(this.ganttStartDate, dayIndex);
    return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private getMouseXInSvg(event: MouseEvent): number {
    const svg = event.currentTarget as SVGSVGElement | null;
    if (!svg) return event.clientX;

    const rect = svg.getBoundingClientRect();
    const scrollDiv = svg.parentElement?.parentElement as HTMLElement | null;
    const scrollLeft = scrollDiv?.scrollLeft ?? 0;

    return (event.clientX - rect.left) + scrollLeft;
  }

  private computePreviewDaysFromX(task: GanttTaskView): void {
    const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;

    const currentStart =
      task.startDayIndex ?? (task.startMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth;

    const currentEnd = task.endDayIndex ?? currentStart + (this.projectService.daysPerMonth - 1);
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
  // Drag & drop : MOVE / RESIZE END (inchangé sauf sync service)
  // =======================

  onGanttBarMouseDown(event: MouseEvent, task: GanttTaskView): void {
    this.dragMode = 'move';

    this.draggingTask = task;
    this.dragStartClientX = event.clientX;
    this.dragStartTaskX = task.x;
    this.dragHasMoved = false;

    this.computePreviewDaysFromX(task);
    this.showHintsForDraggingTask(task);

    event.stopPropagation();
    event.preventDefault();
  }

  onGanttBarResizeEndMouseDown(event: MouseEvent, task: GanttTaskView): void {
    this.dragMode = 'resize-end';

    this.draggingTask = task;
    this.dragHasMoved = false;

    const start =
      task.startDayIndex ?? (task.startMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth;

    const end =
      task.endDayIndex ??
      (task.endMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth + (this.projectService.daysPerMonth - 1);

    this.resizeFixedStartDayIndex = start;
    this.previewStartDayIndex = start;
    this.previewEndDayIndex = end;

    this.showHintsForDraggingTask(task);
    this.updateGanttLinks();

    event.stopPropagation();
    event.preventDefault();
  }

  onGanttMouseMove(event: MouseEvent): void {
    if (!this.draggingTask) return;

    if (this.dragMode === 'move') {
      const dx = event.clientX - this.dragStartClientX;
      if (Math.abs(dx) > 2) this.dragHasMoved = true;

      this.draggingTask.x = this.dragStartTaskX + dx;

      this.computePreviewDaysFromX(this.draggingTask);
      this.showHintsForDraggingTask(this.draggingTask);
      return;
    }

    if (this.dragMode === 'resize-end') {
      if (this.resizeFixedStartDayIndex === null) return;

      this.dragHasMoved = true;

      const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;
      const startDay = this.resizeFixedStartDayIndex;

      const mouseX = this.getMouseXInSvg(event);

      const minRightX = this.draggingTask.x + Math.max(6, this.dayWidth * 0.25);
      const maxRightX = this.ganttLeftPadding + totalDays * this.dayWidth - this.taskInnerMargin;
      const rightX = Math.max(minRightX, Math.min(maxRightX, mouseX));

      this.draggingTask.width = rightX - this.draggingTask.x;

      let endDay = Math.round((rightX + this.taskInnerMargin - this.ganttLeftPadding) / this.dayWidth) - 1;
      endDay = Math.max(startDay, Math.min(totalDays - 1, endDay));

      this.previewStartDayIndex = startDay;
      this.previewEndDayIndex = endDay;

      this.showHintsForDraggingTask(this.draggingTask);
      this.updateGanttLinks();
      return;
    }
  }

  onGanttMouseUp(event: MouseEvent): void {
    if (!this.draggingTask) return;

    if (!this.dragHasMoved) {
      this.draggingTask = null;
      this.dragMode = 'move';
      this.resizeFixedStartDayIndex = null;
      this.hideHints();
      return;
    }

    if (this.previewStartDayIndex === null || this.previewEndDayIndex === null) {
      this.draggingTask = null;
      this.dragMode = 'move';
      this.resizeFixedStartDayIndex = null;
      this.hideHints();
      return;
    }

    const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;

    if (this.dragMode === 'move') {
      const durationDays = Math.max(0, this.previewEndDayIndex - this.previewStartDayIndex);

      this.draggingTask.startDayIndex = this.clamp(this.previewStartDayIndex, 0, totalDays - 1);
      this.draggingTask.endDayIndex = this.clamp(this.previewEndDayIndex, this.draggingTask.startDayIndex, totalDays - 1);

      this.draggingTask.x =
        this.ganttLeftPadding + this.draggingTask.startDayIndex * this.dayWidth + this.taskInnerMargin;

      this.draggingTask.width = (durationDays + 1) * this.dayWidth - 2 * this.taskInnerMargin;

      this.scheduleOverrides[this.draggingTask.id] = {
        startDayIndex: this.draggingTask.startDayIndex,
        endDayIndex: this.draggingTask.endDayIndex,
      };

      // ✅ Sync -> modèle via service
      this.syncTaskDatesToModel(this.draggingTask);

      this.updateGanttLinks();

      this.draggingTask = null;
      this.dragMode = 'move';
      this.resizeFixedStartDayIndex = null;
      this.hideHints();
      return;
    }

    if (this.dragMode === 'resize-end') {
      const startDay = this.clamp(this.previewStartDayIndex, 0, totalDays - 1);
      const endDay = this.clamp(this.previewEndDayIndex, startDay, totalDays - 1);
      const durationDays = Math.max(0, endDay - startDay);

      this.draggingTask.startDayIndex = startDay;
      this.draggingTask.endDayIndex = endDay;

      this.draggingTask.x = this.ganttLeftPadding + startDay * this.dayWidth + this.taskInnerMargin;
      this.draggingTask.width = (durationDays + 1) * this.dayWidth - 2 * this.taskInnerMargin;

      this.scheduleOverrides[this.draggingTask.id] = {
        startDayIndex: this.draggingTask.startDayIndex,
        endDayIndex: this.draggingTask.endDayIndex,
      };

      // ✅ Sync -> modèle via service
      this.syncTaskDatesToModel(this.draggingTask);

      this.updateGanttLinks();

      this.draggingTask = null;
      this.dragMode = 'move';
      this.resizeFixedStartDayIndex = null;
      this.hideHints();
      return;
    }
  }
}
