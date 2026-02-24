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
    initial: 0,
    engaged: 0,
    spent: 0,
    forecast: 0,
    currency: '€',
  };

  budgetLines: BudgetLine[] = [];

  getPercent(value: number, base: number): number {
    if (!base) return 0;
    return Math.round((value / base) * 100);
  }
}
