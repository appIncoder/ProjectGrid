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
import { ProjectTaskEditModal } from '../project-task-edit-modal/project-task-edit-modal';

import {
  ActivityId,
  ActivityStatus,
  GanttActivityRow,
  GanttPhaseBand,
  GanttTaskView,
  PhaseId,
  ProjectDetail,
  Task,
  TaskCategory,
  DependencyType,
  GanttDependency,
  EditableDependencyRow,
  TaskScheduleOverride,
  TaskConstraints,
  ScheduleNode,
  RoadmapLinkView,
  PeriodPreset,
  HoverHint,
  LinkTooltip,
  ViewMode,
} from '../../models';

import { ProjectService } from '../../services/project.service';

// Task schedule/constraints types imported from models/gantt.model.ts
type RoadmapColKey = 'task' | 'start' | 'end' | 'phase' | 'progress' | 'linkType' | 'linkedTask';
type LinkAnchorSide = 'start' | 'end';

type LinkDraft = {
  fromTaskId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  targetTaskId: string | null;
  targetSide: LinkAnchorSide | null;
};

@Component({
  selector: 'app-project-roadmap',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule, ProjectTaskEditModal],
  templateUrl: './project-roadmap.html',
  styleUrls: ['./project-roadmap.scss'],
})
export class ProjectRoadmap implements OnInit, OnChanges, AfterViewInit, DoCheck {
  @Input() project: ProjectDetail | null = null;

  @ViewChild('taskEditModal', { static: false }) taskEditModalTpl?: TemplateRef<any>;
  @ViewChild('ganttScroll', { static: false }) ganttScrollRef?: ElementRef<HTMLElement>;

  linkTooltip: LinkTooltip | null = null;

  // ✅ Mode d’affichage
  viewMode: ViewMode = 'split';

  // ===== Layout (lignes)
  readonly headerRow1Height = 44;
  readonly headerRow2Height = 32;
  readonly bodyRowHeight = 36;

  // ===== Divider draggable
  readonly dividerW = 10;
  private resizing = false;
  private resizeStartX = 0;
  private resizeStartPanelW = 0;

  // ===== Largeur panneau tableau
  tablePanelWidthPx = 400;
  readonly minPanelPercentOfScreen = 0.25;
  readonly maxTablePanelWidthPx = 900;

  // ===== Largeur "contenu tableau"
  tableContentWidthPx = 0;

  private readonly minColWidth: Record<RoadmapColKey, number> = {
    task: 260,
    start: 110,
    end: 110,
    phase: 140,
    progress: 110,
    linkType: 150,
    linkedTask: 220,
  };

  private readonly maxColWidth: Record<RoadmapColKey, number> = {
    task: 700,
    start: 320,
    end: 320,
    phase: 400,
    progress: 300,
    linkType: 360,
    linkedTask: 520,
  };

  colWidths: Record<RoadmapColKey, number> = {
    task: 360,
    start: 140,
    end: 140,
    phase: 160,
    progress: 140,
    linkType: 190,
    linkedTask: 300,
  };

  get colTaskW(): number { return this.colWidths.task; }
  get colStartW(): number { return this.colWidths.start; }
  get colEndW(): number { return this.colWidths.end; }
  get colPhaseW(): number { return this.colWidths.phase; }
  get colProgW(): number { return this.colWidths.progress; }
  get colLinkTypeW(): number { return this.colWidths.linkType; }
  get colLinkedTaskW(): number { return this.colWidths.linkedTask; }

  get tableInnerGridTemplate(): string {
    const base = `${this.colTaskW}px ${this.colStartW}px ${this.colEndW}px ${this.colPhaseW}px ${this.colProgW}px`;
    return `${base} ${this.colLinkTypeW}px ${this.colLinkedTaskW}px`;
  }

  private getMinTablePanelWidthPx(): number {
    return Math.max(240, Math.round(window.innerWidth * this.minPanelPercentOfScreen));
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;

    if (mode === 'split') return;

    if (mode === 'focusLeft') {
      this.tablePanelWidthPx = Math.min(this.maxTablePanelWidthPx, Math.round(window.innerWidth * 0.70));
      return;
    }

    // focusRight
    this.tablePanelWidthPx = Math.max(this.getMinTablePanelWidthPx(), Math.round(window.innerWidth * 0.22));
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

  private scheduleOverrides: Record<string, TaskScheduleOverride> = {};
  tableDateErrors: Record<string, string> = {};

  private setTableDateError(taskId: string, msg: string): void {
    this.tableDateErrors[taskId] = msg;
    window.setTimeout(() => {
      if (this.tableDateErrors[taskId] === msg) delete this.tableDateErrors[taskId];
    }, 3500);
  }

  private dragMode: 'move' | 'resize-end' | 'link-create' = 'move';

  private columnResizing = false;
  private resizingCol: RoadmapColKey | null = null;
  private colResizeStartX = 0;
  private colResizeStartW = 0;

  draggingTask: GanttTaskView | null = null;
  dragStartClientX = 0;
  dragStartTaskX = 0;
  dragHasMoved = false;
  private dragStartClientY = 0;

  private resizeFixedStartDayIndex: number | null = null;

  hoverHints: { start?: HoverHint; end?: HoverHint } = {};
  private previewStartDayIndex: number | null = null;
  private previewEndDayIndex: number | null = null;

  private taskByRowIndex: Record<number, GanttTaskView> = {};
  linkDraft: LinkDraft | null = null;
  readonly linkSnapDistancePx = 18;

  // ===== Période
  periodPreset: PeriodPreset = '6m';
  customMonths = 6;
  customStartIso = '';

  // ===== Popup: “afficher/masquer plus d’infos”
  showMoreInfos = false;

  // ===== Options UI
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

  // ✅ Contraintes éditées (dans “plus d’infos”)
  editedConstraints: TaskConstraints = {};

  editedDependencies: EditableDependencyRow[] = [];
  editError: string | null = null;

  private clickCandidateTask: GanttTaskView | null = null;

  hoveredLinkKey: string | null = null;
  hoveredFromId: string | null = null;
  hoveredToId: string | null = null;

  filterLinksInGantt = false;
  private filterTaskId: string | null = null;

  constructor(private projectService: ProjectService, private modalService: NgbModal) {}

  ngOnInit(): void {
    this.tablePanelWidthPx = 400;
    this.recomputeTableContentWidth();

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
    if (this.resizing) {
      const dx = event.clientX - this.resizeStartX;
      let nextPanel = this.resizeStartPanelW + dx;

      const minPanel = this.getMinTablePanelWidthPx();
      nextPanel = Math.max(minPanel, nextPanel);
      nextPanel = Math.min(this.maxTablePanelWidthPx, nextPanel);

      this.tablePanelWidthPx = nextPanel;
      return;
    }

    if (this.columnResizing && this.resizingCol) {
      const dx = event.clientX - this.colResizeStartX;
      const min = this.minColWidth[this.resizingCol];
      const max = this.maxColWidth[this.resizingCol];
      const next = this.clamp(this.colResizeStartW + dx, min, max);
      this.colWidths[this.resizingCol] = next;
      this.recomputeTableContentWidth();
    }
  }

  @HostListener('window:pointerup')
  onWindowPointerUp(): void {
    this.resizing = false;
    this.columnResizing = false;
    this.resizingCol = null;
  }

  onColumnResizePointerDown(event: PointerEvent, col: RoadmapColKey): void {
    event.preventDefault();
    event.stopPropagation();
    this.columnResizing = true;
    this.resizingCol = col;
    this.colResizeStartX = event.clientX;
    this.colResizeStartW = this.colWidths[col];
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private recomputeTableContentWidth(): void {
    this.tableContentWidthPx =
      this.colWidths.task +
      this.colWidths.start +
      this.colWidths.end +
      this.colWidths.phase +
      this.colWidths.progress +
      this.colWidths.linkType +
      this.colWidths.linkedTask;
    this.ganttViewportWidth = Math.max(this.ganttWidth, this.tableContentWidthPx * 2);
  }

  // =======================
  // UI période
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
  // Centrer sur aujourd'hui
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

  private getPrimaryDependencyForTask(fromId: string): GanttDependency | null {
    const deps = this.getProjectDependencies();
    const matches = deps.filter(d => String(d.fromId) === String(fromId));
    return matches.length ? matches[0] : null;
  }

  getInlineDepType(task: GanttTaskView): DependencyType {
    const dep = this.getPrimaryDependencyForTask(task.id);
    return (dep?.type ?? 'F2S') as DependencyType;
  }

  getInlineDepToId(task: GanttTaskView): string {
    const dep = this.getPrimaryDependencyForTask(task.id);
    return dep?.toId ? String(dep.toId) : '';
  }

  getLinkableTasksFor(taskId: string): Task[] {
    const all = this.getAllTasksFlat();
    return all.filter(t => t.id !== taskId);
  }

  onInlineDepTypeChange(task: GanttTaskView, type: DependencyType): void {
    if (!this.project) return;
    this.ensureProjectDependenciesContainer();

    const toId = this.getInlineDepToId(task);
    if (!toId) return;

    this.upsertPrimaryDependency(task.id, toId, type);
  }

  onInlineDepToChange(task: GanttTaskView, toId: string): void {
    if (!this.project) return;
    this.ensureProjectDependenciesContainer();

    const cleanTo = (toId ?? '').trim();

    if (!cleanTo) {
      this.removePrimaryDependency(task.id);
      return;
    }

    if (cleanTo === task.id) {
      this.setTableDateError(task.id, "Une activité ne peut pas dépendre d’elle-même.");
      return;
    }

    const exists = this.getAllTasksFlat().some(t => t.id === cleanTo);
    if (!exists) {
      this.setTableDateError(task.id, "L’activité liée n’existe pas.");
      return;
    }

    const type = this.getInlineDepType(task);
    this.upsertPrimaryDependency(task.id, cleanTo, type);
  }

  private upsertPrimaryDependency(fromId: string, toId: string, type: DependencyType): void {
    if (!this.project) return;
    const anyProj = this.project as any;
    const allDeps: GanttDependency[] = Array.isArray(anyProj.ganttDependencies) ? anyProj.ganttDependencies : [];

    const fromDeps = allDeps.filter(d => String(d.fromId) === String(fromId));
    const others = allDeps.filter(d => String(d.fromId) !== String(fromId));

    if (!fromDeps.length) {
      anyProj.ganttDependencies = [...others, { fromId, toId, type }];
    } else {
      const [primary, ...rest] = fromDeps;
      const updatedPrimary: GanttDependency = { ...primary, fromId, toId, type };
      anyProj.ganttDependencies = [...others, updatedPrimary, ...rest];
    }

    this.depsSignature = this.computeDepsSignature();
    this.updateGanttLinks();
  }

  private removePrimaryDependency(fromId: string): void {
    if (!this.project) return;
    const anyProj = this.project as any;
    const allDeps: GanttDependency[] = Array.isArray(anyProj.ganttDependencies) ? anyProj.ganttDependencies : [];

    const fromDeps = allDeps.filter(d => String(d.fromId) === String(fromId));
    const others = allDeps.filter(d => String(d.fromId) !== String(fromId));

    if (!fromDeps.length) return;

    const [, ...rest] = fromDeps;
    anyProj.ganttDependencies = [...others, ...rest];

    this.depsSignature = this.computeDepsSignature();
    this.updateGanttLinks();
  }

  private computeDepsSignature(): string {
    const deps = this.getProjectDependencies() ?? [];
    const norm = deps
      .map(d => ({ fromId: String(d.fromId), toId: String(d.toId), type: (d.type ?? 'F2S') as DependencyType }))
      .sort((a, b) => (a.fromId + a.toId + a.type).localeCompare(b.fromId + b.toId + b.type));
    return JSON.stringify(norm);
  }

  // =======================
  // ✅ Contraintes (helpers)
  // =======================
  private getConstraintsFromTask(task: Task | null): TaskConstraints | null {
    if (!task) return null;
    const anyT = task as any;
    const c = anyT.constraints as TaskConstraints | undefined;
    if (!c) return null;
    return {
      startNoEarlierThan: c.startNoEarlierThan || undefined,
      startNoLaterThan: c.startNoLaterThan || undefined,
      endNoEarlierThan: c.endNoEarlierThan || undefined,
      endNoLaterThan: c.endNoLaterThan || undefined,
    };
  }

  private setConstraintsOnTask(task: Task, c: TaskConstraints): void {
    const anyT = task as any;
    const cleaned: TaskConstraints = {
      startNoEarlierThan: c.startNoEarlierThan || undefined,
      startNoLaterThan: c.startNoLaterThan || undefined,
      endNoEarlierThan: c.endNoEarlierThan || undefined,
      endNoLaterThan: c.endNoLaterThan || undefined,
    };

    const hasAny =
      !!cleaned.startNoEarlierThan ||
      !!cleaned.startNoLaterThan ||
      !!cleaned.endNoEarlierThan ||
      !!cleaned.endNoLaterThan;

    if (!hasAny) {
      delete anyT.constraints;
      return;
    }
    anyT.constraints = cleaned;
  }

  private isoToDayIndexOrNull(iso: string, base: Date | null): number | null {
    if (!base) return null;
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    return this.projectService.parseIsoDateToDayIndex(iso, base);
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
  // Liens Gantt + hover + filtre
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
    if (this.hoveredFromId && this.hoveredToId) {
      return taskId === this.hoveredFromId || taskId === this.hoveredToId;
    }

    if (this.filterLinksInGantt && this.filterTaskId) {
      return taskId === this.filterTaskId || this.isAnyLinkRelatedToTask(taskId, this.filterTaskId);
    }

    return false;
  }

  private isAnyLinkRelatedToTask(taskId: string, focusTaskId: string): boolean {
    const deps = this.getProjectDependencies();
    return deps.some(d =>
      this.isLinkRelatedToTask(String(d.fromId), String(d.toId), focusTaskId) &&
      (String(d.fromId) === taskId || String(d.toId) === taskId)
    );
  }

  isTaskDimmed(taskId: string): boolean {
    if (this.hoveredFromId && this.hoveredToId) {
      return !(taskId === this.hoveredFromId || taskId === this.hoveredToId);
    }

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

    if (isHovered) classes.push('gantt-link--hover');
    else if (hoverActive) classes.push('gantt-link--dim');

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

    const fromLabel = this.ganttTasksView.find(t => t.id === link.fromId)?.label ?? link.fromId;
    const toLabel = this.ganttTasksView.find(t => t.id === link.toId)?.label ?? link.toId;
    const typeLabel =
      link.type === 'F2S' ? 'Finish → Start (F2S)' :
      link.type === 'F2F' ? 'Finish → Finish (F2F)' :
      'Start → Start (S2S)';

    const text = `${typeLabel} : ${fromLabel} → ${toLabel}`;

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

  private getLinkObstacles(excludeTaskIds: string[]): Array<{ left: number; right: number; top: number; bottom: number }> {
    const exclude = new Set(excludeTaskIds.map((x) => String(x)));
    const pad = 3;
    return this.ganttTasksView
      .filter((t) => !String(t.id).startsWith('summary-'))
      .filter((t) => !exclude.has(String(t.id)))
      .map((t) => ({
        left: t.x - pad,
        right: t.x + t.width + pad,
        top: t.y - pad,
        bottom: t.y + t.height + pad,
      }));
  }

  private overlaps(a1: number, a2: number, b1: number, b2: number): boolean {
    const minA = Math.min(a1, a2);
    const maxA = Math.max(a1, a2);
    const minB = Math.min(b1, b2);
    const maxB = Math.max(b1, b2);
    return maxA >= minB && maxB >= minA;
  }

  private segmentHitsObstacles(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    obstacles: Array<{ left: number; right: number; top: number; bottom: number }>
  ): boolean {
    const isHorizontal = Math.abs(y1 - y2) < 0.001;
    const isVertical = Math.abs(x1 - x2) < 0.001;
    if (!isHorizontal && !isVertical) return true;

    for (const r of obstacles) {
      if (isHorizontal) {
        if (y1 >= r.top && y1 <= r.bottom && this.overlaps(x1, x2, r.left, r.right)) {
          return true;
        }
      } else {
        if (x1 >= r.left && x1 <= r.right && this.overlaps(y1, y2, r.top, r.bottom)) {
          return true;
        }
      }
    }
    return false;
  }

  private polylineHitsObstacles(
    points: Array<{ x: number; y: number }>,
    obstacles: Array<{ left: number; right: number; top: number; bottom: number }>
  ): boolean {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (this.segmentHitsObstacles(a.x, a.y, b.x, b.y, obstacles)) return true;
    }
    return false;
  }

  private polylineLength(points: Array<{ x: number; y: number }>): number {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      len += Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
    }
    return len;
  }

  private pointsToPath(points: Array<{ x: number; y: number }>): string {
    if (!points.length) return '';
    const head = `M ${points[0].x} ${points[0].y}`;
    const tail = points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
    return `${head} ${tail}`.trim();
  }

  private updateGanttLinks(): void {
    const depsAll = this.getProjectDependencies();

    const deps = (this.filterLinksInGantt && this.filterTaskId)
      ? depsAll.filter(d => this.isLinkRelatedToTask(String(d.fromId), String(d.toId), this.filterTaskId!))
      : depsAll;

    const links: RoadmapLinkView[] = [];
    const hMargin = 10;
    const laneGap = Math.max(8, Math.round(this.bodyRowHeight * 0.25));
    const barClearance = 24;
    const allRealTasks = this.ganttTasksView.filter((t) => !String(t.id).startsWith('summary-'));
    const globalMinX = allRealTasks.length
      ? Math.min(...allRealTasks.map((t) => t.x))
      : this.ganttLeftPadding + 20;
    const globalMaxX = allRealTasks.length
      ? Math.max(...allRealTasks.map((t) => t.x + t.width))
      : this.ganttLeftPadding + this.ganttColWidth;
    const leftEscape = Math.max(4, Math.round(globalMinX - barClearance));
    const rightEscape = Math.round(globalMaxX + barClearance);

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
      const obstacles = this.getLinkObstacles([String(from.id), String(to.id)]);

      const yMid = Math.round((startY + endY) / 2);
      const yUpper = Math.min(startY, endY) - laneGap;
      const yLower = Math.max(startY, endY) + laneGap;

      const candidates: Array<Array<{ x: number; y: number }>> = [
        // Short candidate: direct horizontal corridor at source Y.
        [
          { x: startX, y: startY },
          { x: xOut, y: startY },
          { x: xIn, y: startY },
          { x: xIn, y: endY },
          { x: endX, y: endY },
        ],
        // Short candidate: direct at target Y.
        [
          { x: startX, y: startY },
          { x: xOut, y: startY },
          { x: xOut, y: endY },
          { x: xIn, y: endY },
          { x: endX, y: endY },
        ],
        // Mid corridor.
        [
          { x: startX, y: startY },
          { x: xOut, y: startY },
          { x: xOut, y: yMid },
          { x: xIn, y: yMid },
          { x: xIn, y: endY },
          { x: endX, y: endY },
        ],
        // Slightly above.
        [
          { x: startX, y: startY },
          { x: xOut, y: startY },
          { x: xOut, y: yUpper },
          { x: xIn, y: yUpper },
          { x: xIn, y: endY },
          { x: endX, y: endY },
        ],
        // Slightly below.
        [
          { x: startX, y: startY },
          { x: xOut, y: startY },
          { x: xOut, y: yLower },
          { x: xIn, y: yLower },
          { x: xIn, y: endY },
          { x: endX, y: endY },
        ],
      ];

      const clearCandidates = candidates.filter((pts) => !this.polylineHitsObstacles(pts, obstacles));
      let chosen: Array<{ x: number; y: number }> | null = null;

      if (clearCandidates.length) {
        chosen = clearCandidates.sort((aPts, bPts) => this.polylineLength(aPts) - this.polylineLength(bPts))[0];
      } else {
        // Fallback long route only if needed.
        const xEscapeFrom = fromSide === 'start' ? leftEscape : rightEscape;
        const xEscapeTo = toSide === 'start' ? leftEscape : rightEscape;
        const yLane = startY <= endY ? (Math.floor(startY / this.bodyRowHeight) + 1) * this.bodyRowHeight - 3
                                     : Math.floor(endY / this.bodyRowHeight) * this.bodyRowHeight - 3;
        chosen = [
          { x: startX, y: startY },
          { x: xOut, y: startY },
          { x: xEscapeFrom, y: startY },
          { x: xEscapeFrom, y: yLane },
          { x: xEscapeTo, y: yLane },
          { x: xEscapeTo, y: endY },
          { x: xIn, y: endY },
          { x: endX, y: endY },
        ];
      }

      const path = this.pointsToPath(chosen);

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
  // ✅ Recalculer (snap contraintes + deps)
  // =======================
  recalculateSchedule(): void {
    if (!this.project || !this.ganttStartDate) return;

    // Base: toutes les tâches (hors synthèses)
    const tasksFlat = this.getAllTasksFlat();
    if (!tasksFlat.length) return;

    // 1) Construire schedule nodes initiaux (depuis overrides si existants, sinon depuis dates/phase)
    const schedules = new Map<string, ScheduleNode>();

    const totalDays0 = this.ganttMonthsCount * this.projectService.daysPerMonth;

    for (const t of tasksFlat) {
      const id = String(t.id);

      // durée actuelle = (end-start) depuis override/date/phase
      let start = 0;
      let end = 0;

      const ov = this.scheduleOverrides[id];
      if (ov) {
        start = ov.startDayIndex;
        end = ov.endDayIndex;
      } else {
        // fallback sur dates du modèle si présentes
        const s = this.projectService.parseIsoDateToDayIndex((t as any).startDate ?? '', this.ganttStartDate);
        const e = this.projectService.parseIsoDateToDayIndex((t as any).endDate ?? '', this.ganttStartDate);

        if (s !== null || e !== null) {
          start = (s ?? 0);
          end = (e ?? (start + (this.projectService.daysPerMonth - 1)));
        } else {
          // fallback sur phase
          const ph: PhaseId = ((t as any).phase ?? 'Phase1') as PhaseId;
          const mi = this.projectService.phaseToMonthIndex[ph] ?? 0;
          start = mi * this.projectService.daysPerMonth;
          end = start + (this.projectService.daysPerMonth - 1);
        }
      }

      start = Math.max(0, start);
      end = Math.max(start, end);

      // timeline peut s’étendre
      if (end >= totalDays0) this.ensureTimelineForEndDay(end);

      schedules.set(id, {
        id,
        start,
        end,
        duration: Math.max(0, end - start),
      });
    }

    // 2) Graphe dépendances
    const deps = this.getProjectDependencies()
      .map(d => ({
        from: String(d.fromId),
        to: String(d.toId),
        type: (d.type ?? 'F2S') as DependencyType,
      }))
      .filter(d => schedules.has(d.from) && schedules.has(d.to) && d.from !== d.to);

    const incoming = new Map<string, Array<{ from: string; type: DependencyType }>>();
    const outgoing = new Map<string, Array<{ to: string; type: DependencyType }>>();
    const indeg = new Map<string, number>();

    for (const id of schedules.keys()) {
      incoming.set(id, []);
      outgoing.set(id, []);
      indeg.set(id, 0);
    }

    for (const d of deps) {
      incoming.get(d.to)!.push({ from: d.from, type: d.type });
      outgoing.get(d.from)!.push({ to: d.to, type: d.type });
      indeg.set(d.to, (indeg.get(d.to) ?? 0) + 1);
    }

    // 3) Topo-sort (Kahn). En cas de cycle, on garde un ordre “stable”
    const queue: string[] = [];
    for (const [id, k] of indeg.entries()) {
      if (k === 0) queue.push(id);
    }
    queue.sort();

    const topo: string[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      topo.push(id);

      for (const e of outgoing.get(id) ?? []) {
        const to = e.to;
        indeg.set(to, (indeg.get(to) ?? 0) - 1);
        if (indeg.get(to) === 0) {
          queue.push(to);
          queue.sort();
        }
      }
    }

    // Cycle -> ajoute les restants
    if (topo.length < schedules.size) {
      const missing = [...schedules.keys()].filter(x => !topo.includes(x));
      missing.sort();
      topo.push(...missing);
      this.setTableDateError('recalc', 'Attention : dépendances cycliques détectées (ordre approximatif).');
    }

    // 4) Forward pass avec SNAP contraintes
    for (const id of topo) {
      const node = schedules.get(id)!;

      const task = tasksFlat.find(x => String(x.id) === id) ?? null;
      const c = this.getConstraintsFromTask(task);

      const cStartMin = c?.startNoEarlierThan ? this.isoToDayIndexOrNull(c.startNoEarlierThan, this.ganttStartDate) : null;
      const cStartMax = c?.startNoLaterThan ? this.isoToDayIndexOrNull(c.startNoLaterThan, this.ganttStartDate) : null;
      const cEndMin   = c?.endNoEarlierThan   ? this.isoToDayIndexOrNull(c.endNoEarlierThan, this.ganttStartDate) : null;
      const cEndMax   = c?.endNoLaterThan     ? this.isoToDayIndexOrNull(c.endNoLaterThan, this.ganttStartDate) : null;

      // 1) Dépendances -> bornes "earliest"
      let earliestStart = 0;
      let earliestEnd = 0;

      for (const inc of incoming.get(id) ?? []) {
        const from = schedules.get(inc.from);
        if (!from) continue;

        if (inc.type === 'F2S') earliestStart = Math.max(earliestStart, from.end + 1);
        else if (inc.type === 'S2S') earliestStart = Math.max(earliestStart, from.start);
        else if (inc.type === 'F2F') earliestEnd = Math.max(earliestEnd, from.end);
      }

      // 2) Contraintes -> bornes earliest / latest
      if (cStartMin !== null) earliestStart = Math.max(earliestStart, cStartMin);
      if (cEndMin !== null) earliestEnd = Math.max(earliestEnd, cEndMin);

      // end >= earliestEnd => start >= earliestEnd - duration
      earliestStart = Math.max(earliestStart, earliestEnd - node.duration);

      // latestStart
      let latestStart = Number.POSITIVE_INFINITY;
      if (cStartMax !== null) latestStart = Math.min(latestStart, cStartMax);
      if (cEndMax !== null) latestStart = Math.min(latestStart, cEndMax - node.duration);

      if (!Number.isFinite(latestStart)) latestStart = Number.POSITIVE_INFINITY;

      // 3) Choix "snap"
      const hasAnyConstraint = !!(cStartMin || cStartMax || cEndMin || cEndMax);

      let targetStart = node.start; // défaut: conserver
      if (hasAnyConstraint) {
        if (cStartMin !== null || cEndMin !== null) {
          // ASAP (colle au plus tôt)
          targetStart = earliestStart;
        } else if (cStartMax !== null || cEndMax !== null) {
          // ALAP (colle au plus tard)
          targetStart = latestStart;
        }
      }

      // 4) Clamp dans fenêtre
      if (latestStart !== Number.POSITIVE_INFINITY && latestStart < earliestStart) {
        this.setTableDateError(id, "Contraintes/dépendances incompatibles (fenêtre impossible).");
        targetStart = earliestStart;
      } else {
        if (latestStart !== Number.POSITIVE_INFINITY) {
          targetStart = this.clamp(targetStart, earliestStart, latestStart);
        } else {
          // pas de borne haute -> juste au moins earliestStart
          targetStart = Math.max(targetStart, earliestStart);
        }
      }

      let start = targetStart;
      let end = start + node.duration;

      // Extend timeline si besoin
      if (end >= (this.ganttMonthsCount * this.projectService.daysPerMonth)) this.ensureTimelineForEndDay(end);
      const totalDays = this.ganttMonthsCount * this.projectService.daysPerMonth;

      start = this.clamp(start, 0, totalDays - 1);
      end = this.clamp(end, start, totalDays - 1);

      schedules.set(id, { id, start, end, duration: node.duration });
    }

    // 5) Appliquer sur le GanttView + scheduleOverrides + sync vers modèle
    for (const [id, s] of schedules.entries()) {
      const view = this.ganttTasksView.find(v => String(v.id) === id);
      if (!view) continue;

      view.startDayIndex = s.start;
      view.endDayIndex = s.end;

      const mStart = this.dayIndexToMonthIndex(s.start);
      const mEnd = this.dayIndexToMonthIndex(s.end);

      view.monthIndex = mStart;
      view.startMonthIndex = mStart;
      view.endMonthIndex = mEnd;
      view.phase = this.monthIndexToPhaseId(mStart);

      view.x = this.ganttLeftPadding + s.start * this.dayWidth + this.taskInnerMargin;
      view.width = (s.end - s.start + 1) * this.dayWidth - 2 * this.taskInnerMargin;

      this.scheduleOverrides[id] = { startDayIndex: s.start, endDayIndex: s.end };

      // sync dates ISO dans la matrice via service
      this.syncTaskDatesToModel(view);
    }

    // 6) Recalcule synthèses + liens
    for (const a of this.orderedActivities) this.updateSummaryForActivity(a);
    this.updateGanttLinks();
  }

  // =======================
  // Table helpers
  // =======================
  getTotalLeafTaskCount(): number {
    return this.ganttTasksView.filter((t) => !String(t.id).startsWith('summary-')).length;
  }

  getCollapsedGroupCount(): number {
    return this.orderedActivities.filter((id) => this.activityCollapse[id]).length;
  }

  getActivityGroupCount(): number {
    return this.orderedActivities.length;
  }

  getActivityTaskCount(activityId: ActivityId): number {
    return this.ganttTasksView.filter((t) => t.activityId === activityId && !String(t.id).startsWith('summary-')).length;
  }

  getActivityProgressPercent(activityId: ActivityId): number {
    const tasks = this.ganttTasksView.filter((t) => t.activityId === activityId && !String(t.id).startsWith('summary-'));
    if (!tasks.length) return 0;
    const total = tasks.reduce((acc, t) => acc + this.getTaskProgressPercent(t), 0);
    return Math.round(total / tasks.length);
  }

  getActivityCssClass(activityId: ActivityId): string {
    return `activity-${activityId}`;
  }

  getActivityCode(activityId: ActivityId): string {
    switch (activityId) {
      case 'projet':
        return 'PRJ';
      case 'metier':
        return 'MET';
      case 'changement':
        return 'CHG';
      case 'technologie':
        return 'TEC';
      default:
        return 'ACT';
    }
  }

  getTaskBarClass(task: GanttTaskView): string {
    const base = task.id.startsWith('summary-') ? 'gantt-bar gantt-bar-summary' : 'gantt-bar';
    const activityClass = `gantt-bar--${task.activityId}`;
    const highlight = this.isTaskHighlighted(task.id) ? ' gantt-bar--highlight' : '';
    const dim = this.isTaskDimmed(task.id) ? ' gantt-bar--dim' : '';
    return `${base} ${activityClass}${highlight}${dim}`;
  }

  getTaskBulletClass(task: GanttTaskView, side: 'start' | 'end'): string {
    const sideClass = side === 'end' ? 'gantt-bar-bullet-end' : 'gantt-bar-bullet-start';
    const activityClass = `gantt-bullet--${task.activityId}`;
    const highlight = this.isTaskHighlighted(task.id) ? ' gantt-bullet--highlight' : '';
    const dim = this.isTaskDimmed(task.id) ? ' gantt-bullet--dim' : '';
    return `gantt-bar-bullet ${sideClass} ${activityClass}${highlight}${dim}`;
  }

  getTaskStatusText(task: GanttTaskView): string {
    const base = this.baseTasks.find((b) => b.task.id === task.id)?.task;
    const status = (base as any)?.status as ActivityStatus | undefined;
    switch (status) {
      case 'done':
        return 'Done';
      case 'inprogress':
        return 'In progress';
      case 'onhold':
        return 'On hold';
      case 'notdone':
        return 'Not done';
      case 'notapplicable':
        return 'N/A';
      case 'todo':
      default:
        return 'Todo';
    }
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

  private getMouseYInSvg(event: MouseEvent): number {
    const svg = event.currentTarget as SVGSVGElement | null;
    if (!svg) return event.clientY;

    const ctm = svg.getScreenCTM();
    if (!ctm) return event.clientY;

    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;

    const loc = pt.matrixTransform(ctm.inverse());
    return loc.y;
  }

  private getTaskAnchor(task: GanttTaskView, side: LinkAnchorSide): { x: number; y: number } {
    return {
      x: side === 'start' ? task.x : task.x + task.width,
      y: task.y + task.height / 2,
    };
  }

  private findClosestLinkTarget(
    mouseX: number,
    mouseY: number,
    fromTaskId: string
  ): { taskId: string; side: LinkAnchorSide; x: number; y: number } | null {
    let best: { taskId: string; side: LinkAnchorSide; x: number; y: number; d2: number } | null = null;
    const maxD2 = this.linkSnapDistancePx * this.linkSnapDistancePx;

    for (const t of this.ganttTasksView) {
      if (String(t.id).startsWith('summary-')) continue;
      if (String(t.id) === String(fromTaskId)) continue;

      const startA = this.getTaskAnchor(t, 'start');
      const endA = this.getTaskAnchor(t, 'end');

      const d2Start = (startA.x - mouseX) * (startA.x - mouseX) + (startA.y - mouseY) * (startA.y - mouseY);
      const d2End = (endA.x - mouseX) * (endA.x - mouseX) + (endA.y - mouseY) * (endA.y - mouseY);

      if (d2Start <= maxD2 && (!best || d2Start < best.d2)) {
        best = { taskId: t.id, side: 'start', x: startA.x, y: startA.y, d2: d2Start };
      }
      if (d2End <= maxD2 && (!best || d2End < best.d2)) {
        best = { taskId: t.id, side: 'end', x: endA.x, y: endA.y, d2: d2End };
      }
    }

    if (!best) return null;
    return { taskId: best.taskId, side: best.side, x: best.x, y: best.y };
  }

  getLinkDraftPath(): string {
    if (!this.linkDraft) return '';
    const { fromX, fromY, toX, toY } = this.linkDraft;
    const midX = fromX + (toX - fromX) * 0.45;
    return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  }

  private clearLinkDraft(): void {
    this.linkDraft = null;
  }

  private addDependencyFromLinkDrag(fromId: string, toId: string, side: LinkAnchorSide): void {
    if (!this.project) return;
    if (!fromId || !toId || fromId === toId) return;

    this.ensureProjectDependenciesContainer();
    const type: DependencyType = side === 'start' ? 'F2S' : 'F2F';
    const anyProj = this.project as any;
    const allDeps: GanttDependency[] = Array.isArray(anyProj.ganttDependencies) ? anyProj.ganttDependencies : [];

    const exists = allDeps.some(
      (d) =>
        String(d.fromId) === String(fromId) &&
        String(d.toId) === String(toId) &&
        String(d.type ?? 'F2S') === String(type)
    );
    if (exists) return;

    anyProj.ganttDependencies = [...allDeps, { fromId, toId, type }];
    this.depsSignature = this.computeDepsSignature();
    this.updateGanttLinks();
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
    this.dragStartClientY = event.clientY;
    this.dragStartTaskX = task.x;
    this.dragHasMoved = false;

    this.computePreviewDaysFromX(task);
    this.showHintsForDraggingTask(task);

    event.stopPropagation();
    event.preventDefault();
  }

  onGanttBarResizeEndMouseDown(event: MouseEvent, task: GanttTaskView): void {
    if (String(task.id).startsWith('summary-')) return;

    // Par défaut : création de lien par drag depuis l'extrémité droite.
    // Alt + drag conserve le redimensionnement de fin.
    if (!event.altKey) {
      this.dragMode = 'link-create';
      this.clickCandidateTask = null;
      this.draggingTask = task;
      this.dragHasMoved = false;
      this.dragStartClientX = event.clientX;
      this.dragStartClientY = event.clientY;

      const from = this.getTaskAnchor(task, 'end');
      this.linkDraft = {
        fromTaskId: task.id,
        fromX: from.x,
        fromY: from.y,
        toX: from.x,
        toY: from.y,
        targetTaskId: null,
        targetSide: null,
      };

      this.hideHints();
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    this.dragMode = 'resize-end';
    this.clickCandidateTask = null;

    this.draggingTask = task;
    this.dragHasMoved = false;
    this.dragStartClientY = event.clientY;

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

    if (this.dragMode === 'link-create') {
      const dx = event.clientX - this.dragStartClientX;
      const dy = event.clientY - this.dragStartClientY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.dragHasMoved = true;

      if (!this.linkDraft) return;

      const mx = this.getMouseXInSvg(event);
      const my = this.getMouseYInSvg(event);
      const snap = this.findClosestLinkTarget(mx, my, this.linkDraft.fromTaskId);

      if (snap) {
        this.linkDraft = {
          ...this.linkDraft,
          toX: snap.x,
          toY: snap.y,
          targetTaskId: snap.taskId,
          targetSide: snap.side,
        };
      } else {
        this.linkDraft = {
          ...this.linkDraft,
          toX: mx,
          toY: my,
          targetTaskId: null,
          targetSide: null,
        };
      }
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

    if (this.dragMode === 'link-create') {
      if (
        this.linkDraft &&
        this.linkDraft.targetTaskId &&
        this.linkDraft.targetSide
      ) {
        this.addDependencyFromLinkDrag(
          this.linkDraft.fromTaskId,
          this.linkDraft.targetTaskId,
          this.linkDraft.targetSide
        );
      }

      this.draggingTask = null;
      this.dragMode = 'move';
      this.resizeFixedStartDayIndex = null;
      this.clearLinkDraft();
      this.hideHints();
      return;
    }

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
      this.clearLinkDraft();
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
      this.clearLinkDraft();
      this.hideHints();
      return;
    }
  }

  // =======================
  // Modal Roadmap
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

    if (this.project?.taskMatrix) {
  this.projectService.registerProject(this.project);
}


    this.taskBeingEdited = ctx.task;
    this.editingActivityId = ctx.activityId;
    this.editingPhase = ctx.phase;

    this.editedTaskLabel = ctx.task.label ?? '';
    this.editedTaskStatus = ctx.task.status;

    this.editedStartDate = (ctx.task as any).startDate ?? '';
    this.editedEndDate = (ctx.task as any).endDate ?? '';

    this.editedCategory = (ctx.task as any).category ?? 'projectManagement';
    this.editedPhase = (ctx.task as any).phase ?? ctx.phase;

    // ✅ charge contraintes
    this.editedConstraints = this.getConstraintsFromTask(ctx.task) ?? {};

    this.ensureProjectDependenciesContainer();
    const deps = this.getProjectDependencies().filter(d => d.fromId === ctx.task.id);
    this.editedDependencies = deps.map(d => ({ toId: d.toId, type: d.type ?? 'F2S' }));

    if (this.filterLinksInGantt) {
      this.filterTaskId = ctx.task.id;
      this.updateGanttLinks();
    }

    this.showMoreInfos = false;
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

  toggleMoreInfos(): void {
    this.showMoreInfos = !this.showMoreInfos;
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

    // ✅ Valide contraintes (cohérence simple)
    const constraints: TaskConstraints = {
      startNoEarlierThan: (this.editedConstraints.startNoEarlierThan ?? '').trim() || undefined,
      startNoLaterThan: (this.editedConstraints.startNoLaterThan ?? '').trim() || undefined,
      endNoEarlierThan: (this.editedConstraints.endNoEarlierThan ?? '').trim() || undefined,
      endNoLaterThan: (this.editedConstraints.endNoLaterThan ?? '').trim() || undefined,
    };

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

    // ✅ appliquer contraintes sur la tâche (persistées dans la matrice)
    this.setConstraintsOnTask(this.taskBeingEdited, constraints);

    // ✅ deps -> project.ganttDependencies
    this.ensureProjectDependenciesContainer();
    const anyProj = this.project as any;
    const allDeps: GanttDependency[] = Array.isArray(anyProj.ganttDependencies) ? anyProj.ganttDependencies : [];
    const kept = allDeps.filter(d => d.fromId !== curTaskId);
    const added: GanttDependency[] = cleaned.map(r => ({ fromId: curTaskId, toId: r.toId, type: r.type }));
    anyProj.ganttDependencies = [...kept, ...added];

    // ✅ updateTask (ne touche pas aux contraintes)
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

    // ✅ rebuild
    this.buildRoadmap();
    this.depsSignature = this.computeDepsSignature();

    if (this.filterLinksInGantt) {
      this.filterTaskId = curTaskId;
    }

    this.updateGanttLinks();
    modal.close();
  }
}
