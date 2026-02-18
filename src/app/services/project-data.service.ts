// src/app/services/project-data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ActivityDefinition, ActivityId, PhaseId, ProjectDetail } from '../models';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectDataService {
  private readonly baseUrl = environment.apiBaseUrl;
  private static readonly DEFAULT_PHASES: PhaseId[] = ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'];
  private static readonly DEFAULT_ACTIVITIES: Record<ActivityId, ActivityDefinition> = {
    projet: { id: 'projet', label: 'Gestion du projet', owner: '—' },
    metier: { id: 'metier', label: 'Gestion du métier', owner: '—' },
    changement: { id: 'changement', label: 'Gestion du changement', owner: '—' },
    technologie: { id: 'technologie', label: 'Gestion de la technologie', owner: '—' },
  };

  constructor(private http: HttpClient) {}

  async listProjects(): Promise<Array<Pick<ProjectDetail, 'id' | 'name'>>> {
    const url = `${this.baseUrl}/projects`;
    const list = await firstValueFrom(
      this.http.get<Array<Pick<ProjectDetail, 'id' | 'name'>>>(url)
    );

    console.log('[ProjectDataService] listProjects()', { url, count: list?.length ?? 0, list });

    return list;
  }

  async getProjectById(projectId: string | null): Promise<ProjectDetail | null> {
  const requestedProjectId = projectId;

  // même comportement qu’avant : si pas d’id, on prend le “premier”
  if (!projectId) {
    const list = await this.listProjects();
    if (!list.length) return null;
    projectId = list[0].id;
  }

  const fetchOne = async (id: string): Promise<ProjectDetail | null> => {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(id)}`;
    const res = await firstValueFrom(this.http.get<any>(url));

    console.log('[ProjectDataService] raw response', { url, res });

    // ✅ Cas 1 : API renvoie déjà un ProjectDetail
    if (res?.activities && res?.taskMatrix) {
      return this.normalizeProjectDetail(res, id);
    }

    // ✅ Cas 2 : API renvoie { id, payload: "...." }
    if (typeof res?.payload === 'string') {
      try {
        const parsed = JSON.parse(res.payload);
        return this.normalizeProjectDetail(parsed, id);
      } catch (e) {
        console.error('[ProjectDataService] payload string invalid JSON', e, res.payload);
        return null;
      }
    }

    // ✅ Cas 3 : API renvoie { id, payload: {...} }
    if (res?.payload && typeof res.payload === 'object') {
      return this.normalizeProjectDetail(res.payload, id);
    }

    console.warn('[ProjectDataService] unexpected response shape', res);
    return null;
  };

  try {
    return await fetchOne(projectId);
  } catch (err) {
    console.error('[ProjectDataService] getProjectById error', { requestedProjectId, err });

    // Si un id explicite est demandé, on ne substitue pas un autre projet.
    if (requestedProjectId) {
      return null;
    }

    const list = await this.listProjects();
    if (!list.length) return null;
    return await fetchOne(list[0].id);
  }
}


  async saveProject(project: ProjectDetail): Promise<void> {
    const url = `${this.baseUrl}/projects`;

    const snapshot =
      typeof structuredClone === 'function'
        ? structuredClone(project)
        : JSON.parse(JSON.stringify(project));

    console.log('[ProjectDataService] saveProject() POST', { url, payload: snapshot });

    // POST upsert
    await firstValueFrom(this.http.post<ProjectDetail>(url, project));

    console.log('[ProjectDataService] saveProject() OK', { url, projectId: project?.id });
  }

  private normalizeProjectDetail(raw: any, fallbackId: string): ProjectDetail {
    const phases = Array.isArray(raw?.phases) && raw.phases.length
      ? (raw.phases as PhaseId[])
      : ProjectDataService.DEFAULT_PHASES;

    const activities = (raw?.activities && typeof raw.activities === 'object')
      ? (raw.activities as Record<ActivityId, ActivityDefinition>)
      : ProjectDataService.DEFAULT_ACTIVITIES;

    const taskMatrix = (raw?.taskMatrix && typeof raw.taskMatrix === 'object')
      ? (raw.taskMatrix as Record<ActivityId, Record<PhaseId, any[]>>)
      : {} as Record<ActivityId, Record<PhaseId, any[]>>;

    // Garantit une matrice complète pour éviter les trous en template/components
    for (const activityId of Object.keys(activities) as ActivityId[]) {
      if (!taskMatrix[activityId] || typeof taskMatrix[activityId] !== 'object') {
        taskMatrix[activityId] = {} as Record<PhaseId, any[]>;
      }
      for (const phase of phases) {
        if (!Array.isArray(taskMatrix[activityId][phase])) {
          taskMatrix[activityId][phase] = [];
        }
      }
    }

    return {
      ...raw,
      id: String(raw?.id ?? fallbackId),
      name: String(raw?.name ?? `Projet ${fallbackId}`),
      description: String(raw?.description ?? ''),
      phases,
      activities,
      taskMatrix,
    } as ProjectDetail;
  }
}
