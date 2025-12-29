// src/app/services/project-data.service.ts

import { Injectable } from '@angular/core';
import type { ProjectDetail, PhaseId, ActivityId, Task } from '../models';

@Injectable({ providedIn: 'root' })
export class ProjectDataService {
  // ✅ aujourd’hui : en mémoire. Demain : API.
  private projects: ProjectDetail[] = [this.buildFakeProject()];

  async getProjectById(projectId: string): Promise<ProjectDetail | null> {
    return this.projects.find(p => p.id === projectId) ?? null;
  }

  async listProjects(): Promise<Array<Pick<ProjectDetail, 'id' | 'name'>>> {
    return this.projects.map(p => ({ id: p.id, name: p.name }));
  }

  // Exemple pour plus tard : update via API
  async saveProject(project: ProjectDetail): Promise<void> {
    const idx = this.projects.findIndex(p => p.id === project.id);
    if (idx >= 0) this.projects[idx] = project;
    else this.projects.push(project);
  }

  // -------------------------
  // Fake data builder
  // -------------------------
  private buildFakeProject(): ProjectDetail {
    const phases: PhaseId[] = ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'];

    const activities: ProjectDetail['activities'] = {
      projet: { id: 'projet', label: 'Gestion du projet', owner: 'PMO' },
      metier: { id: 'metier', label: 'Gestion du métier', owner: 'Business' },
      changement: { id: 'changement', label: 'Gestion du changement', owner: 'Change' },
      technologie: { id: 'technologie', label: 'Gestion de la technologie', owner: 'IT' },
    };

    const emptyMatrix = (): Record<ActivityId, Record<PhaseId, Task[]>> => ({
      projet: this.emptyPhases(phases),
      metier: this.emptyPhases(phases),
      changement: this.emptyPhases(phases),
      technologie: this.emptyPhases(phases),
    });

    const taskMatrix = emptyMatrix();

    // ✅ EXEMPLE (reprends tes ids/labels réels si tu en as déjà)
    taskMatrix.projet.Phase1.push({ id: 'p1-1', label: 'Cadrage', status: 'inprogress' });
    taskMatrix.projet.Phase2.push({ id: 'p2-1', label: 'Plan projet', status: 'todo' });
    taskMatrix.projet.Phase3.push({ id: 'p3-1', label: 'Suivi', status: 'todo' });

    taskMatrix.metier.Phase2.push({ id: 'm2-1', label: 'Process cible', status: 'todo' });
    taskMatrix.metier.Phase3.push({ id: 'm3-1', label: 'Validation métier', status: 'todo' });

    taskMatrix.technologie.Phase2.push({ id: 't2-1', label: 'Architecture', status: 'todo' });
    taskMatrix.technologie.Phase3.push({ id: 't3-1', label: 'Build', status: 'todo' });

    return {
      id: 'proj-1',
      name: 'Projet Démo',
      description: 'Projet de démonstration (fake data)', // ✅
      phases,
      activities,
      taskMatrix,

      // ✅ dépendances initiales fake
      ganttDependencies: [
        { fromId: 'p1-1', toId: 'p2-1', type: 'F2S' },
        { fromId: 'p2-1', toId: 'p3-1', type: 'F2S' },
        { fromId: 'm2-1', toId: 'm3-1', type: 'F2S' },
        { fromId: 't2-1', toId: 't3-1', type: 'F2S' },
      ],
    };
  }

  private emptyPhases(phases: PhaseId[]): Record<PhaseId, Task[]> {
    return phases.reduce((acc, p) => {
      acc[p] = [];
      return acc;
    }, {} as Record<PhaseId, Task[]>);
  }
}
