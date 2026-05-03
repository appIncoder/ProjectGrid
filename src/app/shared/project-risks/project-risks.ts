import { ChangeDetectorRef, Component, HostListener, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ProjectDetail, RiskCellItem, RiskLevel, RiskStatus, TopRiskExtended } from '../../models';
import { ProjectDataService } from '../../services/project-data.service';
import { AuthService } from '../../services/auth.service';
import { AppButton } from '../design-system/button/button';

export const RISK_STATUS_LABEL: Record<RiskStatus, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  ON_HOLD: 'En attente',
  RESOLVED: 'Résolu',
  CLOSED: 'Fermé',
};

@Component({
  selector: 'app-project-risks',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AppButton],
  templateUrl: './project-risks.html',
  styleUrls: ['./project-risks.scss'],
})
export class ProjectRisks implements OnInit, OnChanges, OnDestroy {
  @Input() projectId: string | null = null;
  @Input() project: ProjectDetail | null = null;

  riskImpactLevels: string[] = ['Faible', 'Modéré', 'Significatif', 'Majeur', 'Critique'];
  riskProbabilityLevels: string[] = ['Très faible', 'Faible', 'Moyenne', 'Élevée', 'Très élevée'];

  RISK_STATUS_LABEL = RISK_STATUS_LABEL;

  // clé = `${impact}|${prob}`
  riskMatrix: Record<string, RiskCellItem[]> = {};

  topRisks: TopRiskExtended[] = [];

  draggedRisk: { item: RiskCellItem; fromImpact: string; fromProbability: string } | null = null;

  // ====== Menu contextuel (clic droit) ======
  contextMenu = {
    visible: false,
    x: 0,
    y: 0,
    riskId: '' as string,
  };

  isAddRiskModalOpen = false;
  isCreatingRisk = false;
  savingRiskIds = new Set<string>();
  createRiskError: string | null = null;
  newRiskForm = {
    title: '',
    description: '',
    probability: 'Moyenne',
    frequency: 'medium',
  };
  private readonly subs = new Subscription();

  constructor(
    private data: ProjectDataService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subs.add(this.data.risksChanged$.subscribe((evt) => {
      const currentProjectId = (this.projectId ?? '').trim();
      if (!currentProjectId || evt.projectId !== currentProjectId) return;
      void this.loadRisksFromDb();
    }));
    void this.loadRisksFromDb();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId']) {
      void this.loadRisksFromDb();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get probabilityOptions(): string[] {
    return this.riskProbabilityLevels;
  }
  get impactOptions(): string[] {
    return this.riskImpactLevels;
  }
  statusOptions: RiskStatus[] = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'];
  levelOptions: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

  get canAddRisk(): boolean {
    return this.authService.canAddProjectActivity(this.project);
  }

  // ====== Helpers ======
  private makeRiskKey(impact: string, probability: string): string {
    return `${impact}|${probability}`;
  }

  getRiskCellItems(impact: string, probability: string): RiskCellItem[] {
    return this.riskMatrix[this.makeRiskKey(impact, probability)] ?? [];
  }

  private findTopRisk(id: string): TopRiskExtended | undefined {
    return this.topRisks.find(r => r.id === id);
  }

  private removeItemEverywhere(id: string): void {
    Object.keys(this.riskMatrix).forEach(key => {
      this.riskMatrix[key] = (this.riskMatrix[key] ?? []).filter(it => it.id !== id);
    });
  }

  private upsertItemInCell(item: RiskCellItem, impact: string, probability: string): void {
    const key = this.makeRiskKey(impact, probability);
    const list = this.riskMatrix[key] ?? [];
    // évite doublons
    this.riskMatrix[key] = [...list.filter(it => it.id !== item.id), item];
  }

  private getMatrixComputedLevel(impact: string, probability: string): RiskLevel {
    // Calcul simple & stable : score = (impactIndex+1) * (probIndex+1)
    const i = this.riskImpactLevels.indexOf(impact);
    const p = this.riskProbabilityLevels.indexOf(probability);
    const impactScore = i >= 0 ? i + 1 : 1;
    const probScore = p >= 0 ? p + 1 : 1;
    const score = impactScore * probScore;

    if (score <= 4) return 'low';
    if (score <= 8) return 'medium';
    if (score <= 15) return 'high';
    return 'critical';
  }

  // ====== Classes ======
  getRiskLevelClass(level: RiskLevel): string {
    switch (level) {
      case 'low':
        return 'risk-low';
      case 'medium':
        return 'risk-medium';
      case 'high':
        return 'risk-high';
      case 'critical':
        return 'risk-critical';
    }
  }

  getRiskStatusClass(status?: RiskStatus): string {
    switch (status) {
      case 'OPEN':
        return 'bg-secondary';
      case 'IN_PROGRESS':
        return 'bg-primary';
      case 'ON_HOLD':
        return 'bg-warning text-dark';
      case 'RESOLVED':
        return 'bg-success';
      case 'CLOSED':
        return 'bg-dark';
      default:
        return 'bg-light text-dark';
    }
  }

  // ====== Drag & drop ======
  onRiskDragStart(event: DragEvent, item: RiskCellItem, impact: string, probability: string): void {
    this.draggedRisk = { item, fromImpact: impact, fromProbability: probability };
    event.dataTransfer?.setData('text/plain', item.id);
  }

  onRiskDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onRiskDrop(event: DragEvent, targetImpact: string, targetProbability: string): void {
    event.preventDefault();
    if (!this.draggedRisk) return;

    const id = this.draggedRisk.item.id;

    // 1) Déplacer visuellement la pastille
    this.removeItemEverywhere(id);

    // 2) Mettre à jour les infos métier (impact/prob + criticité recalculée)
    const top = this.findTopRisk(id);
    const computedLevel = this.getMatrixComputedLevel(targetImpact, targetProbability);

    if (top) {
      top.impact = targetImpact;
      top.probability = targetProbability;
      top.level = computedLevel; // ✅ criticité change selon cellule
    }

    // 3) Mettre à jour la pastille (level doit suivre)
    const updatedItem: RiskCellItem = {
      ...this.draggedRisk.item,
      level: computedLevel,
    };

    this.upsertItemInCell(updatedItem, targetImpact, targetProbability);
    this.draggedRisk = null;
    if (top) {
      void this.persistRiskUpdate(top);
    }
  }

  // ====== Synchronisation depuis le tableau TopRisks ======
  onTopRiskImpactOrProbabilityChange(risk: TopRiskExtended): void {
    // Quand impact/prob changent dans le tableau => repositionner la pastille
    const computedLevel = this.getMatrixComputedLevel(risk.impact, risk.probability);

    // Si tu veux que la criticité suive toujours la cellule :
    risk.level = computedLevel;

    // Retrouver/Construire l'item (label depuis title si besoin)
    const existingItem = this.getCellItemById(risk.id);
    const item: RiskCellItem = {
      id: risk.id,
      label: existingItem?.label ?? risk.title ?? risk.id,
      shortName: existingItem?.shortName ?? risk.shortName,
      longName: existingItem?.longName ?? risk.longName ?? risk.title,
      level: risk.level,
    };

    this.removeItemEverywhere(risk.id);
    this.upsertItemInCell(item, risk.impact, risk.probability);
    void this.persistRiskUpdate(risk);
  }

  onTopRiskLevelChange(risk: TopRiskExtended): void {
    // Quand criticité changée dans le tableau => juste changer le style de la pastille (pas son emplacement)
    this.updateCellItemLevel(risk.id, risk.level);
    void this.persistRiskUpdate(risk);
  }

  onTopRiskStatusChange(risk: TopRiskExtended): void {
    // Rien à faire côté matrice (statut affiché dans tableau / menu)
    void this.persistRiskUpdate(risk);
  }

  onTopRiskLongNameChange(risk: TopRiskExtended): void {
    risk.longName = (risk.longName ?? '').trim();
    if (!risk.longName) {
      void this.loadRisksFromDb();
      return;
    }
    risk.title = risk.longName;
    const existing = this.getCellItemById(risk.id);
    if (existing) {
      existing.longName = risk.longName;
      existing.label = risk.longName;
    }
    void this.persistRiskUpdate(risk);
  }

  private getCellItemById(id: string): RiskCellItem | undefined {
    for (const key of Object.keys(this.riskMatrix)) {
      const found = (this.riskMatrix[key] ?? []).find(it => it.id === id);
      if (found) return found;
    }
    return undefined;
  }

  private updateCellItemLevel(id: string, level: RiskLevel): void {
    for (const key of Object.keys(this.riskMatrix)) {
      const list = this.riskMatrix[key] ?? [];
      const idx = list.findIndex(it => it.id === id);
      if (idx >= 0) {
        const updated = { ...list[idx], level };
        const copy = [...list];
        copy[idx] = updated;
        this.riskMatrix[key] = copy;
        return;
      }
    }
  }

  // ====== Menu contextuel sur pastille ======
  onRiskContextMenu(event: MouseEvent, item: RiskCellItem): void {
    event.preventDefault();

    this.contextMenu.visible = true;
    this.contextMenu.x = event.clientX;
    this.contextMenu.y = event.clientY;
    this.contextMenu.riskId = item.id;
  }

  closeContextMenu(): void {
    this.contextMenu.visible = false;
    this.contextMenu.riskId = '';
  }

  // Fermer menu au clic ailleurs / ESC
  @HostListener('document:click')
  onDocClick(): void {
    if (this.contextMenu.visible) this.closeContextMenu();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.contextMenu.visible) this.closeContextMenu();
  }

  // Actions du menu
  changeRiskProbability(probability: string): void {
    const risk = this.findTopRisk(this.contextMenu.riskId);
    if (!risk) return;

    risk.probability = probability;
    this.onTopRiskImpactOrProbabilityChange(risk);
    this.closeContextMenu();
  }

  changeRiskImpact(impact: string): void {
    const risk = this.findTopRisk(this.contextMenu.riskId);
    if (!risk) return;

    risk.impact = impact;
    this.onTopRiskImpactOrProbabilityChange(risk);
    this.closeContextMenu();
  }

  changeRiskLevel(level: RiskLevel): void {
    const risk = this.findTopRisk(this.contextMenu.riskId);
    if (!risk) return;

    risk.level = level;
    this.onTopRiskLevelChange(risk);
    this.closeContextMenu();
  }

  changeRiskStatus(status: RiskStatus): void {
    const risk = this.findTopRisk(this.contextMenu.riskId);
    if (!risk) return;

    risk.status = status;
    this.onTopRiskStatusChange(risk);
    this.closeContextMenu();
  }

  openAddRiskModal(): void {
    if (!this.canAddRisk) return;
    this.createRiskError = null;
    this.newRiskForm = {
      title: '',
      description: '',
      probability: 'Moyenne',
      frequency: 'medium',
    };
    this.isAddRiskModalOpen = true;
  }

  closeAddRiskModal(refresh = true): void {
    const wasOpen = this.isAddRiskModalOpen;
    this.isAddRiskModalOpen = false;
    this.isCreatingRisk = false;
    this.createRiskError = null;
    this.newRiskForm = {
      title: '',
      description: '',
      probability: 'Moyenne',
      frequency: 'medium',
    };
    if (refresh && wasOpen) {
      void this.loadRisksFromDb();
    }
  }

  private mapApiStatusToRiskStatus(status: string): RiskStatus {
    const norm = (status ?? '').trim().toLowerCase();
    if (norm === 'in progress' || norm === 'in_progress' || norm === 'inprogress') return 'IN_PROGRESS';
    if (norm === 'on hold' || norm === 'on_hold') return 'ON_HOLD';
    if (norm === 'resolved') return 'RESOLVED';
    if (norm === 'closed') return 'CLOSED';
    return 'OPEN';
  }

  private mapRiskStatusToApi(status: RiskStatus | undefined): string {
    if (status === 'IN_PROGRESS') return 'In Progress';
    if (status === 'ON_HOLD') return 'On Hold';
    if (status === 'RESOLVED') return 'Resolved';
    if (status === 'CLOSED') return 'Closed';
    return 'Open';
  }

  private mapRiskLevelToCriticity(level: RiskLevel): string {
    if (level === 'critical') return 'critical';
    if (level === 'high') return 'high';
    if (level === 'medium') return 'medium';
    return 'low';
  }

  private mapCriticityToLevel(criticity: string): RiskLevel {
    const norm = (criticity ?? '').trim().toLowerCase();
    if (norm === 'critical' || norm === 'critique' || norm === 'very_high') return 'critical';
    if (norm === 'high' || norm === 'elevee' || norm === 'élevée') return 'high';
    if (norm === 'medium' || norm === 'moyenne' || norm === 'modere' || norm === 'modéré') return 'medium';
    return 'low';
  }

  private mapCriticityToImpactLabel(criticity: string): string {
    const level = this.mapCriticityToLevel(criticity);
    if (level === 'critical') return 'Critique';
    if (level === 'high') return 'Majeur';
    if (level === 'medium') return 'Modéré';
    return 'Faible';
  }

  private normalizeProbabilityLabel(probability: string): string {
    const norm = (probability ?? '').trim().toLowerCase();
    const matched = this.riskProbabilityLevels.find((p) => p.toLowerCase() === norm);
    return matched ?? this.riskProbabilityLevels[2];
  }

  private isSavingRisk(riskId: string): boolean {
    return this.savingRiskIds.has(riskId);
  }

  private async persistRiskUpdate(risk: TopRiskExtended): Promise<void> {
    const projectId = (this.projectId ?? '').trim();
    if (!projectId || !risk?.id || this.isSavingRisk(risk.id)) return;

    const longName = String(risk.longName ?? risk.title ?? '').trim();
    if (!longName) return;

    this.savingRiskIds.add(risk.id);
    try {
      const updated = await this.data.updateProjectRisk(projectId, risk.id, {
        longName,
        probability: String(risk.probability ?? '').trim(),
        criticity: this.mapRiskLevelToCriticity(risk.level),
        status: this.mapRiskStatusToApi(risk.status),
        remainingRiskId: risk.residualRiskId ?? null,
      });

      const impact = this.mapCriticityToImpactLabel(updated.criticity);
      const probability = this.normalizeProbabilityLabel(updated.probability);
      const computedLevel = this.mapCriticityToLevel(updated.criticity);
      risk.shortName = updated.shortName || risk.shortName;
      risk.longName = updated.longName || longName;
      risk.title = risk.longName;
      risk.impact = impact;
      risk.probability = probability;
      risk.level = computedLevel;
      risk.status = this.mapApiStatusToRiskStatus(updated.status);
      risk.dueDate = updated.dateLastUpdated || updated.dateCreated || risk.dueDate;
      risk.residualRiskId = updated.remainingRiskId || null;

      const item: RiskCellItem = {
        id: risk.id,
        label: risk.longName,
        shortName: risk.shortName,
        longName: risk.longName,
        level: risk.level,
      };
      this.removeItemEverywhere(risk.id);
      this.upsertItemInCell(item, risk.impact, risk.probability);
    } catch {
      await this.loadRisksFromDb();
    } finally {
      this.savingRiskIds.delete(risk.id);
    }
  }

  private async loadRisksFromDb(): Promise<void> {
    const projectId = (this.projectId ?? '').trim();
    if (!projectId) {
      this.topRisks = [];
      this.riskMatrix = {};
      return;
    }

    const rows = await this.data.listProjectRisks(projectId).catch(() => []);
    this.topRisks = rows.slice(0, 10).map((r) => {
      const impact = this.mapCriticityToImpactLabel(r.criticity);
      const probability = this.normalizeProbabilityLabel(r.probability);
      const longName = r.longName || r.title || r.riskId;
      const shortName = r.shortName || longName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3) || 'RSK';
      return {
        id: r.riskId,
        shortName,
        longName,
        title: longName,
        impact,
        probability,
        level: this.mapCriticityToLevel(r.criticity),
        owner: '—',
        dueDate: r.dateLastUpdated || r.dateCreated || '',
        status: this.mapApiStatusToRiskStatus(r.status),
        residualRiskId: r.remainingRiskId || null,
      } as TopRiskExtended;
    });

    this.riskMatrix = {};
    for (const risk of this.topRisks) {
      this.upsertItemInCell(
        { id: risk.id, label: risk.title, shortName: risk.shortName, longName: risk.longName, level: risk.level },
        risk.impact,
        risk.probability
      );
    }
  }

  onCancelAddRisk(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.closeAddRiskModal();
  }

  async confirmAddRisk(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();

    if (!this.canAddRisk) {
      this.createRiskError = "Vous n'avez pas le droit d'ajouter un risque.";
      return;
    }

    const projectId = (this.projectId ?? '').trim();
    if (!projectId) {
      this.createRiskError = 'Projet introuvable.';
      return;
    }

    const title = this.newRiskForm.title.trim();
    if (!title) {
      this.createRiskError = 'L’intitulé du risque est obligatoire.';
      return;
    }

    this.isCreatingRisk = true;
    this.createRiskError = null;
    try {
      await this.data.createProjectRisk(projectId, {
        title,
        description: this.newRiskForm.description.trim(),
        probability: this.newRiskForm.probability,
        criticity: this.newRiskForm.frequency,
        status: 'Open',
      });
      // Ferme la popup immédiatement après succès pour un feedback clair.
      this.closeAddRiskModal(false);
      this.cdr.detectChanges();
      // Puis recharge la liste + matrice locales.
      await this.loadRisksFromDb();
      this.cdr.detectChanges();
    } catch (e: any) {
      this.createRiskError = String(e?.error?.error ?? e?.message ?? "Impossible d'ajouter le risque.");
      this.cdr.detectChanges();
    } finally {
      this.isCreatingRisk = false;
      this.cdr.detectChanges();
    }
  }
}
