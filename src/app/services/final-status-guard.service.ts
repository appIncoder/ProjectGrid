import { Injectable, inject, signal } from '@angular/core';

import {
  ITEM_TYPE_OPTIONS,
  getActivityStatusLabel,
  isFinalActivityStatus,
  localizeStatusLabel,
  type ActivityId,
  type ActivityStatus,
  type Item,
  type PhaseId,
  type ProjectDetail,
  type ProjectWorkflow,
} from '../models';
import { ProjectService } from './project.service';

export interface FinalStatusCascadeItem {
  id: string;
  label: string;
  typeLabel: string;
  status: ActivityStatus;
  statusLabel: string;
}

export interface FinalStatusCascadeRequest {
  activityLabel: string;
  nextStatus: ActivityStatus;
  nextStatusLabel: string;
  openItems: FinalStatusCascadeItem[];
  /** Répartition des items ouverts par statut, pour l'en-tête synthétique. */
  summary: Array<{ status: ActivityStatus; label: string; count: number }>;
}

export interface FinalStatusChange {
  project: ProjectDetail;
  activityId: ActivityId;
  phase: PhaseId;
  activity: Item;
  nextStatus: ActivityStatus;
}

/**
 * Contrôle le passage d'une activité dans un statut final (Terminé, Non fait, Non applicable) :
 * si des items fils sont encore ouverts, une popup propose d'annuler ou de leur cascader le statut final.
 */
@Injectable({ providedIn: 'root' })
export class FinalStatusGuardService {
  private readonly projectService = inject(ProjectService);
  private pendingResolve: ((cascade: boolean) => void) | null = null;

  /** Demande affichée par la popup (null = popup fermée). */
  readonly request = signal<FinalStatusCascadeRequest | null>(null);

  /**
   * Résout à true si le changement de statut peut être appliqué : rien à signaler,
   * ou l'utilisateur a choisi de cascader (les items fils ont alors déjà été mis à jour).
   * Résout à false si l'utilisateur annule.
   */
  async confirmStatusChange(change: FinalStatusChange): Promise<boolean> {
    const { project, activityId, phase, activity, nextStatus } = change;
    if (!isFinalActivityStatus(nextStatus) || nextStatus === activity.status) return true;

    // L'activité mère peut figurer dans sa propre liste (carte de repli des écrans détaillés) : on l'ignore.
    const openItems = this.projectService
      .getChildItems(project.id, activityId, phase, activity.id)
      .filter((item) => item.id !== activity.id && !isFinalActivityStatus(item.status));
    if (openItems.length === 0) return true;

    // Une seule popup à la fois : une demande précédente encore ouverte est annulée.
    this.resolve(false);

    const statusLabel = (status: ActivityStatus) => this.getStatusLabel(project, status);
    const counts = new Map<ActivityStatus, number>();
    for (const item of openItems) counts.set(item.status, (counts.get(item.status) ?? 0) + 1);

    const cascade = await new Promise<boolean>((resolve) => {
      this.pendingResolve = resolve;
      this.request.set({
        activityLabel: activity.label || activity.id,
        nextStatus,
        nextStatusLabel: statusLabel(nextStatus),
        openItems: openItems.map((item) => ({
          id: item.id,
          label: item.label || item.id,
          typeLabel: ITEM_TYPE_OPTIONS.find((o) => o.value === (item.itemType ?? 'story'))?.label ?? '',
          status: item.status,
          statusLabel: statusLabel(item.status),
        })),
        summary: Array.from(counts, ([status, count]) => ({ status, label: statusLabel(status), count })),
      });
    });

    if (cascade) {
      this.projectService.cascadeStatusToChildItems(project.id, activityId, phase, activity.id, nextStatus);
    }
    return cascade;
  }

  /** Appelé par la popup : true = cascader, false = annuler. */
  resolve(cascade: boolean): void {
    const resolveFn = this.pendingResolve;
    this.pendingResolve = null;
    this.request.set(null);
    resolveFn?.(cascade);
  }

  private getStatusLabel(project: ProjectDetail, status: ActivityStatus): string {
    const workflow = (project as { workflow?: ProjectWorkflow }).workflow;
    const custom = workflow?.statuses?.find((s) => s.id === status)?.label;
    return custom ? localizeStatusLabel(custom) : getActivityStatusLabel(status);
  }
}
