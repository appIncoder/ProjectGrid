import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, TemplateRef } from '@angular/core';
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
  Task,
  TaskCategory,
} from '../../models';
import { ProjectService } from '../../services/project.service';
import { ProjectTaskEditModal } from '../project-task-edit-modal/project-task-edit-modal';

// Lane type imported from models (see import above)

const STATUSES: Array<{ id: KanbanStatus; label: string }> = [
  { id: 'todo', label: 'À faire' },
  { id: 'inprogress', label: 'En cours' },
  { id: 'waiting', label: 'En attente' },
  { id: 'done', label: 'Terminé' },
];

@Component({
  selector: 'app-project-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, NgbModalModule, ProjectTaskEditModal],
  templateUrl: './project-board.html',
  styleUrls: ['./project-board.scss'],
})
export class ProjectBoard implements OnChanges {
  /** Projet (pour déduire les lanes + éventuellement des cartes) */
  @Input() project: ProjectDetail | null = null;

  /**
   * Données Kanban (recommandé): tu passes explicitement les cartes.
   * Si non fourni, le composant peut générer une base à partir du projet (fallback simple).
   */
  @Input() cards: KanbanCard[] | null = null;

  /** Infos sprint affichées dans l’en-tête */
  @Input() sprint: SprintInfo = {
    name: 'Sprint en cours',
    goal: '',
    start: '',
    end: '',
  };

  /** Notifie le parent après un déplacement */
  @Output() cardsChange = new EventEmitter<KanbanCard[]>();

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

// État ouvert/fermé des swimlanes
laneCollapsed: Record<string, boolean> = {};

toggleLane(laneId: string): void {
  this.laneCollapsed[laneId] = !this.laneCollapsed[laneId];
}

isLaneCollapsed(laneId: string): boolean {
  return !!this.laneCollapsed[laneId];
}


  readonly statuses = STATUSES;

  lanes: Lane[] = [];
  // Structure: laneId -> status -> KanbanCard[]
  laneBuckets: Record<string, Record<KanbanStatus, KanbanCard[]>> = {};

  constructor(private projectService: ProjectService, private modalService: NgbModal) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] || changes['cards']) {
      if (this.project) {
        this.projectService.registerProject(this.project);
      }
      this.buildBoard();
    }
  }

  /** Construit les lanes + bucket par statut */
  private buildBoard(): void {
    this.lanes = this.buildLanesFromProject(this.project);
// Initialise l’état collapsed pour les lanes (sans écraser l’existant)
for (const lane of this.lanes) {
  if (this.laneCollapsed[lane.id] === undefined) {
    this.laneCollapsed[lane.id] = false; // ouvert par défaut
  }
}

    const data = (this.cards && this.cards.length)
      ? this.cards
      : this.buildFallbackCardsFromProject(this.project);

    this.laneBuckets = {};
    for (const lane of this.lanes) {
      this.laneBuckets[lane.id] = {
        todo: [],
        inprogress: [],
        waiting: [],
        done: [],
      };
    }

    for (const c of data) {
      const laneId = this.laneBuckets[c.laneId] ? c.laneId : (this.lanes[0]?.id ?? 'default');
      const status = c.status ?? 'todo';
      if (!this.laneBuckets[laneId]) {
        this.laneBuckets[laneId] = { todo: [], inprogress: [], waiting: [], done: [] };
      }
      this.laneBuckets[laneId][status].push({ ...c, laneId, status });
    }
  }

  /** Lanes = catégories d’activité du projet */
  private buildLanesFromProject(project: ProjectDetail | null): Lane[] {
    const acts = (project as any)?.activities as Record<string, { id: string; label: string }> | undefined;
    if (acts && Object.keys(acts).length) {
      return Object.values(acts).map(a => ({ id: a.id, label: a.label }));
    }

    // fallback si activities absent
    return [
      { id: 'projet', label: 'Gestion du projet' },
      { id: 'metier', label: 'Gestion du métier' },
      { id: 'changement', label: 'Gestion du changement' },
      { id: 'technologie', label: 'Gestion de la technologie' },
    ];
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
    // adapte si ton modèle a déjà des statuts
    switch (s) {
      case 'done': return 'done';
      case 'inprogress': return 'inprogress';
      case 'blocked': return 'waiting';
      case 'onhold': return 'waiting';
      case 'todo': return 'todo';
      default: return 'todo';
    }
  }

  private mapKanbanToTaskStatus(s: KanbanStatus): ActivityStatus {
    switch (s) {
      case 'done': return 'done';
      case 'inprogress': return 'inprogress';
      case 'waiting': return 'onhold';
      case 'todo':
      default:
        return 'todo';
    }
  }

  /** Identifiant drop-list unique pour connecter les colonnes entre elles DANS une lane */
  dropListId(laneId: string, status: KanbanStatus): string {
    return `lane:${laneId}:status:${status}`;
  }

  /** Les drop-lists connectées pour une lane = les 4 statuts */
  connectedListsForLane(laneId: string): string[] {
    return this.statuses.map(s => this.dropListId(laneId, s.id));
  }

  onDrop(laneId: string, status: KanbanStatus, ev: CdkDragDrop<KanbanCard[]>): void {
    const target = this.laneBuckets[laneId][status];

    if (ev.previousContainer === ev.container) {
      moveItemInArray(target, ev.previousIndex, ev.currentIndex);
    } else {
      const fromLaneId = this.extractLaneIdFromDropId(ev.previousContainer.id);
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

  openTaskEditModal(content: TemplateRef<any>, card: KanbanCard): void {
    if (!this.project) return;

    const parsed = this.parseFallbackCardId(card.id);
    if (!parsed) return;

    const task = this.project.taskMatrix?.[parsed.activityId]?.[parsed.phase]?.find((t) => t.id === parsed.taskId);
    if (!task) return;

    this.taskBeingEdited = task;
    this.editingActivityId = parsed.activityId;
    this.editingPhase = parsed.phase;

    this.editedTaskLabel = task.label ?? '';
    this.editedTaskStatus = task.status;
    this.editedStartDate = task.startDate ?? '';
    this.editedEndDate = task.endDate ?? '';
    this.editedCategory = task.category ?? 'projectManagement';
    this.editedPhase = task.phase ?? parsed.phase;

    this.ensureProjectDependenciesContainer();
    const deps = this.getProjectDependencies().filter((d) => d.fromId === task.id);
    this.editedDependencies = deps.map((d) => ({ toId: d.toId, type: d.type ?? 'F2S' }));

    this.editError = null;
    this.modalService.open(content, { size: 'lg', centered: true });
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
    const linkableIds = new Set(this.getLinkableTasks().map((t) => t.id));
    const cleanedRows: EditableDependencyRow[] = (this.editedDependencies ?? [])
      .map((r) => ({ toId: (r.toId ?? '').trim(), type: (r.type ?? 'F2S') as DependencyType }))
      .filter((r) => !!r.toId);

    if (cleanedRows.some((r) => r.toId === curTaskId)) {
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
    const allDeps = this.getProjectDependencies();
    const kept = allDeps.filter((d) => d.fromId !== curTaskId);
    const added: GanttDependency[] = cleanedRows.map((r) => ({
      fromId: curTaskId,
      toId: r.toId,
      type: r.type,
    }));
    this.setProjectDependencies([...kept, ...added]);

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

    this.buildBoard();
    modal.close();
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
    const m = id.match(/:status:(todo|inprogress|waiting|done)$/);
    return (m?.[1] as KanbanStatus) ?? 'todo';
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
