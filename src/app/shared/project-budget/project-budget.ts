import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetLine, BudgetSummary } from '../../models';

@Component({
  selector: 'app-project-budget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-budget.html',
})
export class ProjectBudget {
  budgetSummary: BudgetSummary = {
    initial: 250000,
    engaged: 160000,
    spent: 120000,
    forecast: 240000,
    currency: '€',
  };

  budgetLines: BudgetLine[] = [
    { id: 'B1', category: 'Ressources internes', initial: 80000, spent: 50000, forecast: 75000 },
    { id: 'B2', category: 'Consultance externe', initial: 90000, spent: 60000, forecast: 88000 },
    { id: 'B3', category: 'Licences & outils', initial: 50000, spent: 30000, forecast: 48000 },
    { id: 'B4', category: 'Formation & change', initial: 30000, spent: 10000, forecast: 19000 },
  ];

  getPercent(value: number, base: number): number {
    if (!base) return 0;
    return Math.round((value / base) * 100);
  }
}
