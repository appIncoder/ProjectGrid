import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RiskCellItem, RiskLevel, TopRisk } from '../../models/project-models';

@Component({
  selector: 'app-project-risks',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-risks.html',
})
export class ProjectRisks {
  riskImpactLevels: string[] = ['Faible', 'Modéré', 'Significatif', 'Majeur', 'Critique'];
  riskProbabilityLevels: string[] = ['Très faible', 'Faible', 'Moyenne', 'Élevée', 'Très élevée'];

  // clé = `${impact}|${prob}`
  riskMatrix: Record<string, RiskCellItem[]> = {
    'Significatif|Moyenne': [
      { id: 'R1', label: 'Disponibilité clé métier', level: 'high' },
    ],
    'Majeur|Élevée': [
      { id: 'R2', label: 'Retard de livraison IT', level: 'critical' },
      { id: 'R3', label: 'Sous-estimation charge', level: 'high' },
    ],
    'Modéré|Moyenne': [
      { id: 'R4', label: 'Turn-over équipe', level: 'medium' },
    ],
    'Critique|Faible': [
      { id: 'R5', label: 'Faille de sécurité majeure', level: 'critical' },
    ],
  };

  topRisks: TopRisk[] = [
    {
      id: 'R2',
      title: 'Retard de livraison IT critique',
      impact: 'Majeur',
      probability: 'Élevée',
      level: 'critical',
      owner: 'David Lambert',
      dueDate: '30/09/2025',
    },
    {
      id: 'R3',
      title: 'Sous-estimation des charges projet',
      impact: 'Majeur',
      probability: 'Élevée',
      level: 'high',
      owner: 'Alice Dupont',
      dueDate: '15/09/2025',
    },
    {
      id: 'R1',
      title: 'Indisponibilité d’un sponsor métier',
      impact: 'Significatif',
      probability: 'Moyenne',
      level: 'high',
      owner: 'Claire Leroy',
      dueDate: '01/09/2025',
    },
    {
      id: 'R4',
      title: 'Turn-over dans l’équipe projet',
      impact: 'Modéré',
      probability: 'Moyenne',
      level: 'medium',
      owner: 'Bruno Martin',
      dueDate: '15/10/2025',
    },
    {
      id: 'R5',
      title: 'Risque de faille de sécurité',
      impact: 'Critique',
      probability: 'Faible',
      level: 'critical',
      owner: 'Security Officer',
      dueDate: '31/12/2025',
    },
  ];

  draggedRisk: { item: RiskCellItem; fromImpact: string; fromProbability: string } | null = null;

  private makeRiskKey(impact: string, probability: string): string {
    return `${impact}|${probability}`;
  }

  getRiskCellItems(impact: string, probability: string): RiskCellItem[] {
    return this.riskMatrix[this.makeRiskKey(impact, probability)] ?? [];
  }

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

    const fromKey = this.makeRiskKey(this.draggedRisk.fromImpact, this.draggedRisk.fromProbability);
    const toKey = this.makeRiskKey(targetImpact, targetProbability);

    const fromList = this.riskMatrix[fromKey] ?? [];
    this.riskMatrix[fromKey] = fromList.filter(r => r.id !== this.draggedRisk!.item.id);

    const toList = this.riskMatrix[toKey] ?? [];
    this.riskMatrix[toKey] = [...toList, this.draggedRisk.item];

    this.draggedRisk = null;
  }
}
