import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { RiskCellItem, RiskLevel, TopRisk, RiskStatus, TopRiskExtended } from '../../models';

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
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './project-risks.html',
})
export class ProjectRisks {
  riskImpactLevels: string[] = ['Faible', 'Modéré', 'Significatif', 'Majeur', 'Critique'];
  riskProbabilityLevels: string[] = ['Très faible', 'Faible', 'Moyenne', 'Élevée', 'Très élevée'];

  RISK_STATUS_LABEL = RISK_STATUS_LABEL;

  // clé = `${impact}|${prob}`
  riskMatrix: Record<string, RiskCellItem[]> = {
    'Significatif|Moyenne': [{ id: 'R1', label: 'Disponibilité clé métier', level: 'high' }],
    'Majeur|Élevée': [
      { id: 'R2', label: 'Retard de livraison IT', level: 'critical' },
      { id: 'R3', label: 'Sous-estimation charge', level: 'high' },
    ],
    'Modéré|Moyenne': [{ id: 'R4', label: 'Turn-over équipe', level: 'medium' }],
    'Critique|Faible': [{ id: 'R5', label: 'Faille de sécurité majeure', level: 'critical' }],
  };

  topRisks: TopRiskExtended[] = [
    {
      id: 'R2',
      title: 'Retard de livraison IT critique',
      impact: 'Majeur',
      probability: 'Élevée',
      level: 'critical',
      owner: 'David Lambert',
      dueDate: '30/09/2025',
      status: 'IN_PROGRESS',
      residualRiskId: 'R2-RES',
    },
    {
      id: 'R3',
      title: 'Sous-estimation des charges projet',
      impact: 'Majeur',
      probability: 'Élevée',
      level: 'high',
      owner: 'Alice Dupont',
      dueDate: '15/09/2025',
      status: 'OPEN',
      residualRiskId: null,
    },
    {
      id: 'R1',
      title: 'Indisponibilité d’un sponsor métier',
      impact: 'Significatif',
      probability: 'Moyenne',
      level: 'high',
      owner: 'Claire Leroy',
      dueDate: '01/09/2025',
      status: 'ON_HOLD',
      residualRiskId: null,
    },
    {
      id: 'R4',
      title: 'Turn-over dans l’équipe projet',
      impact: 'Modéré',
      probability: 'Moyenne',
      level: 'medium',
      owner: 'Bruno Martin',
      dueDate: '15/10/2025',
      status: 'RESOLVED',
      residualRiskId: 'R4-RES',
    },
    {
      id: 'R5',
      title: 'Risque de faille de sécurité',
      impact: 'Critique',
      probability: 'Faible',
      level: 'critical',
      owner: 'Security Officer',
      dueDate: '31/12/2025',
      status: 'OPEN',
      residualRiskId: null,
    },
  ];

  draggedRisk: { item: RiskCellItem; fromImpact: string; fromProbability: string } | null = null;

  // ====== Menu contextuel (clic droit) ======
  contextMenu = {
    visible: false,
    x: 0,
    y: 0,
    riskId: '' as string,
  };

  get probabilityOptions(): string[] {
    return this.riskProbabilityLevels;
  }
  get impactOptions(): string[] {
    return this.riskImpactLevels;
  }
  statusOptions: RiskStatus[] = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'];
  levelOptions: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

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
      level: risk.level,
    };

    this.removeItemEverywhere(risk.id);
    this.upsertItemInCell(item, risk.impact, risk.probability);
  }

  onTopRiskLevelChange(risk: TopRiskExtended): void {
    // Quand criticité changée dans le tableau => juste changer le style de la pastille (pas son emplacement)
    this.updateCellItemLevel(risk.id, risk.level);
  }

  onTopRiskStatusChange(_risk: TopRiskExtended): void {
    // Rien à faire côté matrice (statut affiché dans tableau / menu)
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
}
