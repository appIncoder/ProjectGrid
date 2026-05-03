import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

import type { ProjectDetail } from '../../models/project.model';
import type { KanbanStatus, LaneId, KanbanResource, KanbanCard, SprintInfo, Lane } from '../../models/kanban.model';
import type {
  ActivityId,
  ActivityStatus,
  DependencyType,
  EditableDependencyRow,
  GanttDependency,
  PhaseId,
  ProjectWorkflow,
  Task,
  TaskCategory,
  UserRef,
} from '../../models';
import { AuthService } from '../../services/auth.service';
import { ProjectDataService } from '../../services/project-data.service';
import { ProjectService } from '../../services/project.service';
import { TaskAssignmentPopover } from '../task-assignment-popover/task-assignment-popover';
import { ProjectTaskEditModal } from '../project-task-edit-modal/project-task-edit-modal';
import { TaskHoverTooltip } from '../task-hover-tooltip/task-hover-tooltip';
import { AppButton } from '../design-system/button/button';

// Lane type imported from models (see import above)

@Component({
  selector: 'app-project-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, NgbModalModule, ProjectTaskEditModal, TaskHoverTooltip, TaskAssignmentPopover, AppButton],
  templateUrl: './project-board.html',
  styleUrls: ['./project-board.scss'],
})
export class ProjectBoard implements OnChanges, OnDestroy {
  readonly swimlaneFilterOptions: Array<{ value: TaskCategory; label: string }> = [
    { value: 'projectManagement', label: 'Gestion de projet' },
    { value: 'businessManagement', label: 'Gestion du métier' },
    { value: 'changeManagement', label: 'Gestion du changement' },
    { value: 'technologyManagement', label: 'Gestion de la technologie' },
  ];

  /** Projet (pour déduire les lanes + éventuellement des cartes) */
  @Input() project: ProjectDetail | null = null;
  @Input() users: UserRef[] = [];

  /**
   * Données Kanban (recommandé): tu passes explicitement les cartes.
   * Si non fourni, le composant peut générer une base à partir du projet (fallback simple).
   */
  @Input() cards: KanbanCard[] | null = null;
  @ViewChild('boardWrap', { static: false }) boardWrapRef?: ElementRef<HTMLElement>;

  /** Infos sprint affichées dans l’en-tête */
  @Input() sprint: SprintInfo = {
    name: 'Sprint en cours',
    goal: '',
    start: '',
    end: '',
  };

  /** Notifie le parent après un déplacement */
  @Output() cardsChange = new EventEmitter<KanbanCard[]>();

  taskHoverCard: {
    x: number;
    y: number;
    label: string;
    start: string;
    end: string;
    status: string;
  } | null = null;
  assignmentPopover: {
    x: number;
    y: number;
    roleLabel: string;
    roleField: 'reporter' | 'accountant' | 'responsible';
    selectedUserId: string;
    cardId: string;
  } | null = null;

  itemStatusOptions: { value: ActivityStatus; label: string }[] = [
    { value: 'todo',          label: 'To Do' },
    { value: 'inprogress',    label: 'In Progress' },
    { value: 'onhold',        label: 'On Hold' },
    { value: 'done',          label: 'Done' },
    { value: 'notdone',       label: 'Not Done' },
    { value: 'notapplicable', label: 'N/A' },
  ];

  itemCategoryOptions: { value: TaskCategory; label: string }[] = [
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
  isCreateMode = false;

  editedItemLabel = '';
  editedItemStatus: ActivityStatus = 'todo';
  editedStartDate = '';
  editedEndDate = '';
  editedCategory: TaskCategory = 'projectManagement';
  editedPhase: PhaseId | null = null;
  editedReporterId = '';
  editedAccountantId = '';
  editedResponsibleId = '';
  editedDependencies: EditableDependencyRow[] = [];
  editError: string | null = null;

  // État ouvert/fermé des swimlanes
  laneCollapsed: Record<string, boolean> = {};
  focusedLaneId: string | null = null;
  fullscreenTopOffset = 0;
  fullscreenBottomOffset = 0;
  selectedSwimlaneCategories = new Set<TaskCategory>(
    this.swimlaneFilterOptions.map((option) => option.value)
  );

  toggleLane(laneId: string): void {
    this.laneCollapsed[laneId] = !this.laneCollapsed[laneId];
  }

  isLaneCollapsed(laneId: string): boolean {
    return !!this.laneCollapsed[laneId];
  }

  minimizeLane(laneId: string): void {
    this.laneCollapsed[laneId] = true;
    if (this.focusedLaneId === laneId) {
      this.focusedLaneId = null;
      this.syncDisplayedLanes();
    }
  }

  restoreBoardView(laneId?: string): void {
    if (laneId) {
      this.laneCollapsed[laneId] = false;
    }
    this.focusedLaneId = null;
    this.releaseFullscreenViewport();
    this.syncDisplayedLanes();
  }

  maximizeLane(laneId: string): void {
    this.laneCollapsed[laneId] = false;
    this.focusedLaneId = laneId;
    this.captureFullscreenViewport();
    this.syncDisplayedLanes();
  }

  isLaneFocused(laneId: string): boolean {
    return this.focusedLaneId === laneId;
  }

  toggleSwimlaneCategory(category: TaskCategory): void {
    if (this.selectedSwimlaneCategories.has(category)) {
      this.selectedSwimlaneCategories.delete(category);
    } else {
      this.selectedSwimlaneCategories.add(category);
    }
    this.syncVisibleLanes();
  }

  selectAllSwimlanes(): void {
    this.selectedSwimlaneCategories = new Set(
      this.swimlaneFilterOptions.map((option) => option.value)
    );
    this.syncVisibleLanes();
  }

  isSwimlaneCategorySelected(category: TaskCategory): boolean {
    return this.selectedSwimlaneCategories.has(category);
  }

  // ── Filtre de phases ────────────────────────────────────────────────────────
  selectedPhases = new Set<PhaseId>();
  activePhase: PhaseId | null = null;
  private phasesInitialized = false;

  private computeActivePhase(): PhaseId | null {
    if (!this.project) return null;
    const defs = (this.project as any).phaseDefinitions as Record<string, { isCurrent?: boolean }> | undefined;
    if (defs) {
      for (const phase of this.project.phases) {
        if (defs[phase]?.isCurrent) return phase;
      }
    }
    return this.project.phases[0] ?? null;
  }

  togglePhase(phase: PhaseId): void {
    if (this.selectedPhases.has(phase)) {
      this.selectedPhases.delete(phase);
    } else {
      this.selectedPhases.add(phase);
    }
    this.buildBoard();
  }

  selectAllPhases(): void {
    this.selectedPhases = new Set(this.project?.phases ?? []);
    this.buildBoard();
  }

  deselectAllPhases(): void {
    this.selectedPhases.clear();
    this.buildBoard();
  }

  selectActivePhase(): void {
    if (!this.activePhase) return;
    this.selectedPhases = new Set([this.activePhase]);
    this.buildBoard();
  }

  isPhaseSelected(phase: PhaseId): boolean {
    return this.selectedPhases.has(phase);
  }

  getPhaseLabel(phase: PhaseId): string {
    const defs = (this.project as any)?.phaseDefinitions as Record<string, { label?: string }> | undefined;
    const label = defs?.[phase]?.label ?? phase;
    // Retourne les 2 premières lettres de chaque mot, max 3 chars
    return label.split(/[\s\-_]+/).map((w: string) => w[0] ?? '').join('').slice(0, 3).toLowerCase() || phase;
  }

  statuses: Array<{ id: KanbanStatus; label: string }> = [];
  workflowSaveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  workflowError: string | null = null;

  lanes: Lane[] = [];
  visibleLanes: Lane[] = [];
  displayedLanes: Lane[] = [];
  laneBuckets: Record<string, Record<string, KanbanCard[]>> = {};
  cardRoles: Record<string, { rep?: string; acc?: string; res?: string }> = {};
  private workflowSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private authService: AuthService,
    private dataService: ProjectDataService,
    private projectService: ProjectService,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.clearWorkflowSaveTimer();
    this.releaseFullscreenViewport();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.focusedLaneId) {
      this.captureFullscreenViewport();
    }
    this.hideAssignmentPopover();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.hideAssignmentPopover();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] || changes['cards'] || changes['users']) {
      if (changes['project']) {
        this.phasesInitialized = false;
        this.workflowSaveState = 'idle';
        this.workflowError = null;
        this.clearWorkflowSaveTimer();
      }
      if (this.project) {
        this.projectService.registerProject(this.project);
      }
      this.buildBoard();
    }
  }

  /** Construit les lanes + bucket par statut */
  private buildBoard(): void {
    this.statuses = this.resolveWorkflowStatuses();
    this.lanes = this.buildLanesFromProject(this.project);
    this.syncVisibleLanes();

    for (const lane of this.lanes) {
      if (this.laneCollapsed[lane.id] === undefined) {
        this.laneCollapsed[lane.id] = false;
      }
    }

    // Init filtre de phases (une seule fois par projet)
    if (!this.phasesInitialized) {
      this.phasesInitialized = true;
      this.activePhase = this.computeActivePhase();
      this.selectedPhases = new Set(this.activePhase ? [this.activePhase] : (this.project?.phases ?? []));
    }

    const data = (this.cards && this.cards.length)
      ? this.cards
      : this.buildFallbackCardsFromProject(this.project);

    this.laneBuckets = {};
    for (const lane of this.lanes) {
      this.laneBuckets[lane.id] = this.createEmptyStatusBuckets();
    }

    for (const c of data) {
      const laneId = this.laneBuckets[c.laneId] ? c.laneId : (this.lanes[0]?.id ?? 'default');
      const status = this.resolveBoardStatus(c.status);
      if (!this.laneBuckets[laneId]) {
        this.laneBuckets[laneId] = this.createEmptyStatusBuckets();
      }
      this.laneBuckets[laneId][status] ??= [];
      this.laneBuckets[laneId][status].push({ ...c, laneId, status });
    }

    this.buildCardRoles();
  }

  private buildCardRoles(): void {
    this.cardRoles = {};
    if (!this.project) return;
    const userMap = new Map(this.users.map(u => [u.id, u.label]));
    const taskMatrix = (this.project as any).taskMatrix as Record<string, Record<string, any[]>> | undefined;
    if (!taskMatrix) return;
    for (const activityId of Object.keys(taskMatrix)) {
      for (const phase of this.project.phases) {
        for (const task of taskMatrix[activityId]?.[phase] ?? []) {
          this.cardRoles[`${activityId}:${phase}:${task.id}`] = {
            rep: task.reporterId ? (userMap.get(task.reporterId) ?? task.reporterId) : undefined,
            acc: task.accountantId ? (userMap.get(task.accountantId) ?? task.accountantId) : undefined,
            res: task.responsibleId ? (userMap.get(task.responsibleId) ?? task.responsibleId) : undefined,
          };
        }
      }
    }
  }

  /** Lanes = catégories d’activité du projet */
  private buildLanesFromProject(project: ProjectDetail | null): Lane[] {
    const acts = (project as any)?.activities as Record<string, { id: string; label: string; sequence?: number | null }> | undefined;
    if (acts && Object.keys(acts).length) {
      return Object.values(acts)
        .sort((a, b) => {
          const aSeq = Number.isFinite(a.sequence as number) ? Number(a.sequence) : Number.POSITIVE_INFINITY;
          const bSeq = Number.isFinite(b.sequence as number) ? Number(b.sequence) : Number.POSITIVE_INFINITY;
          if (aSeq !== bSeq) return aSeq - bSeq;
          return (a.label ?? '').localeCompare(b.label ?? '', 'fr', { sensitivity: 'base' });
        })
        .map((a) => ({ id: a.id, label: a.label }));
    }

    // fallback si activities absent
    return [
      { id: 'projet', label: 'Gestion du projet' },
      { id: 'metier', label: 'Gestion du métier' },
      { id: 'changement', label: 'Gestion du changement' },
      { id: 'technologie', label: 'Gestion de la technologie' },
    ];
  }

  private resolveWorkflowStatuses(): Array<{ id: KanbanStatus; label: string }> {
    const workflow = (this.project?.workflow as ProjectWorkflow | undefined) ?? null;
    const statuses = workflow?.statuses?.length ? workflow.statuses : [
      { id: 'todo', label: 'To Do', sequence: 1 },
      { id: 'inprogress', label: 'In Progress', sequence: 2 },
      { id: 'onhold', label: 'On Hold', sequence: 3 },
      { id: 'done', label: 'Done', sequence: 4 },
      { id: 'notdone', label: 'Not Done', sequence: 5 },
      { id: 'notapplicable', label: 'N/A', sequence: 6 },
    ];

    const ordered = statuses
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((status) => ({ id: status.id, label: status.label }));
    this.syncItemStatusOptions(ordered);
    return ordered;
  }

  get canManageColumnOrder(): boolean {
    const user = this.authService.user;
    if (!user?.id) return false;
    if (this.authService.isAccessCheckActive) {
      return this.authService.hasEffectiveProjectRole(this.project, ['projectManager']);
    }
    if (this.authService.isSuperUser) return true;
    const email = String(user.username ?? '').trim().toLowerCase();
    if (!email) return false;
    const ownerEmail = String(this.project?.owner ?? '').trim().toLowerCase();
    return !!ownerEmail && email === ownerEmail;
  }

  async onStatusDrop(ev: CdkDragDrop<Array<{ id: KanbanStatus; label: string }>>): Promise<void> {
    if (!this.project?.id || !this.canManageColumnOrder || this.workflowSaveState === 'saving') return;
    if (ev.previousIndex === ev.currentIndex) return;

    const previousStatuses = this.statuses.map((status) => ({ ...status }));
    const nextStatuses = this.statuses.map((status) => ({ ...status }));
    moveItemInArray(nextStatuses, ev.previousIndex, ev.currentIndex);
    this.statuses = nextStatuses;
    this.syncItemStatusOptions(this.statuses);
    this.workflowSaveState = 'saving';
    this.workflowError = null;
    this.clearWorkflowSaveTimer();

    const workflow = this.buildWorkflowFromStatuses(nextStatuses);

    try {
      await this.dataService.saveProjectWorkflow(this.project.id, workflow);
      (this.project as ProjectDetail & { workflow?: ProjectWorkflow }).workflow = workflow;
      this.projectService.registerProject(this.project);
      this.buildBoard();
      this.workflowSaveState = 'saved';
      this.cdr.detectChanges();
      this.workflowSaveTimer = setTimeout(() => {
        this.workflowSaveState = 'idle';
        this.cdr.detectChanges();
      }, 1500);
    } catch (error) {
      console.error('[ProjectBoard] saveProjectWorkflow error', error);
      this.statuses = previousStatuses;
      this.syncItemStatusOptions(this.statuses);
      this.buildBoard();
      this.workflowError = "Impossible de sauvegarder l'ordre des colonnes.";
      this.workflowSaveState = 'error';
      this.cdr.detectChanges();
    }
  }

  private buildWorkflowFromStatuses(statuses: Array<{ id: KanbanStatus; label: string }>): ProjectWorkflow {
    return {
      statuses: statuses.map((status, index) => ({
        id: status.id as ActivityStatus,
        label: String(status.label ?? '').trim() || status.id,
        sequence: index + 1,
      })),
    };
  }

  private syncItemStatusOptions(statuses: Array<{ id: KanbanStatus; label: string }>): void {
    this.itemStatusOptions = statuses.map((status) => ({
      value: status.id as ActivityStatus,
      label: status.label,
    }));
  }

  private clearWorkflowSaveTimer(): void {
    if (!this.workflowSaveTimer) return;
    clearTimeout(this.workflowSaveTimer);
    this.workflowSaveTimer = null;
  }

  private createEmptyStatusBuckets(): Record<string, KanbanCard[]> {
    return this.statuses.reduce<Record<string, KanbanCard[]>>((acc, status) => {
      acc[status.id] = [];
      return acc;
    }, {});
  }

  private resolveBoardStatus(status?: string): KanbanStatus {
    const normalized = this.mapLegacyStatusToKanban(status);
    if (this.statuses.some((item) => item.id === normalized)) return normalized;
    return this.statuses[0]?.id ?? 'todo';
  }

  /**
   * Fallback : si tu n’as pas encore un modèle “kanban”, on génère des cartes à partir du taskMatrix.
   * Ici on met tout en "todo" par défaut (tu pourras mapper selon tes statuts).
   */
  private buildFallbackCardsFromProject(project: ProjectDetail | null): KanbanCard[] {
    const p: any = project;
    const taskMatrix = p?.taskMatrix as Record<string, Record<string, Array<{ id: string; label: string; status?: string }>>> | undefined;
    if (!taskMatrix) return [];

    const cards: KanbanCard[] = [];
    for (const laneKey of Object.keys(taskMatrix)) {
      const phases = taskMatrix[laneKey] || {};
      for (const phaseKey of Object.keys(phases)) {
        if (this.selectedPhases.size > 0 && !this.selectedPhases.has(phaseKey as PhaseId)) continue;
        const tasks = phases[phaseKey] || [];
        for (const t of tasks) {
          cards.push({
            id: `${laneKey}:${phaseKey}:${t.id}`,
            title: t.label,
            description: `Phase: ${phaseKey}`,
            assignees: [],
            status: this.mapLegacyStatusToKanban(t.status),
            laneId: laneKey, // si tes lanes = keys, sinon adapte
          });
        }
      }
    }
    return cards;
  }

  private mapLegacyStatusToKanban(s?: string): KanbanStatus {
    const normalized = String(s ?? '').trim().toLowerCase();
    if (!normalized) return 'todo';
    if (normalized === 'blocked') return 'onhold';
    return normalized;
  }

  private mapKanbanToTaskStatus(s: KanbanStatus): ActivityStatus {
    return this.resolveBoardStatus(s) as ActivityStatus;
  }

  /** Identifiant drop-list unique pour connecter les colonnes entre elles DANS une lane */
  dropListId(laneId: string, status: KanbanStatus): string {
    return `lane:${laneId}:status:${status}`;
  }

  /** Les drop-lists connectées pour une lane = les 4 statuts */
  connectedListsForLane(laneId: string): string[] {
    return this.statuses.map(s => this.dropListId(laneId, s.id));
  }

  private formatIsoDate(iso?: string): string {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
  }

  private getTaskStatusText(status: ActivityStatus): string {
    return this.mapCardStatusToLabel(status);
  }

  private mapCardStatusToLabel(status: KanbanStatus): string {
    return this.statuses.find((item) => item.id === status)?.label ?? status;
  }

  getLaneTicketCount(laneId: string): number {
    const bucket = this.laneBuckets[laneId];
    if (!bucket) return 0;
    return this.statuses.reduce((total, status) => total + (bucket[status.id]?.length ?? 0), 0);
  }

  getStatusAccentColor(status: KanbanStatus): string {
    switch (status) {
      case 'todo':
        return '#6B778C';
      case 'inprogress':
        return '#0052CC';
      case 'onhold':
        return '#FF8B00';
      case 'done':
        return '#00875A';
      case 'notdone':
        return '#DE350B';
      case 'notapplicable':
        return '#97A0AF';
      default:
        return '#6554C0';
    }
  }

  getStatusTagBackground(status: KanbanStatus): string {
    switch (status) {
      case 'todo':
        return '#F4F5F7';
      case 'inprogress':
        return '#DEEBFF';
      case 'onhold':
        return '#FFF0B3';
      case 'done':
        return '#E3FCEF';
      case 'notdone':
        return '#FFEBE6';
      case 'notapplicable':
        return '#F1F2F4';
      default:
        return '#EEE9FF';
    }
  }

  getStatusTagColor(status: KanbanStatus): string {
    switch (status) {
      case 'todo':
        return '#6B778C';
      case 'inprogress':
        return '#0052CC';
      case 'onhold':
        return '#974F0C';
      case 'done':
        return '#006644';
      case 'notdone':
        return '#AE2E24';
      case 'notapplicable':
        return '#5E6C84';
      default:
        return '#403294';
    }
  }

  getTaskFromCard(card: KanbanCard): Task | null {
    if (!this.project) return null;
    const parsed = this.parseFallbackCardId(card.id);
    if (!parsed) return null;
    return this.project.taskMatrix?.[parsed.activityId]?.[parsed.phase]?.find((t) => t.id === parsed.taskId) ?? null;
  }

  showTaskHoverCard(event: MouseEvent, card: KanbanCard): void {
    const wrap = this.boardWrapRef?.nativeElement;
    const target = event.currentTarget as HTMLElement | null;
    if (!wrap || !target) return;

    const task = this.getTaskFromCard(card);
    const boxW = 280;
    const boxH = 84;
    const margin = 8;

    const wrapRect = wrap.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scrollLeft = wrap.scrollLeft;
    const scrollTop = wrap.scrollTop;

    const preferredX = targetRect.right - wrapRect.left + scrollLeft + 12;
    const fallbackX = targetRect.left - wrapRect.left + scrollLeft - boxW - 12;
    const minX = scrollLeft + margin;
    const maxX = scrollLeft + wrap.clientWidth - boxW - margin;
    const x = preferredX <= maxX ? preferredX : Math.max(minX, Math.min(maxX, fallbackX));

    const centerY = targetRect.top - wrapRect.top + scrollTop + targetRect.height / 2;
    const minY = scrollTop + margin;
    const maxY = scrollTop + wrap.clientHeight - boxH - margin;
    const y = Math.max(minY, Math.min(maxY, centerY - boxH / 2));

    this.taskHoverCard = {
      x,
      y,
      label: task?.label ?? card.title ?? '',
      start: this.formatIsoDate(task?.startDate),
      end: this.formatIsoDate(task?.endDate),
      status: task ? this.getTaskStatusText(task.status) : this.mapCardStatusToLabel(card.status),
    };
  }

  hideTaskHoverCard(): void {
    this.taskHoverCard = null;
  }

  showAssignmentPopover(
    event: MouseEvent,
    card: KanbanCard,
    roleField: 'reporter' | 'accountant' | 'responsible',
    roleLabel: string,
    selectedUserId?: string | null
  ): void {
    event.stopPropagation();
    if (!this.canMoveKanbanCard(card)) return;
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const boxW = 220;
    const boxH = 92;
    const margin = 10;
    const maxX = window.innerWidth - boxW - margin;
    const maxY = window.innerHeight - boxH - margin;
    const preferredX = rect.right + 10;
    const fallbackX = rect.left - boxW - 10;

    this.assignmentPopover = {
      x: preferredX <= maxX ? preferredX : Math.max(margin, fallbackX),
      y: Math.max(margin, Math.min(maxY, rect.top + rect.height / 2 - boxH / 2)),
      roleLabel,
      roleField,
      selectedUserId: selectedUserId ?? '',
      cardId: card.id,
    };
  }

  hideAssignmentPopover(): void {
    this.assignmentPopover = null;
  }

  applyAssignmentPopover(): void {
    if (!this.project || !this.assignmentPopover) return;
    const parsed = this.parseFallbackCardId(this.assignmentPopover.cardId);
    if (!parsed) {
      this.hideAssignmentPopover();
      return;
    }
    if (!this.canManageLane(parsed.activityId)) {
      this.hideAssignmentPopover();
      return;
    }

    const payload: {
      reporterId?: string;
      accountantId?: string;
      responsibleId?: string;
    } = {};
    const value = (this.assignmentPopover.selectedUserId ?? '').trim();
    if (this.assignmentPopover.roleField === 'reporter') payload.reporterId = value;
    if (this.assignmentPopover.roleField === 'accountant') payload.accountantId = value;
    if (this.assignmentPopover.roleField === 'responsible') payload.responsibleId = value;

    this.projectService.updateTask({
      projectId: this.project.id,
      activityId: parsed.activityId,
      fromPhase: parsed.phase,
      toPhase: parsed.phase,
      phase: parsed.phase,
      taskId: parsed.taskId,
      ...payload,
    });

    this.buildBoard();
    this.hideAssignmentPopover();
  }

  onDrop(laneId: string, status: KanbanStatus, ev: CdkDragDrop<KanbanCard[]>): void {
    this.hideTaskHoverCard();
    const target = this.laneBuckets[laneId][status];
    const fromLaneId = this.extractLaneIdFromDropId(ev.previousContainer.id);
    const movedCard = ev.previousContainer.data?.[ev.previousIndex] ?? null;
    if (!this.canMoveCardBetweenLanes(fromLaneId || laneId, laneId, movedCard)) return;

    if (ev.previousContainer === ev.container) {
      moveItemInArray(target, ev.previousIndex, ev.currentIndex);
    } else {
      const fromStatus = this.extractStatusFromDropId(ev.previousContainer.id);
      const source = this.laneBuckets[fromLaneId]?.[fromStatus] ?? [];

      transferArrayItem(source, target, ev.previousIndex, ev.currentIndex);

      // Met à jour la carte déplacée
      const moved = target[ev.currentIndex];
      if (moved) {
        moved.laneId = laneId;
        moved.status = status;
        this.syncCardStatusToProject(moved);
      }
    }

    this.emitAllCards();
  }

  canMoveKanbanCard(card: KanbanCard): boolean {
    return this.canManageLane(card.laneId || '') || this.canMoveAssignedCard(card);
  }

  get canAddActivity(): boolean {
    return this.authService.canAddProjectActivity(this.project);
  }

  openTaskEditModal(content: TemplateRef<any>, card: KanbanCard): void {
    if (!this.project) return;

    const parsed = this.parseFallbackCardId(card.id);
    if (!parsed) return;
    if (!this.canManageLane(parsed.activityId)) return;

    const task = this.project.taskMatrix?.[parsed.activityId]?.[parsed.phase]?.find((t) => t.id === parsed.taskId);
    if (!task) return;

    this.taskBeingEdited = task;
    this.isCreateMode = false;
    this.editingActivityId = parsed.activityId;
    this.editingPhase = parsed.phase;

    this.editedItemLabel = task.label ?? '';
    this.editedItemStatus = task.status;
    this.editedStartDate = task.startDate ?? '';
    this.editedEndDate = task.endDate ?? '';
    this.editedCategory = task.category ?? 'projectManagement';
    this.editedPhase = task.phase ?? parsed.phase;
    this.editedReporterId = task.reporterId ?? '';
    this.editedAccountantId = task.accountantId ?? '';
    this.editedResponsibleId = task.responsibleId ?? '';

    this.ensureProjectDependenciesContainer();
    const deps = this.getProjectDependencies().filter((d) => d.fromId === task.id);
    this.editedDependencies = deps.map((d) => ({ toId: d.toId, type: d.type ?? 'F2S' }));

    this.editError = null;
    this.modalService.open(content, { size: 'lg', centered: true });
  }

  openCreateTaskModal(content: TemplateRef<any>, laneId?: string): void {
    if (!this.project || !this.canAddActivity) return;

    const defaultActivityId = (laneId as ActivityId) || (this.lanes[0]?.id as ActivityId) || 'projet';
    const defaultPhase = this.project.phases[0] ?? 'Phase1';

    this.taskBeingEdited = null;
    this.isCreateMode = true;
    this.editingActivityId = defaultActivityId;
    this.editingPhase = defaultPhase;

    this.editedItemLabel = '';
    this.editedItemStatus = 'todo';
    this.editedStartDate = '';
    this.editedEndDate = '';
    this.editedCategory = this.mapActivityToCategory(defaultActivityId);
    this.editedPhase = defaultPhase;
    this.editedReporterId = '';
    this.editedAccountantId = '';
    this.editedResponsibleId = '';
    this.editedDependencies = [];
    this.editError = null;

    this.modalService.open(content, { size: 'lg', centered: true });
  }

  saveTaskEdit(modal: any): void {
    if (!this.project) {
      modal.dismiss();
      return;
    }

    this.editError = null;
    const label = (this.editedItemLabel ?? '').trim();
    if (!label) {
      this.editError = "Le nom de l’activité ne peut pas être vide.";
      return;
    }

    if (this.isCreateMode) {
      if (!this.editedPhase) {
        this.editError = 'La phase est obligatoire.';
        return;
      }
      if (!this.editedCategory) {
        this.editError = "Le type d'activité est obligatoire.";
        return;
      }
      if (!this.editedStartDate || !this.editedEndDate) {
        this.editError = 'Les dates de debut et de fin sont obligatoires.';
        return;
      }
    }

    if (this.editedStartDate && this.editedEndDate) {
      const start = new Date(this.editedStartDate);
      const end = new Date(this.editedEndDate);
      if (start.getTime() > end.getTime()) {
        this.editError = 'La date de début ne peut pas être après la date de fin.';
        return;
      }
    }

    const curTaskId = this.taskBeingEdited?.id ?? null;
    const linkableIds = new Set(this.getLinkableTasks().map((t) => t.id));
    const cleanedRows: EditableDependencyRow[] = (this.editedDependencies ?? [])
      .map((r) => ({ toId: (r.toId ?? '').trim(), type: (r.type ?? 'F2S') as DependencyType }))
      .filter((r) => !!r.toId);

    if (curTaskId && cleanedRows.some((r) => r.toId === curTaskId)) {
      this.editError = 'Une activité ne peut pas dépendre d’elle-même.';
      return;
    }
    if (cleanedRows.some((r) => !linkableIds.has(r.toId))) {
      this.editError = "Une des activités liées n’existe pas (ou n’est pas sélectionnée).";
      return;
    }

    const seen = new Set<string>();
    for (const r of cleanedRows) {
      const key = `${r.type}__${r.toId}`;
      if (seen.has(key)) {
        this.editError = 'Il y a des dépendances en double (même type + même activité liée).';
        return;
      }
      seen.add(key);
    }

    this.ensureProjectDependenciesContainer();
    if (this.isCreateMode) {
      const targetPhase: PhaseId = this.editedPhase ?? this.editingPhase ?? 'Phase1';
      const activityId = this.mapCategoryToActivity(this.editedCategory);
      if (!this.canAddActivity) {
        this.editError = "Vous n'avez pas le droit d'ajouter une activité pour ce type d'activité.";
        return;
      }
      const createdTask = this.projectService.createTask({
        projectId: this.project.id,
        activityId,
        phase: targetPhase,
        label,
        status: this.editedItemStatus,
        startDate: this.editedStartDate,
        endDate: this.editedEndDate,
        category: this.editedCategory,
        reporterId: this.editedReporterId,
        accountantId: this.editedAccountantId,
        responsibleId: this.editedResponsibleId,
      });
      if (!createdTask) {
        this.editError = 'Impossible de creer la tache.';
        return;
      }

      if (cleanedRows.length) {
        const allDeps = this.getProjectDependencies();
        const added: GanttDependency[] = cleanedRows.map((r) => ({
          fromId: createdTask.id,
          toId: r.toId,
          type: r.type,
        }));
        this.setProjectDependencies([...allDeps, ...added]);
      }
    } else {
      if (!this.taskBeingEdited || !this.editingActivityId || !this.editingPhase) {
        modal.dismiss();
        return;
      }
      if (!this.canManageLane(this.editingActivityId)) {
        this.editError = "Vous n'avez pas le droit de modifier ce type d'activité.";
        return;
      }

      const targetActivityId = this.mapCategoryToActivity(this.editedCategory);
      const statusChanged = this.editedItemStatus !== this.taskBeingEdited.status;
      const locationChanged = targetActivityId !== this.editingActivityId || (this.editedPhase || this.editingPhase) !== this.editingPhase;
      if (statusChanged && !this.canManageLane(this.editingActivityId)) {
        this.editError = "Vous n'avez pas le droit de faire avancer ce type d'activité.";
        return;
      }
      if (locationChanged && !this.canMoveCardBetweenLanes(this.editingActivityId, targetActivityId, null, this.taskBeingEdited)) {
        this.editError = "Vous n'avez pas le droit de déplacer cette activité vers ce type d'activité.";
        return;
      }

      const allDeps = this.getProjectDependencies();
      const kept = allDeps.filter((d) => d.fromId !== this.taskBeingEdited!.id);
      const added: GanttDependency[] = cleanedRows.map((r) => ({
        fromId: this.taskBeingEdited!.id,
        toId: r.toId,
        type: r.type,
      }));
      this.setProjectDependencies([...kept, ...added]);

      this.projectService.updateTask({
        projectId: this.project.id,
        activityId: this.editingActivityId,
        fromPhase: this.editingPhase,
        toPhase: this.editedPhase || undefined,
        taskId: this.taskBeingEdited.id,
        label,
        status: this.editedItemStatus,
        startDate: this.editedStartDate,
        endDate: this.editedEndDate,
        category: this.editedCategory,
        reporterId: this.editedReporterId,
        accountantId: this.editedAccountantId,
        responsibleId: this.editedResponsibleId,
        phase: this.editedPhase || undefined,
      });
    }

    this.buildBoard();
    modal.close();
  }

  private mapActivityToCategory(activityId: ActivityId): TaskCategory {
    switch (activityId) {
      case 'projet':
        return 'projectManagement';
      case 'metier':
        return 'businessManagement';
      case 'changement':
        return 'changeManagement';
      case 'technologie':
      default:
        return 'technologyManagement';
    }
  }

  private canManageLane(laneId: string): boolean {
    return this.authService.canManageActivityType(this.project, this.mapActivityToCategory(laneId as ActivityId));
  }

  private canMoveCardBetweenLanes(
    fromLaneId: string,
    toLaneId: string,
    card?: KanbanCard | null,
    task?: Task | null,
  ): boolean {
    return (this.canManageLane(fromLaneId) && this.canManageLane(toLaneId)) || this.canMoveAssignedTask(task ?? (card ? this.getTaskFromCard(card) : null));
  }

  private canMoveAssignedCard(card: KanbanCard): boolean {
    return this.canMoveAssignedTask(this.getTaskFromCard(card));
  }

  private canMoveAssignedTask(task: Task | null | undefined): boolean {
    return this.authService.canMoveAssignedTask(this.project, task);
  }

  private mapCategoryToActivity(category: TaskCategory): ActivityId {
    switch (category) {
      case 'projectManagement':
        return 'projet';
      case 'businessManagement':
        return 'metier';
      case 'changeManagement':
        return 'changement';
      case 'technologyManagement':
      default:
        return 'technologie';
    }
  }

  private mapLaneToCategory(lane: Lane): TaskCategory {
    const normalizedId = (lane.id ?? '').trim().toLowerCase();
    const normalizedLabel = (lane.label ?? '').trim().toLowerCase();

    if (normalizedId === 'projet' || normalizedLabel === 'gestion du projet' || normalizedLabel === 'gestion de projet') {
      return 'projectManagement';
    }
    if (normalizedId === 'metier' || normalizedLabel === 'gestion du métier' || normalizedLabel === 'gestion du metier') {
      return 'businessManagement';
    }
    if (normalizedId === 'changement' || normalizedLabel === 'gestion du changement') {
      return 'changeManagement';
    }
    return 'technologyManagement';
  }

  private syncVisibleLanes(): void {
    this.visibleLanes = this.lanes.filter((lane) =>
      this.selectedSwimlaneCategories.has(this.mapLaneToCategory(lane))
    );
    if (this.focusedLaneId && !this.visibleLanes.some((lane) => lane.id === this.focusedLaneId)) {
      this.focusedLaneId = null;
    }
    this.syncDisplayedLanes();
  }

  private syncDisplayedLanes(): void {
    this.displayedLanes = this.focusedLaneId
      ? this.visibleLanes.filter((lane) => lane.id === this.focusedLaneId)
      : [...this.visibleLanes];
  }

  private captureFullscreenViewport(): void {
    if (typeof document === 'undefined') return;

    const header = document.querySelector('app-root > header');
    const footer = document.querySelector('app-root > footer');
    this.fullscreenTopOffset = header?.getBoundingClientRect().height ?? 0;
    this.fullscreenBottomOffset = footer?.getBoundingClientRect().height ?? 0;
    document.body.classList.add('project-board-fullscreen-open');
  }

  private releaseFullscreenViewport(): void {
    if (typeof document === 'undefined') return;

    this.fullscreenTopOffset = 0;
    this.fullscreenBottomOffset = 0;
    document.body.classList.remove('project-board-fullscreen-open');
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
    return all.filter((t) => t.id !== curId);
  }

  getChildItems(): Task[] {
    if (!this.taskBeingEdited?.id || !this.editingActivityId || !this.editingPhase) return [];
    const matrix = (this.project as any)?.projectTasksMatrix;
    return matrix?.[this.editingActivityId]?.[this.editingPhase]?.[this.taskBeingEdited.id] ?? [];
  }

  addDependencyRow(): void {
    this.editedDependencies.push({ toId: '', type: 'F2S' });
  }

  removeDependencyRow(index: number): void {
    this.editedDependencies.splice(index, 1);
  }

  private ensureProjectDependenciesContainer(): void {
    if (!this.project) return;
    const anyProj = this.project as any;
    if (!Array.isArray(anyProj.ganttDependencies)) anyProj.ganttDependencies = [];
  }

  private getProjectDependencies(): GanttDependency[] {
    if (!this.project) return [];
    const anyProj = this.project as any;
    return (Array.isArray(anyProj.ganttDependencies) ? anyProj.ganttDependencies : []) as GanttDependency[];
  }

  private setProjectDependencies(next: GanttDependency[]): void {
    if (!this.project) return;
    const anyProj = this.project as any;
    anyProj.ganttDependencies = next;
  }

  private syncCardStatusToProject(card: KanbanCard): void {
    if (!this.project?.id) return;

    const parsed = this.parseFallbackCardId(card.id);
    if (!parsed) return;

    this.projectService.updateTask({
      projectId: this.project.id,
      activityId: parsed.activityId,
      fromPhase: parsed.phase,
      toPhase: parsed.phase,
      phase: parsed.phase,
      taskId: parsed.taskId,
      status: this.mapKanbanToTaskStatus(card.status),
    });
  }

  private parseFallbackCardId(id: string): { activityId: ActivityId; phase: PhaseId; taskId: string } | null {
    const idx1 = id.indexOf(':');
    const idx2 = id.indexOf(':', idx1 + 1);
    if (idx1 <= 0 || idx2 <= idx1 + 1 || idx2 >= id.length - 1) return null;

    return {
      activityId: id.slice(0, idx1) as ActivityId,
      phase: id.slice(idx1 + 1, idx2) as PhaseId,
      taskId: id.slice(idx2 + 1),
    };
  }

  private emitAllCards(): void {
    const all: KanbanCard[] = [];
    for (const lane of this.lanes) {
      const b = this.laneBuckets[lane.id];
      if (!b) continue;
      for (const s of this.statuses) {
        all.push(...(b[s.id] ?? []));
      }
    }
    this.cardsChange.emit(all);
  }

  private extractLaneIdFromDropId(id: string): string {
    // format: lane:{laneId}:status:{status}
    const m = id.match(/^lane:(.*):status:/);
    return m?.[1] ?? (this.lanes[0]?.id ?? 'default');
  }

  private extractStatusFromDropId(id: string): KanbanStatus {
    const m = id.match(/:status:(.+)$/);
    return this.resolveBoardStatus(m?.[1]);
  }

  getTicketCountByStatus(status: KanbanStatus): number {
    let total = 0;
    for (const lane of this.displayedLanes) {
      total += this.laneBuckets[lane.id]?.[status]?.length ?? 0;
    }
    return total;
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (a + b).toUpperCase();
  }

  trackByCardId(_: number, c: KanbanCard) { return c.id; }
  trackByLaneId(_: number, l: Lane) { return l.id; }
  trackByStatusId(_: number, s: { id: KanbanStatus; label: string }) { return s.id; }
}
