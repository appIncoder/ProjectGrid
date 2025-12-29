import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

import {
  ActivityId,
  ActivityStatus,
  GanttActivityRow,
  GanttLinkView,
  GanttPhaseBand,
  GanttTaskView,
  PhaseId,
  ProjectDetail,
  Task,
  TaskCategory,
} from '../../models';

import { ProjectService } from '../../services/project.service';

type HoverHint = { x: number; y: number; text: string };
type TaskScheduleOverride = { startDayIndex: number; endDayIndex: number };
type PeriodPreset = '3m' | '6m' | '12m' | 'custom';

type DependencyType = 'F2S' | 'F2F' | 'S2S';
type GanttDependency = { fromId: string; toId: string; type?: DependencyType };

type EditableDependencyRow = { toId: string; type: DependencyType };

// ✅ Vue enrichie pour gérer hover/filtre sans toucher aux models partagés
type RoadmapLinkView = GanttLinkView & {
  key: string;
  type: DependencyType;
};
type LinkTooltip = { x: number; y: number; text: string };

@Component({
  selector: 'app-project-roadmap',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule],
  templateUrl: './project-roadmap.html',
  styleUrls: ['./project-roadmap.scss'],
})
export class ProjectRoadmap implements OnInit, OnChanges, AfterViewInit, DoCheck {
  @Input() project: ProjectDetail | null = null;

  @ViewChild('taskEditModal', { static: false }) taskEditModalTpl?: TemplateRef<any>;

  @ViewChild('ganttScroll', { static: false }) ganttScrollRef?: ElementRef<HTMLElement>;
linkTooltip: LinkTooltip | null = null;
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
    0.4,  // Tâches
    0.25, // Début
    0.25, // Fin
    0.2,  // Phase
    0.2,  // Progression
  ];
  tableContentWidthPx = 600;

  get colTaskW(): number { return Math.round(this.tableContentWidthPx * this.tableColRatios[0]); }
  get colStartW(): number { return Math.round(this.tableContentWidthPx * this.tableColRatios[1]); }
  get colEndW(): number { return Math.round(this.tableContentWidthPx * this.tableColRatios[2]); }
  get colPhaseW(): number { return Math.round(this.tableContentWidthPx * this.tableColRatios[3]); }
  get colProgW(): number { return Math.round(this.tableContentWidthPx * this.tableColRatios[4]); }

  get tableInnerGridTemplate(): string {
    return `${this.colTaskW}px ${this.colStartW}px ${this.colEndW}px ${this.colPhaseW}px ${this.colProgW}px`;
  }

  private getMinTablePanelWidthPx(): number {
    return Math.max(240, Math.round(window.innerWidth * this.minPanelPercentOfScreen));
  }

  // ===== Timeline (Gantt)
  ganttMonthsCount = 6;
  private ganttStartDateOverride: Date | null = null;

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

  // ✅ on stocke des RoadmapLinkView (hover + type + key)
  ganttLinksView: RoadmapLinkView[] = [];

  ganttWidth = 0;
  ganttViewportWidth = 0;
  ganttBodyHeight = 0;

  ganttStartDate: Date | null = null;

  todayDayIndex: number | null = null;

  private readonly fallbackDependencies: GanttDependency[] = [
    { fromId: 'p1-1', toId: 'p2-1', type: 'F2S' },
    { fromId: 'p2-1', toId: 'p3-1', type: 'F2S' },
    { fromId: 'm2-1', toId: 'm3-1', type: 'F2S' },
    { fromId: 't2-1', toId: 't3-1', type: 'F2S' },
  ];

  private depsSignature = '';

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

  // ✅ Période affichée (UI)
  periodPreset: PeriodPreset = '6m';
  customMonths = 6;
  customStartIso = '';

  // =======================
  // ✅ Modal édition
  // =======================
  taskStatusOptions: { value: ActivityStatus; label: string }[] = [
    { value: 'todo', label: 'À faire (blanc)' },
    { value: 'inprogress', label: 'En cours (orange)' },
    { value: 'onhold', label: 'En attente (bleu)' },
    { value: 'done', label: 'Fait (vert)' },
    { value: 'notdone', label: 'Non fait (rouge)' },
    { value: 'notapplicable', label: 'Non applicable (gris)' },
  ];

  taskCategoryOptions: { value: TaskCategory; label: string }[] = [
    { value: 'projectManagement', label: 'Gestion du projet' },
    { value: 'businessManagement', label: 'Gestion du métier' },
    { value: 'changeManagement', label: 'Gestion du changement' },
    { value: 'technologyManagement', label: 'Gestion de la technologie' },
  ];

  dependencyTypeOptions: { value: DependencyType; label: string }[] = [
    { value: 'F2S', label: 'Finish to Start (F2S)' },
    { value: 'F2F', label: 'Finish to Finish (F2F)' },
    { value: 'S2S', label: 'Start to Start (S2S)' },
  ];

  private editingActivityId: ActivityId | null = null;
  private editingPhase: PhaseId | null = null;
  private taskBeingEdited: Task | null = null;

  editedTaskLabel = '';
  editedTaskStatus: ActivityStatus = 'todo';
  editedStartDate = '';
  editedEndDate = '';
  editedCategory: TaskCategory = 'projectManagement';
  editedPhase: PhaseId | null = null;

  editedDependencies: EditableDependencyRow[] = [];
  editError: string | null = null;

  // ✅ clic vs drag
  private clickCandidateTask: GanttTaskView | null = null;

  // =======================
  // ✅ Hover / Focus liens
  // =======================
  hoveredLinkKey: string | null = null;
  hoveredFromId: string | null = null;
  hoveredToId: string | null = null;

  // ✅ Filtre “afficher uniquement les liens de la tâche”
  filterLinksInGantt = false;
  private filterTaskId: string | null = null;

  constructor(private projectService: ProjectService, private modalService: NgbModal) {}

  ngOnInit(): void {
    this.tablePanelWidthPx = 400;
    this.tableContentWidthPx = 400;

    const d = this.projectService.getDefaultGanttStartDate();
    this.customStartIso = this.projectService.toIsoDate(d);
    this.ganttStartDateOverride = d;

    this.buildGanttCalendar();
    this.buildRoadmap();

    this.tablePanelWidthPx = Math.max(this.getMinTablePanelWidthPx(), this.tablePanelWidthPx);
    this.depsSignature = this.computeDepsSignature();
  }

  ngAfterViewInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project']) {
      if (this.project) {
        this.projectService.registerProject(this.project);
        this.ensureProjectDependenciesContainer();
      }
      this.buildRoadmap();
      this.updateGanttLinks();
      this.depsSignature = this.computeDepsSignature();
    }
  }

  ngDoCheck(): void {
    const sig = this.computeDepsSignature();
    if (sig !== this.depsSignature) {
      this.depsSignature = sig;
      this.updateGanttLinks();
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
  // ✅ UI période
  // =======================
  getPeriodLabel(): string {
    switch (this.periodPreset) {
      case '3m': return '3 mois';
      case '6m': return '6 mois';
      case '12m': return '1 an';
      case 'custom': return 'Custom';
      default: return '6 mois';
    }
  }

  onPeriodPresetChange(p: PeriodPreset): void {
    this.periodPreset = p;
    if (p === '3m') this.applyPeriod(3, this.customStartIso);
    if (p === '6m') this.applyPeriod(6, this.customStartIso);
    if (p === '12m') this.applyPeriod(12, this.customStartIso);
  }

  applyCustomPeriod(): void {
    const months = Math.max(1, Math.min(60, Math.round(Number(this.customMonths) || 6)));
    this.customMonths = months;
    this.applyPeriod(months, this.customStartIso);
  }

  private applyPeriod(monthsCount: number, startIso: string): void {
    const start = this.parseIsoToDate(startIso) ?? this.projectService.getDefaultGanttStartDate();
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);

    this.ganttMonthsCount = monthsCount;
    this.ganttStartDateOverride = startMonth;

    this.buildGanttCalendar();
    this.buildRoadmap();
    this.updateGanttLinks();
  }

  private parseIsoToDate(iso: string): Date | null {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }

  // =======================
  // ✅ Centrer sur aujourd'hui
  // =======================
  centerOnToday(): void {
    if (!this.ganttStartDate) this.buildGanttCalendar();
    if (!this.ganttStartDate) return;

    const today = new Date();
    const base = new Date(this.ganttStartDate.getFullYear(), this.ganttStartDate.getMonth(), this.ganttStartDate.getDate());
    const cur = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffDays = Math.round((cur.getTime() - base.getTime()) / 86400000);

    if (diffDays < 0) {
      const newStart = new Date(today.getFullYear(), today.getMonth(), 1);
      this.ganttStartDateOverride = newStart;
      this.customStartIso = this.projectService.toIsoDate(newStart);
      this.buildGanttCalendar();
      this.buildRoadmap();
    }

    const base2 = new Date(this.ganttStartDate!.getFullYear(), this.ganttStartDate!.getMonth(), this.ganttStartDate!.getDate());
    const diffDays2 = Math.round((cur.getTime() - base2.getTime()) / 86400000);

    if (diffDays2 >= 0) this.ensureTimelineForEndDay(diffDays2);
    this.todayDayIndex = diffDays2;

    const scroller = this.ganttScrollRef?.nativeElement;
    if (!scroller) return;

    const xToday = this.ganttLeftPadding + diffDays2 * this.dayWidth;
    const desired = xToday - scroller.clientWidth / 2;

    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    scroller.scrollLeft = Math.max(0, Math.min(maxScroll, desired));
  }

  // =======================
  // Calendrier Gantt
  // =======================
  private buildGanttCalendar(): void {
    const base = this.ganttStartDateOverride ?? this.projectService.getDefaultGanttStartDate();
    this.ganttStartDate = new Date(base.getFullYear(), base.getMonth(), 1);

    this.ganttMonths = [];
    for (let i = 0; i < this.ganttMonthsCount; i++) {
      const d = new Date(this.ganttStartDate.getFullYear(), this.ganttStartDate.getMonth() + i, 1);
      this.ganttMonths.push(d.toLocaleString('fr-BE', { month: 'short' }));
    }

    const lastMonthIndex = Math.max(5, this.ganttMonthsCount - 1);
    this.ganttPhaseBands = [
      { id: 'Phase1', label: 'Phase 1', startMonthIndex: 0, endMonthIndex: 0 },
      { id: 'Phase2', label: 'Phase 2', startMonthIndex: 1, endMonthIndex: 1 },
      { id: 'Phase3', label: 'Phase 3', startMonthIndex: 2, endMonthIndex: 3 },
      { id: 'Phase4', label: 'Phase 4', startMonthIndex: 3, endMonthIndex: 4 },
      { id: 'Phase5', label: 'Phase 5', startMonthIndex: 4, endMonthIndex: 4 },
      { id: 'Phase6', label: 'Phase 6', startMonthIndex: 5, endMonthIndex: lastMonthIndex },
    ];

    this.ganttMilestones = [
      { label: 'Kick-off', monthIndex: 0 },
      { label: 'Pilote', monthIndex: 2 },
      { label: 'Go live', monthIndex: 4 },
    ];

    this.ganttWidth = this.ganttLeftPadding + this.ganttMonthsCount * this.ganttColWidth + 40;
    this.ganttViewportWidth = Math.max(this.ganttWidth, this.tableContentWidthPx * 2);

    this.recomputeTodayIndex();
  }

  private recomputeTodayIndex(): void {
    if (!this.ganttStartDate) {
      this.todayDayIndex = null;
      return;
    }
    const today = new Date();
    const base = new Date(this.ganttStartDate.getFullYear(), this.ganttStartDate.getMonth(), this.ganttStartDate.getDate());
    const cur = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffDays = Math.round((cur.getTime() - base.getTime()) / 86400000);
    this.todayDayIndex = diffDays >= 0 ? diffDays : null;
  }

  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
  }

  private ensureTimelineForEndDay(endDayIndex: number): void {
    const requiredMonths = Math.floor(endDayIndex / this.projectService.daysPerMonth) + 1;
    if (requiredMonths <= this.ganttMonthsCount) return;

    this.ganttMonthsCount = requiredMonths;
    this.buildGanttCalendar();
    this.updateGanttLinks();
  }

  // =======================
  // Dependencies storage on project
  // =======================
  private ensureProjectDependenciesContainer(): void {
    if (!this.project) return;
    const anyProj = this.project as any;
    if (!Array.isArray(anyProj.ganttDependencies)) anyProj.ganttDependencies = [];
  }

  private getProjectDependencies(): GanttDependency[] {
    if (!this.project) return this.fallbackDependencies;
    const anyProj = this.project as any;
    const deps = (Array.isArray(anyProj.ganttDependencies) ? anyProj.ganttDependencies : []) as GanttDependency[];
    return deps.length ? deps : this.fallbackDependencies;
  }

  private computeDepsSignature(): string {
    const deps = this.getProjectDependencies() ?? [];
    const norm = deps
      .map(d => ({ fromId: String(d.fromId), toId: String(d.toId), type: (d.type ?? 'F2S') as DependencyType }))
      .sort((a, b) => (a.fromId + a.toId + a.type).localeCompare(b.fromId + b.toId + b.type));
    return JSON.stringify(norm);
  }

  // =======================
  // ✅ Synthèse : min/max sur les tâches d'une thématique
  // =======================
  private getPlannedStartEndDay(taskId: string, phase: PhaseId): { start: number; end: number } {
    const ov = this.scheduleOverrides[taskId];
    if (ov) return { start: ov.startDayIndex, end: ov.endDayIndex };

    const monthIndex = this.projectService.phaseToMonthIndex[phase] ?? 0;
    const start = monthIndex * this.projectService.daysPerMonth;
    const end = start + (this.projectService.daysPerMonth - 1);
    return { start, end };
  }

  private updateSummaryForActivity(activityId: ActivityId): void {
    if (!this.project) return;

    const activityTasks = this.baseTasks.filter(t => t.activityId === activityId);
    if (!activityTasks.length) return;

    let minStart = Number.POSITIVE_INFINITY;
    let maxEnd = Number.NEGATIVE_INFINITY;

    for (const t of activityTasks) {
      const { start, end } = this.getPlannedStartEndDay(t.task.id, t.phase);
      minStart = Math.min(minStart, start);
      maxEnd = Math.max(maxEnd, end);
    }

    if (!Number.isFinite(minStart) || !Number.isFinite(maxEnd)) return;

    this.ensureTimelineForEndDay(maxEnd);

    const summaryId = `summary-${activityId}`;
    const summary = this.ganttTasksView.find(x => x.id === summaryId);
    if (!summary) return;

    const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;
    const s = this.clamp(minStart, 0, totalDays - 1);
    const e = this.clamp(maxEnd, s, totalDays - 1);

    const mStart = this.dayIndexToMonthIndex(s);
    const mEnd = this.dayIndexToMonthIndex(e);

    summary.startDayIndex = s;
    summary.endDayIndex = e;
    summary.monthIndex = mStart;
    summary.startMonthIndex = mStart;
    summary.endMonthIndex = mEnd;

    summary.x = this.ganttLeftPadding + s * this.dayWidth + this.taskInnerMargin;
    summary.width = (e - s + 1) * this.dayWidth - 2 * this.taskInnerMargin;

    this.updateGanttLinks();
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

    this.seedOverridesFromTaskDates();

    const flat: typeof this.baseTasks = [];
    const activities = Object.values(this.project.activities);

    for (const activity of activities) {
      for (const phase of this.project.phases) {
        const tasks = this.project.taskMatrix[activity.id]?.[phase] ?? [];
        for (const task of tasks) {
          flat.push({ task, activityId: activity.id, activityLabel: activity.label, phase });
          if (!(task as any).phase) (task as any).phase = phase;
        }
      }
    }

    this.baseTasks = flat;
    this.rebuildGanttFromBase();
  }

  private seedOverridesFromTaskDates(): void {
    if (!this.project || !this.ganttStartDate) return;

    const pending: Array<{ id: string; start: number; end: number }> = [];
    let maxEnd = -1;

    for (const activityId of Object.keys(this.project.taskMatrix) as ActivityId[]) {
      const byPhase = this.project.taskMatrix[activityId];
      for (const phase of this.project.phases) {
        const tasks = byPhase?.[phase] ?? [];
        for (const task of tasks) {
          const s = this.projectService.parseIsoDateToDayIndex((task as any).startDate ?? '', this.ganttStartDate);
          const e = this.projectService.parseIsoDateToDayIndex((task as any).endDate ?? '', this.ganttStartDate);

          if (s === null && e === null) continue;

          const start = s ?? 0;
          const end = e ?? (start + (this.projectService.daysPerMonth - 1));

          const fixedStart = Math.min(start, end);
          const fixedEnd = Math.max(start, end);

          pending.push({ id: task.id, start: fixedStart, end: fixedEnd });
          if (fixedEnd > maxEnd) maxEnd = fixedEnd;
        }
      }
    }

    if (maxEnd >= 0) this.ensureTimelineForEndDay(maxEnd);

    const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;
    for (const p of pending) {
      const s = this.clamp(p.start, 0, totalDays - 1);
      const e = this.clamp(p.end, s, totalDays - 1);
      this.scheduleOverrides[p.id] = { startDayIndex: s, endDayIndex: e };
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

      let minStart = Number.POSITIVE_INFINITY;
      let maxEnd = Number.NEGATIVE_INFINITY;

      for (const t of activityTasks) {
        const { start, end } = this.getPlannedStartEndDay(t.task.id, t.phase);
        minStart = Math.min(minStart, start);
        maxEnd = Math.max(maxEnd, end);
      }

      if (!Number.isFinite(minStart) || !Number.isFinite(maxEnd)) {
        const monthIndexes = activityTasks.map(t => this.projectService.phaseToMonthIndex[t.phase] ?? 0);
        const minMonthIndex = Math.min(...monthIndexes);
        const maxMonthIndex = Math.max(...monthIndexes);
        minStart = minMonthIndex * this.projectService.daysPerMonth;
        maxEnd = (maxMonthIndex + 1) * this.projectService.daysPerMonth - 1;
      }

      this.ensureTimelineForEndDay(maxEnd);

      const minMonthIndex = this.dayIndexToMonthIndex(minStart);
      const maxMonthIndex = this.dayIndexToMonthIndex(maxEnd);

      tasksView.push(this.makeSummaryTaskView(activityId, rowIndex, minMonthIndex, maxMonthIndex, minStart, maxEnd));

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

        tasksView.push(
          this.makeTaskView(t.task.id, t.task.label, activityId, t.phase, rowIndex, monthIndex, dStart, dEnd)
        );
        rowIndex++;
      }
    }

    this.ganttActivityRows = rows;
    this.ganttTasksView = tasksView;

    this.ganttBodyHeight = this.ganttActivityRows.length * this.bodyRowHeight + 40;

    this.rebuildTaskRowIndexMap();
    this.updateGanttLinks();
    this.recomputeTodayIndex();
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

  // =======================
  // ✅ Liens Gantt (F2S + F2F + S2S) + hover + filtre
  // =======================
  private makeLinkKey(fromId: string, toId: string, type: DependencyType): string {
    return `${fromId}__${toId}__${type}`;
  }

  private getAnchor(task: GanttTaskView, side: 'start' | 'finish'): { x: number; y: number } {
    return {
      x: side === 'start' ? task.x : task.x + task.width,
      y: task.y + task.height / 2,
    };
  }

  private getLinkSides(type: DependencyType): { fromSide: 'start' | 'finish'; toSide: 'start' | 'finish' } {
    if (type === 'F2F') return { fromSide: 'finish', toSide: 'finish' };
    if (type === 'S2S') return { fromSide: 'start', toSide: 'start' };
    return { fromSide: 'finish', toSide: 'start' };
  }

  private isLinkRelatedToTask(fromId: string, toId: string, taskId: string): boolean {
    return fromId === taskId || toId === taskId;
  }

  isTaskHighlighted(taskId: string): boolean {
    // Hover > filtre
    if (this.hoveredFromId && this.hoveredToId) {
      return taskId === this.hoveredFromId || taskId === this.hoveredToId;
    }

    if (this.filterLinksInGantt && this.filterTaskId) {
      return this.isLinkRelatedToTask(taskId, taskId, this.filterTaskId) // true uniquement si id==filter
        ? true
        : this.isAnyLinkRelatedToTask(taskId, this.filterTaskId);
    }

    return false;
  }

  private isAnyLinkRelatedToTask(taskId: string, focusTaskId: string): boolean {
    const deps = this.getProjectDependencies();
    return deps.some(d => this.isLinkRelatedToTask(String(d.fromId), String(d.toId), focusTaskId) &&
      (String(d.fromId) === taskId || String(d.toId) === taskId));
  }

  isTaskDimmed(taskId: string): boolean {
    // pendant hover: on atténue les tâches non concernées
    if (this.hoveredFromId && this.hoveredToId) {
      return !(taskId === this.hoveredFromId || taskId === this.hoveredToId);
    }

    // filtre actif: on atténue tout ce qui n’est pas relié à la tâche focus
    if (this.filterLinksInGantt && this.filterTaskId) {
      const isRelated = this.isAnyLinkRelatedToTask(taskId, this.filterTaskId) || taskId === this.filterTaskId;
      return !isRelated;
    }

    return false;
  }

  getLinkCssClass(link: RoadmapLinkView): string {
    const classes = ['gantt-link'];

    const isHovered = this.hoveredLinkKey === link.key;
    const hoverActive = !!this.hoveredLinkKey;

    // hover
    if (isHovered) classes.push('gantt-link--hover');
    else if (hoverActive) classes.push('gantt-link--dim');

    // filtre
    if (this.filterLinksInGantt && this.filterTaskId) {
      const related = this.isLinkRelatedToTask(link.fromId, link.toId, this.filterTaskId);
      if (!related) classes.push('gantt-link--dim');
      else classes.push('gantt-link--focus');
    }

    return classes.join(' ');
  }

onLinkMouseEnter(link: RoadmapLinkView): void {
  this.hoveredLinkKey = link.key;
  this.hoveredFromId = link.fromId;
  this.hoveredToId = link.toId;

  // Texte tooltip
  const fromLabel = this.ganttTasksView.find(t => t.id === link.fromId)?.label ?? link.fromId;
  const toLabel = this.ganttTasksView.find(t => t.id === link.toId)?.label ?? link.toId;
  const typeLabel =
    link.type === 'F2S' ? 'Finish → Start (F2S)' :
    link.type === 'F2F' ? 'Finish → Finish (F2F)' :
    'Start → Start (S2S)';

  const text = `${typeLabel} : ${fromLabel} → ${toLabel}`;

  // Position tooltip : on prend le "milieu" de la ligne (approx) via la moyenne des X des barres
  const fromTask = this.ganttTasksView.find(t => t.id === link.fromId);
  const toTask = this.ganttTasksView.find(t => t.id === link.toId);

  const x =
    fromTask && toTask
      ? Math.round((fromTask.x + fromTask.width / 2 + (toTask.x + toTask.width / 2)) / 2)
      : 120;

  const y =
    fromTask && toTask
      ? Math.round((fromTask.y + fromTask.height / 2 + (toTask.y + toTask.height / 2)) / 2) - 18
      : 30;

  this.linkTooltip = { x, y, text };
}

onLinkMouseLeave(): void {
  this.hoveredLinkKey = null;
  this.hoveredFromId = null;
  this.hoveredToId = null;
  this.linkTooltip = null;
}


  onFilterLinksToggle(): void {
    if (this.filterLinksInGantt) {
      const curId = this.taskBeingEdited?.id ?? null;
      this.filterTaskId = curId;
    } else {
      this.filterTaskId = null;
    }
    this.updateGanttLinks();
  }

  private updateGanttLinks(): void {
    const depsAll = this.getProjectDependencies();

    // ✅ filtre (si activé)
    const deps = (this.filterLinksInGantt && this.filterTaskId)
      ? depsAll.filter(d => this.isLinkRelatedToTask(String(d.fromId), String(d.toId), this.filterTaskId!))
      : depsAll;

    const links: RoadmapLinkView[] = [];
    const hMargin = 10;
    const vGap = Math.max(10, Math.round(this.bodyRowHeight * 0.55));

    for (const dep of deps) {
      const from = this.ganttTasksView.find(t => t.id === dep.fromId);
      const to = this.ganttTasksView.find(t => t.id === dep.toId);
      if (!from || !to) continue;

      const type: DependencyType = dep.type ?? 'F2S';
      const { fromSide, toSide } = this.getLinkSides(type);

      const a = this.getAnchor(from, fromSide);
      const b = this.getAnchor(to, toSide);

      const startX = a.x;
      const startY = a.y;
      const endX = b.x;
      const endY = b.y;

      const xOut = startX + (fromSide === 'start' ? -hMargin : +hMargin);
      const xIn = endX + (toSide === 'start' ? -hMargin : +hMargin);

      // ✅ yMain : prioriser un couloir ENTRE les 2 activités si possible
      const fromTop = from.y;
      const fromBottom = from.y + from.height;
      const toTop = to.y;
      const toBottom = to.y + to.height;

      const fromIsAbove = fromTop < toTop;

      const betweenTop = fromIsAbove ? (fromBottom + vGap) : (toBottom + vGap);
      const betweenBottom = fromIsAbove ? (toTop - vGap) : (fromTop - vGap);

      let yMain: number | null = null;

      if (betweenBottom > betweenTop) {
        yMain = Math.round((betweenTop + betweenBottom) / 2);
      }

      if (yMain === null) {
        const minTop = Math.min(fromTop, toTop);
        const maxBottom = Math.max(fromBottom, toBottom);

        const yAbove = minTop - vGap;
        const yBelow = maxBottom + vGap;

        const toCenterY = to.y + to.height / 2;
        const distAbove = Math.abs(toCenterY - yAbove);
        const distBelow = Math.abs(toCenterY - yBelow);

        yMain = distAbove >= distBelow ? yAbove : yBelow;

        if (yMain > minTop && yMain < maxBottom) yMain = yAbove;
      }

      const path = [
        `M ${startX} ${startY}`,
        `L ${xOut} ${startY}`,
        `L ${xOut} ${yMain}`,
        `L ${xIn} ${yMain}`,
        `L ${xIn} ${endY}`,
        `L ${endX} ${endY}`,
      ].join(' ');

      links.push({
        fromId: dep.fromId,
        toId: dep.toId,
        path,
        type,
        key: this.makeLinkKey(String(dep.fromId), String(dep.toId), type),
      });
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
    const dayIndex =
      task.startDayIndex ?? (task.startMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth;
    return this.projectService.toIsoDate(this.projectService.addDays(this.ganttStartDate, dayIndex));
  }

  getTaskEndIsoForTable(task: GanttTaskView): string {
    if (!this.ganttStartDate) return '';
    const dayIndex =
      task.endDayIndex ??
      (task.endMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth +
        (this.projectService.daysPerMonth - 1);
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
    const oldEnd = task.endDayIndex ?? oldStart + (this.projectService.daysPerMonth - 1);

    const newEnd = this.clamp(end, 0, totalDays - 1);

    if (newEnd < oldStart) {
      this.setTableDateError(task.id, 'La date de fin ne peut pas être avant la date de début.');
      return;
    }

    this.applyScheduleFromTable(task, oldStart, newEnd);
  }

  private applyScheduleFromTable(task: GanttTaskView, startDay: number, endDay: number): void {
    if (!this.project || !this.ganttStartDate) return;

    this.ensureTimelineForEndDay(endDay);

    const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;
    const s = this.clamp(startDay, 0, totalDays - 1);
    const e = this.clamp(endDay, s, totalDays - 1);

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

    this.scheduleOverrides[task.id] = { startDayIndex: s, endDayIndex: e };

    this.syncTaskDatesToModel(task);
    this.updateSummaryForActivity(task.activityId);
    this.updateGanttLinks();
  }

  private syncTaskDatesToModel(taskView: GanttTaskView): void {
    if (!this.project || !this.ganttStartDate) return;
    if (String(taskView.id).startsWith('summary-')) return;

    this.projectService.syncGanttDayIndexesToTask({
      projectId: this.project.id,
      taskId: taskView.id,
      ganttStartDate: this.ganttStartDate,
      startDayIndex: taskView.startDayIndex,
      endDayIndex: taskView.endDayIndex,
    });
  }

  // =======================
  // Tooltips / hints
  // =======================
  private computeHint(task: GanttTaskView, type: 'start' | 'end', preview = false): HoverHint | null {
    const text = type === 'start' ? this.getTaskStartLabel(task, preview) : this.getTaskEndLabel(task, preview);
    if (!text) return null;

    const bulletX = type === 'start' ? task.x : task.x + task.width;
    const bulletY = task.y + task.height / 2;
    const dx = type === 'start' ? this.hintStartDx : this.hintEndDx;

    return { x: bulletX + dx, y: bulletY, text };
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
          (task.endMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth +
            (this.projectService.daysPerMonth - 1);

    const d = this.projectService.addDays(this.ganttStartDate, dayIndex);
    return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // ✅ Conversion robuste: écran -> repère SVG
  private getMouseXInSvg(event: MouseEvent): number {
    const svg = event.currentTarget as SVGSVGElement | null;
    if (!svg) return event.clientX;

    const ctm = svg.getScreenCTM();
    if (!ctm) return event.clientX;

    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;

    const loc = pt.matrixTransform(ctm.inverse());
    return loc.x;
  }

  private computePreviewDaysFromX(task: GanttTaskView): void {
    const curStart =
      task.startDayIndex ?? (task.startMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth;

    const curEnd = task.endDayIndex ?? curStart + (this.projectService.daysPerMonth - 1);
    const durationDays = Math.max(0, curEnd - curStart);

    const rawStart = (task.x - this.ganttLeftPadding - this.taskInnerMargin) / this.dayWidth;
    let startDay = Math.round(rawStart);
    startDay = Math.max(0, startDay);

    const wantedEnd = startDay + durationDays;
    this.ensureTimelineForEndDay(wantedEnd);

    const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;
    const maxStart = Math.max(0, totalDays - (durationDays + 1));
    startDay = Math.min(startDay, maxStart);

    this.previewStartDayIndex = startDay;
    this.previewEndDayIndex = startDay + durationDays;
  }

  // =======================
  // Drag & drop handlers
  // =======================
  onGanttBarMouseDown(event: MouseEvent, task: GanttTaskView): void {
    if (String(task.id).startsWith('summary-')) return;

    this.dragMode = 'move';
    this.clickCandidateTask = task;

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
    if (String(task.id).startsWith('summary-')) return;

    this.dragMode = 'resize-end';
    this.clickCandidateTask = null;

    this.draggingTask = task;
    this.dragHasMoved = false;

    const start = task.startDayIndex ?? (task.startMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth;
    const end =
      task.endDayIndex ??
      (task.endMonthIndex ?? task.monthIndex ?? 0) * this.projectService.daysPerMonth +
        (this.projectService.daysPerMonth - 1);

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

      const startDay = this.resizeFixedStartDayIndex;
      const mouseX = this.getMouseXInSvg(event);

      let roughEndDay = Math.floor((mouseX + this.taskInnerMargin - this.ganttLeftPadding) / this.dayWidth) - 1;
      roughEndDay = Math.max(startDay, roughEndDay);
      this.ensureTimelineForEndDay(roughEndDay);

      const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;
      const maxRightX = this.ganttLeftPadding + totalDays * this.dayWidth - this.taskInnerMargin;

      const rightX = Math.max(this.draggingTask.x + 1, Math.min(mouseX, maxRightX));

      let endDay = Math.floor((rightX + this.taskInnerMargin - this.ganttLeftPadding) / this.dayWidth) - 1;
      endDay = Math.max(startDay, Math.min(totalDays - 1, endDay));

      const snappedRightX = this.ganttLeftPadding + (endDay + 1) * this.dayWidth - this.taskInnerMargin;
      this.draggingTask.width = Math.max(1, snappedRightX - this.draggingTask.x);

      this.previewStartDayIndex = startDay;
      this.previewEndDayIndex = endDay;

      this.showHintsForDraggingTask(this.draggingTask);
      this.updateGanttLinks();
      return;
    }
  }

  onGanttMouseUp(event: MouseEvent): void {
    if (!this.draggingTask) return;

    if (!this.dragHasMoved && this.dragMode === 'move' && this.clickCandidateTask) {
      const taskToOpen = this.clickCandidateTask;

      this.draggingTask = null;
      this.dragMode = 'move';
      this.resizeFixedStartDayIndex = null;
      this.hideHints();

      this.openTaskEditModalFromRoadmap(taskToOpen);
      return;
    }

    if (this.previewStartDayIndex === null || this.previewEndDayIndex === null) {
      this.draggingTask = null;
      this.dragMode = 'move';
      this.resizeFixedStartDayIndex = null;
      this.hideHints();
      return;
    }

    this.ensureTimelineForEndDay(this.previewEndDayIndex);
    const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;

    if (this.dragMode === 'move') {
      const start = this.clamp(this.previewStartDayIndex, 0, totalDays - 1);
      const end = this.clamp(this.previewEndDayIndex, start, totalDays - 1);
      const durationDays = Math.max(0, end - start);

      this.draggingTask.startDayIndex = start;
      this.draggingTask.endDayIndex = end;

      this.draggingTask.x = this.ganttLeftPadding + start * this.dayWidth + this.taskInnerMargin;
      this.draggingTask.width = (durationDays + 1) * this.dayWidth - 2 * this.taskInnerMargin;

      this.scheduleOverrides[this.draggingTask.id] = { startDayIndex: start, endDayIndex: end };

      this.syncTaskDatesToModel(this.draggingTask);
      this.updateSummaryForActivity(this.draggingTask.activityId);
      this.updateGanttLinks();

      this.draggingTask = null;
      this.dragMode = 'move';
      this.resizeFixedStartDayIndex = null;
      this.hideHints();
      return;
    }

    if (this.dragMode === 'resize-end') {
      const start = this.clamp(this.previewStartDayIndex, 0, totalDays - 1);
      const end = this.clamp(this.previewEndDayIndex, start, totalDays - 1);
      const durationDays = Math.max(0, end - start);

      this.draggingTask.startDayIndex = start;
      this.draggingTask.endDayIndex = end;

      this.draggingTask.x = this.ganttLeftPadding + start * this.dayWidth + this.taskInnerMargin;
      this.draggingTask.width = (durationDays + 1) * this.dayWidth - 2 * this.taskInnerMargin;

      this.scheduleOverrides[this.draggingTask.id] = { startDayIndex: start, endDayIndex: end };

      this.syncTaskDatesToModel(this.draggingTask);
      this.updateSummaryForActivity(this.draggingTask.activityId);
      this.updateGanttLinks();

      this.draggingTask = null;
      this.dragMode = 'move';
      this.resizeFixedStartDayIndex = null;
      this.hideHints();
      return;
    }
  }

  // =======================
  // ✅ Modal Roadmap
  // =======================
  private findContextForTaskId(taskId: string): { activityId: ActivityId; phase: PhaseId; task: Task } | null {
    const base = this.baseTasks.find(b => b.task.id === taskId);
    if (!base) return null;
    return { activityId: base.activityId, phase: base.phase, task: base.task };
  }

  private openTaskEditModalFromRoadmap(taskView: GanttTaskView): void {
    if (!this.project || !this.taskEditModalTpl) return;

    const ctx = this.findContextForTaskId(taskView.id);
    if (!ctx) return;

    this.projectService.seedMissingTaskDates(this.project.id);

    this.taskBeingEdited = ctx.task;
    this.editingActivityId = ctx.activityId;
    this.editingPhase = ctx.phase;

    this.editedTaskLabel = ctx.task.label ?? '';
    this.editedTaskStatus = ctx.task.status;

    this.editedStartDate = (ctx.task as any).startDate ?? '';
    this.editedEndDate = (ctx.task as any).endDate ?? '';

    this.editedCategory = (ctx.task as any).category ?? 'projectManagement';
    this.editedPhase = (ctx.task as any).phase ?? ctx.phase;

    this.ensureProjectDependenciesContainer();
    const deps = this.getProjectDependencies().filter(d => d.fromId === ctx.task.id);
    this.editedDependencies = deps.map(d => ({ toId: d.toId, type: d.type ?? 'F2S' }));

    // ✅ si filtre actif, on focus cette tâche
    if (this.filterLinksInGantt) {
      this.filterTaskId = ctx.task.id;
      this.updateGanttLinks();
    }

    this.editError = null;
    this.modalService.open(this.taskEditModalTpl, { size: 'lg', centered: true });
  }

  getAllTasksFlat(): Task[] {
    if (!this.project) return [];
    const out: Task[] = [];
    for (const act of Object.keys(this.project.taskMatrix) as ActivityId[]) {
      const byPhase = this.project.taskMatrix[act];
      for (const ph of this.project.phases) {
        const tasks = byPhase?.[ph] ?? [];
        for (const t of tasks) out.push(t);
      }
    }
    return out;
  }

  getLinkableTasks(): Task[] {
    const all = this.getAllTasksFlat();
    const curId = this.taskBeingEdited?.id;
    return all.filter(t => t.id !== curId);
  }

  addDependencyRow(): void {
    this.editedDependencies.push({ toId: '', type: 'F2S' });
  }

  removeDependencyRow(index: number): void {
    this.editedDependencies.splice(index, 1);
  }

  saveTaskEdit(modal: any): void {
    if (!this.project || !this.taskBeingEdited || !this.editingActivityId || !this.editingPhase || !this.editedPhase) {
      modal.dismiss();
      return;
    }

    this.editError = null;

    const label = (this.editedTaskLabel ?? '').trim();
    if (!label) {
      this.editError = "Le nom de l’activité ne peut pas être vide.";
      return;
    }

    if (this.editedStartDate && this.editedEndDate) {
      const start = new Date(this.editedStartDate);
      const end = new Date(this.editedEndDate);
      if (start.getTime() > end.getTime()) {
        this.editError = 'La date de début ne peut pas être après la date de fin.';
        return;
      }
    }

    const curTaskId = this.taskBeingEdited.id;
    const linkableIds = new Set(this.getLinkableTasks().map(t => t.id));

    const cleaned = (this.editedDependencies ?? [])
      .map(r => ({ toId: (r.toId ?? '').trim(), type: (r.type ?? 'F2S') as DependencyType }))
      .filter(r => !!r.toId);

    if (cleaned.some(r => r.toId === curTaskId)) {
      this.editError = "Une activité ne peut pas dépendre d’elle-même.";
      return;
    }
    if (cleaned.some(r => !linkableIds.has(r.toId))) {
      this.editError = "Une des activités liées n’existe pas (ou n’est pas sélectionnée).";
      return;
    }
    const seen = new Set<string>();
    for (const r of cleaned) {
      const key = `${r.type}__${r.toId}`;
      if (seen.has(key)) {
        this.editError = 'Il y a des dépendances en double (même type + même activité liée).';
        return;
      }
      seen.add(key);
    }

    this.ensureProjectDependenciesContainer();
    const anyProj = this.project as any;
    const allDeps: GanttDependency[] = Array.isArray(anyProj.ganttDependencies) ? anyProj.ganttDependencies : [];
    const kept = allDeps.filter(d => d.fromId !== curTaskId);
    const added: GanttDependency[] = cleaned.map(r => ({ fromId: curTaskId, toId: r.toId, type: r.type }));
    anyProj.ganttDependencies = [...kept, ...added];

    this.projectService.updateTask({
      projectId: this.project.id,
      activityId: this.editingActivityId,
      fromPhase: this.editingPhase,
      toPhase: this.editedPhase,
      taskId: this.taskBeingEdited.id,

      label,
      status: this.editedTaskStatus,
      startDate: this.editedStartDate,
      endDate: this.editedEndDate,
      category: this.editedCategory,
      phase: this.editedPhase,
    });

    this.buildRoadmap();
    this.depsSignature = this.computeDepsSignature();

    // ✅ si filtre actif, on garde le focus sur la tâche éditée
    if (this.filterLinksInGantt) {
      this.filterTaskId = curTaskId;
    }

    this.updateGanttLinks();
    modal.close();
  }
}
