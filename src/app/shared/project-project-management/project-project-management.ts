import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import type { PhaseId, ProjectDetail, Task } from '../../models';

interface PhaseProgressVm {
  phase: PhaseId;
  total: number;
  done: number;
  inProgress: number;
  progress: number;
}

@Component({
  selector: 'app-project-project-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-project-management.html',
  styleUrls: ['./project-project-management.scss'],
})
export class ProjectProjectManagement implements OnChanges {
  @Input() project: ProjectDetail | null = null;

  globalProgress = 0;
  phaseProgress: PhaseProgressVm[] = [];
  nextActions: Array<{ id: string; label: string; phase: PhaseId; status: string }> = [];

  ngOnChanges(): void {
    this.rebuild();
  }

  private rebuild(): void {
    const tasks = this.getTasks();
    const phases = this.project?.phases ?? [];

    this.phaseProgress = phases.map((phase) => {
      const row = tasks.filter((t) => t.phase === phase);
      const total = row.length;
      const done = row.filter((t) => this.isDone(t.status)).length;
      const inProgress = row.filter((t) => this.isInProgress(t.status)).length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      return { phase, total, done, inProgress, progress };
    });

    const total = this.phaseProgress.reduce((acc, p) => acc + p.total, 0);
    const done = this.phaseProgress.reduce((acc, p) => acc + p.done, 0);
    this.globalProgress = total > 0 ? Math.round((done / total) * 100) : 0;

    this.nextActions = tasks
      .filter((t) => !this.isDone(t.status))
      .slice(0, 10)
      .map((t) => ({ id: t.id, label: t.label, phase: t.phase, status: t.status }));
  }

  private getTasks(): Array<Task & { phase: PhaseId }> {
    const project = this.project;
    if (!project) return [];
    const phases = project.phases ?? [];
    const matrix = ((project as any).activityMatrix ?? (project as any).taskMatrix) as
      | Record<string, Record<string, Task[]>>
      | undefined;
    const row = matrix?.['projet'] ?? {};
    const out: Array<Task & { phase: PhaseId }> = [];
    for (const phase of phases) {
      const tasks = Array.isArray(row[phase]) ? row[phase] : [];
      for (const task of tasks) out.push({ ...task, phase });
    }
    return out;
  }

  private isDone(status: string): boolean {
    const s = String(status ?? '').toLowerCase();
    return s === 'done' || s === 'notapplicable';
  }

  private isInProgress(status: string): boolean {
    const s = String(status ?? '').toLowerCase();
    return s === 'inprogress' || s === 'onhold';
  }
}
