import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import type { PhaseId, ProjectDetail, Task } from '../../models';

type AdkarStageId = 'awareness' | 'desire' | 'knowledge' | 'ability' | 'reinforcement';

interface AdkarStageDef {
  id: AdkarStageId;
  code: 'A' | 'D' | 'K' | 'A2' | 'R';
  label: string;
  description: string;
  phaseIds: PhaseId[];
}

interface AdkarStageVm extends AdkarStageDef {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  progress: number;
}

interface ChangeTaskVm {
  id: string;
  label: string;
  phase: PhaseId;
  status: string;
  endDate?: string;
}

@Component({
  selector: 'app-project-change-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-change-management.html',
  styleUrls: ['./project-change-management.scss'],
})
export class ProjectChangeManagement implements OnChanges {
  @Input() project: ProjectDetail | null = null;

  stages: AdkarStageVm[] = [];
  upcomingActions: ChangeTaskVm[] = [];
  globalProgress = 0;

  private readonly stageDefs: AdkarStageDef[] = [
    {
      id: 'awareness',
      code: 'A',
      label: 'Awareness',
      description: 'Compréhension du pourquoi du changement',
      phaseIds: ['Phase1', 'Phase2'],
    },
    {
      id: 'desire',
      code: 'D',
      label: 'Desire',
      description: 'Engagement individuel pour participer',
      phaseIds: ['Phase2', 'Phase3'],
    },
    {
      id: 'knowledge',
      code: 'K',
      label: 'Knowledge',
      description: 'Acquisition des connaissances nécessaires',
      phaseIds: ['Phase3', 'Phase4'],
    },
    {
      id: 'ability',
      code: 'A2',
      label: 'Ability',
      description: 'Capacité à appliquer en situation réelle',
      phaseIds: ['Phase4', 'Phase5'],
    },
    {
      id: 'reinforcement',
      code: 'R',
      label: 'Reinforcement',
      description: 'Ancrage durable des nouveaux comportements',
      phaseIds: ['Phase5', 'Phase6'],
    },
  ];

  ngOnChanges(): void {
    this.rebuildViewModel();
  }

  trackByStage(_: number, stage: AdkarStageVm): string {
    return stage.id;
  }

  trackByTask(_: number, task: ChangeTaskVm): string {
    return task.id;
  }

  private rebuildViewModel(): void {
    const tasks = this.getChangeTasks();

    this.stages = this.stageDefs.map((def) => {
      const scoped = tasks.filter((t) => def.phaseIds.includes(t.phase));
      const total = scoped.length;
      const done = scoped.filter((t) => this.isDoneStatus(t.status)).length;
      const inProgress = scoped.filter((t) => this.isInProgressStatus(t.status)).length;
      const todo = Math.max(0, total - done - inProgress);
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;

      return { ...def, total, done, inProgress, todo, progress };
    });

    const totalActions = this.stages.reduce((acc, s) => acc + s.total, 0);
    const totalDone = this.stages.reduce((acc, s) => acc + s.done, 0);
    this.globalProgress = totalActions > 0 ? Math.round((totalDone / totalActions) * 100) : 0;

    this.upcomingActions = tasks
      .filter((t) => !this.isDoneStatus(t.status))
      .sort((a, b) => this.compareTasks(a, b))
      .slice(0, 8);
  }

  private compareTasks(a: ChangeTaskVm, b: ChangeTaskVm): number {
    const aTs = this.parseDate(a.endDate);
    const bTs = this.parseDate(b.endDate);
    if (aTs !== bTs) return aTs - bTs;

    const phases = this.project?.phases ?? [];
    const aPhase = phases.indexOf(a.phase);
    const bPhase = phases.indexOf(b.phase);
    if (aPhase !== bPhase) return aPhase - bPhase;
    return a.label.localeCompare(b.label);
  }

  private parseDate(raw?: string): number {
    const value = String(raw ?? '').trim();
    if (!value) return Number.MAX_SAFE_INTEGER;
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
  }

  private getChangeTasks(): ChangeTaskVm[] {
    const project = this.project;
    if (!project) return [];

    const matrix = ((project as any).activityMatrix ?? (project as any).taskMatrix) as
      | Record<string, Record<string, Task[]>>
      | undefined;
    const changeRow = matrix?.['changement'] ?? {};
    const phases = project.phases ?? [];

    const tasks: ChangeTaskVm[] = [];
    for (const phase of phases) {
      const row = Array.isArray(changeRow?.[phase]) ? changeRow[phase] : [];
      for (const task of row) {
        if (!task) continue;
        const id = String(task.id ?? '').trim();
        if (!id) continue;
        tasks.push({
          id,
          label: String(task.label ?? id).trim(),
          phase,
          status: String(task.status ?? 'todo').trim().toLowerCase(),
          endDate: String((task as any).endDate ?? '').trim() || undefined,
        });
      }
    }
    return tasks;
  }

  private isDoneStatus(status: string): boolean {
    return status === 'done' || status === 'notapplicable';
  }

  private isInProgressStatus(status: string): boolean {
    return status === 'inprogress' || status === 'onhold';
  }
}
