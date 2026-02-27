import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import type { PhaseId, ProjectDetail, Task } from '../../models';

interface ItilAreaVm {
  area: string;
  objective: string;
  count: number;
}

@Component({
  selector: 'app-project-technology-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-technology-management.html',
  styleUrls: ['./project-technology-management.scss'],
})
export class ProjectTechnologyManagement implements OnChanges {
  @Input() project: ProjectDetail | null = null;

  progress = 0;
  ready = 0;
  inFlight = 0;
  total = 0;
  itilAreas: ItilAreaVm[] = [];
  watchList: Array<{ id: string; label: string; phase: PhaseId; status: string }> = [];

  ngOnChanges(): void {
    this.rebuild();
  }

  private rebuild(): void {
    const tasks = this.getTasks();
    this.total = tasks.length;
    this.ready = tasks.filter((t) => this.isDone(t.status)).length;
    this.inFlight = tasks.filter((t) => this.isInProgress(t.status)).length;
    this.progress = this.total > 0 ? Math.round((this.ready / this.total) * 100) : 0;

    this.itilAreas = [
      { area: 'Service Design', objective: 'Qualité de service / SLA', count: tasks.filter((t) => ['Phase1', 'Phase2'].includes(t.phase)).length },
      { area: 'Change Enablement', objective: 'Changements maîtrisés', count: tasks.filter((t) => ['Phase2', 'Phase3', 'Phase4'].includes(t.phase)).length },
      { area: 'Release & Deployment', objective: 'Mises en production fiables', count: tasks.filter((t) => ['Phase4', 'Phase5'].includes(t.phase)).length },
      { area: 'Service Operation', objective: 'Stabilité & support', count: tasks.filter((t) => ['Phase6'].includes(t.phase)).length },
    ];

    this.watchList = tasks
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
    const row = matrix?.['technologie'] ?? {};
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
