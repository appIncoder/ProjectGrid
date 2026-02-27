import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import type { PhaseId, ProjectDetail, Task } from '../../models';

interface BusinessLensVm {
  title: string;
  subtitle: string;
  count: number;
}

@Component({
  selector: 'app-project-business-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-business-management.html',
  styleUrls: ['./project-business-management.scss'],
})
export class ProjectBusinessManagement implements OnChanges {
  @Input() project: ProjectDetail | null = null;

  progress = 0;
  total = 0;
  done = 0;
  inProgress = 0;
  lenses: BusinessLensVm[] = [];
  focusList: Array<{ id: string; label: string; phase: PhaseId; status: string }> = [];

  ngOnChanges(): void {
    this.rebuild();
  }

  private rebuild(): void {
    const tasks = this.getTasks();
    this.total = tasks.length;
    this.done = tasks.filter((t) => this.isDone(t.status)).length;
    this.inProgress = tasks.filter((t) => this.isInProgress(t.status)).length;
    this.progress = this.total > 0 ? Math.round((this.done / this.total) * 100) : 0;

    this.lenses = [
      { title: 'ArchiMate', subtitle: 'Business Layer', count: tasks.filter((t) => ['Phase1', 'Phase2'].includes(t.phase)).length },
      { title: 'ArchiMate', subtitle: 'Capability Mapping', count: tasks.filter((t) => ['Phase2', 'Phase3'].includes(t.phase)).length },
      { title: 'Business Analysis', subtitle: 'Requirements', count: tasks.filter((t) => ['Phase3', 'Phase4'].includes(t.phase)).length },
      { title: 'Business Analysis', subtitle: 'Validation / Value', count: tasks.filter((t) => ['Phase5', 'Phase6'].includes(t.phase)).length },
    ];

    this.focusList = tasks
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
    const row = matrix?.['metier'] ?? {};
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
