import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

import type { ProjectDetail } from '../../models/project.model';

/** Statuts Kanban */
export type KanbanStatus = 'todo' | 'inprogress' | 'waiting' | 'done';

/** Une “lane” = une grande catégorie (ex: projet/metier/...) */
export type LaneId = string;

/** Ressource (personne ou équipe) */
export type KanbanResource = {
  id: string;
  name: string;          // "Alice Dupont"
  kind?: 'person' | 'team';
  avatarUrl?: string;    // optionnel
};

/** Carte Kanban */
export type KanbanCard = {
  id: string;
  title: string;
  description?: string;
  assignees?: KanbanResource[];
  status: KanbanStatus;
  laneId: LaneId;
};

/** Sprint header */
export type SprintInfo = {
  name: string;
  goal?: string;
  start?: string; // ISO ou texte
  end?: string;   // ISO ou texte
};

type Lane = { id: LaneId; label: string };

const STATUSES: Array<{ id: KanbanStatus; label: string }> = [
  { id: 'todo', label: 'À faire' },
  { id: 'inprogress', label: 'En cours' },
  { id: 'waiting', label: 'En attente' },
  { id: 'done', label: 'Terminé' },
];

@Component({
  selector: 'app-project-board',
  standalone: true,
  imports: [CommonModule, DragDropModule],
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] || changes['cards']) {
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
      case 'todo': return 'todo';
      default: return 'todo';
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
      }
    }

    this.emitAllCards();
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
