// src/app/services/project-data.service.ts
import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type { ActivityDefinition, ActivityId, PhaseId, ProjectDetail, ProjectMember, ProjectRole, ProjectSettings, ProjectWorkflow, UserRef } from '../models';
import { FirebaseProjectDataBackendService } from './firebase-project-data-backend.service';
import type { ProjectDataBackend } from './project-data-backend';

export interface ProjectTypeRef {
  id: string;
  name: string;
  description?: string;
}

export interface CreateProjectTypePayload {
  id?: string;
  name: string;
  description?: string;
}

export interface UpdateProjectTypePayload {
  name?: string;
  description?: string;
}

export interface ProjectTypeDefaults {
  projectType: ProjectTypeRef;
  phases: Array<{ id: string; label: string; sequence?: number | null }>;
  activities: Array<{ id: string; label: string; sequence?: number | null }>;
  activitiesDefault: Array<{ id: string; label: string; phaseId: string; activityId: string; sequence?: number | null }>;
  tasks: Array<{ id: string; label: string; phaseId: string; activityId: string; sequence?: number | null }>;
  workflow?: ProjectWorkflow;
  displayInteractions?: ProjectSettings;
}

export type { ProjectWorkflow };

export interface ProjectHealthDefaultRef {
  healthId: string;
  shortName: string;
  longName: string;
  status: string;
  dateCreated: string;
  dateLastUpdated: string;
}

export interface CreateProjectRiskPayload {
  title: string;
  description?: string;
  probability: string;
  criticity: string;
  status?: string;
  remainingRiskId?: string | null;
}

export interface UpdateProjectRiskPayload {
  longName?: string;
  title?: string;
  description?: string;
  probability?: string;
  criticity?: string;
  status?: string;
  remainingRiskId?: string | null;
}

export type { ProjectMember, ProjectRole };

export interface ProjectRiskRef {
  projectId: string;
  riskId: string;
  shortName: string;
  longName: string;
  title: string;
  description: string;
  probability: string;
  criticity: string;
  status: string;
  dateCreated: string;
  dateLastUpdated: string;
  remainingRiskId: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectDataService {
  private readonly projectsCache = new Map<string, ProjectDetail>();
  private readonly risksChangedSubject = new Subject<{ projectId: string; reason: string }>();
  private readonly backend: ProjectDataBackend = inject(FirebaseProjectDataBackendService);
  private static readonly DEFAULT_PHASES: PhaseId[] = ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'];
  private static readonly DEFAULT_ACTIVITIES: Record<ActivityId, ActivityDefinition> = {
    projet: { id: 'projet', label: 'Gestion du projet', owner: '—', sequence: 1 },
    metier: { id: 'metier', label: 'Gestion du métier', owner: '—', sequence: 2 },
    changement: { id: 'changement', label: 'Gestion du changement', owner: '—', sequence: 3 },
    technologie: { id: 'technologie', label: 'Gestion de la technologie', owner: '—', sequence: 4 },
  };

  constructor() {}

  get risksChanged$(): Observable<{ projectId: string; reason: string }> {
    return this.risksChangedSubject.asObservable();
  }

  notifyRisksChanged(projectId: string, reason = 'manual'): void {
    const id = String(projectId ?? '').trim();
    if (!id) return;
    this.risksChangedSubject.next({ projectId: id, reason });
  }

  private withNoCache(url: string): string {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}_ts=${Date.now()}`;
  }

  cacheProject(project: ProjectDetail): void {
    const id = String(project?.id ?? '').trim();
    if (!id) return;
    this.projectsCache.set(id, project);
  }

  getCachedProject(projectId: string): ProjectDetail | undefined {
    const id = String(projectId ?? '').trim();
    if (!id) return undefined;
    return this.projectsCache.get(id);
  }

  removeCachedProject(projectId: string): void {
    const id = String(projectId ?? '').trim();
    if (!id) return;
    this.projectsCache.delete(id);
  }

  async listProjects(): Promise<Array<Pick<ProjectDetail, 'id' | 'name'>>> {
    return this.backend.listProjects();
  }

  async listUsers(projectId?: string | null): Promise<UserRef[]> {
    return this.backend.listUsers(projectId);
  }

  async listProjectTypes(): Promise<ProjectTypeRef[]> {
    return this.backend.listProjectTypes();
  }

  async createProjectType(payload: CreateProjectTypePayload): Promise<ProjectTypeDefaults> {
    return this.backend.createProjectType(payload);
  }

  async updateProjectType(projectTypeId: string, payload: UpdateProjectTypePayload): Promise<ProjectTypeDefaults> {
    return this.backend.updateProjectType(projectTypeId, payload);
  }

  async deleteProjectType(projectTypeId: string): Promise<void> {
    return this.backend.deleteProjectType(projectTypeId);
  }

  async listProjectHealthDefaults(): Promise<ProjectHealthDefaultRef[]> {
    return this.backend.listProjectHealthDefaults();
  }

  async updateProjectHealth(projectId: string, healthShortName: string, description?: string): Promise<any[]> {
    return this.backend.updateProjectHealth(projectId, healthShortName, description);
  }

  async createProjectRisk(projectId: string, payload: CreateProjectRiskPayload): Promise<ProjectRiskRef> {
    const created = await this.backend.createProjectRisk(projectId, payload);
    this.notifyRisksChanged(projectId, 'create');
    return created;
  }

  async updateProjectRisk(projectId: string, riskId: string, payload: UpdateProjectRiskPayload): Promise<ProjectRiskRef> {
    const updated = await this.backend.updateProjectRisk(projectId, riskId, payload);
    this.notifyRisksChanged(projectId, 'update');
    return updated;
  }

  async listProjectRisks(projectId: string): Promise<ProjectRiskRef[]> {
    return this.backend.listProjectRisks(projectId);
  }

  async getProjectTypeDefaults(projectTypeId: string): Promise<ProjectTypeDefaults | null> {
    return this.backend.getProjectTypeDefaults(projectTypeId);
  }

  async getProjectById(projectId: string | null): Promise<ProjectDetail | null> {
    const requestedProjectId = projectId;

    if (!projectId) {
      const list = await this.listProjects();
      if (!list.length) return null;
      projectId = list[0].id;
    }

    const fetchOne = async (id: string): Promise<ProjectDetail | null> => {
      const res: any = await this.backend.getProjectById(id);

      const hasActivities = !!res?.activities;
      const hasMatrix = !!res?.activityMatrix || !!res?.taskMatrix;
      if (!hasActivities || !hasMatrix) {
        console.warn('[ProjectDataService] unexpected response shape (tables required)', res);
        return null;
      }

      const normalized = this.normalizeProjectDetail(res, id);
      this.cacheProject(normalized);
      return normalized;
    };

    try {
      return await fetchOne(projectId);
    } catch (err) {
      console.error('[ProjectDataService] getProjectById error', { requestedProjectId, err });

      if (requestedProjectId) {
        return null;
      }

      const list = await this.listProjects();
      if (!list.length) return null;
      return await fetchOne(list[0].id);
    }
  }

  async getProjectDisplayInteractions(projectId: string): Promise<ProjectSettings> {
    return this.backend.getProjectDisplayInteractions(projectId);
  }

  async saveProjectDisplayInteractions(projectId: string, settings: ProjectSettings): Promise<ProjectSettings> {
    const saved = await this.backend.saveProjectDisplayInteractions(projectId, settings);
    const id = String(projectId ?? '').trim();
    const cached = this.projectsCache.get(id);
    if (cached) {
      this.cacheProject({ ...cached, displayInteractions: saved });
    }
    return saved;
  }


  async saveProject(project: ProjectDetail): Promise<void> {
    await this.backend.saveProject(project);
    this.cacheProject(project);
  }

  async deleteProject(projectId: string): Promise<void> {
    const id = String(projectId ?? '').trim();
    if (!id) throw new Error('Missing project id');

    await this.backend.deleteProject(id);
    this.removeCachedProject(id);
  }

  async runProjectProcedure(
    projectId: string,
    procedure: 'save_project',
    payload: { project: ProjectDetail }
  ): Promise<void> {
    try {
      await this.backend.runProjectProcedure(projectId, procedure, payload);
    } catch (err) {
      console.error('[ProjectDataService] runProjectProcedure failed', {
        procedure,
        projectId,
        backendError: (err as any)?.error,
        status: (err as any)?.status,
      });

      // Fallback compat: certaines instances backend peuvent échouer sur /procedure
      // mais accepter encore l'endpoint historique /projects.
      await this.saveProject(payload.project);
    }
  }

  async listProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return this.backend.listProjectMembers(projectId);
  }

  async setProjectMembers(projectId: string, members: ProjectMember[]): Promise<void> {
    await this.backend.setProjectMembers(projectId, members);
  }

  async saveProjectTypeWorkflow(projectTypeId: string, workflow: ProjectWorkflow): Promise<void> {
    await this.backend.saveProjectTypeWorkflow(projectTypeId, workflow);
  }

  async getCurrentProjectId(): Promise<string | null> {
    return this.backend.getCurrentProjectId();
  }

  async setCurrentProjectId(projectId: string): Promise<void> {
    await this.backend.setCurrentProjectId(projectId);
  }

  async saveProjectWorkflow(projectId: string, workflow: ProjectWorkflow): Promise<void> {
    const id = String(projectId ?? '').trim();
    if (!id) throw new Error('Missing project id');
    await this.backend.saveProjectWorkflow(id, workflow);
    const cached = this.projectsCache.get(id);
    if (cached) {
      this.cacheProject({ ...cached, workflow });
    }
  }

  private normalizeProjectDetail(raw: any, fallbackId: string): ProjectDetail {
    const phases = Array.isArray(raw?.phases) && raw.phases.length
      ? (raw.phases as PhaseId[])
      : ProjectDataService.DEFAULT_PHASES;

    const activities = (raw?.activities && typeof raw.activities === 'object')
      ? (raw.activities as Record<ActivityId, ActivityDefinition>)
      : ProjectDataService.DEFAULT_ACTIVITIES;

    const matrix = (raw?.activityMatrix && typeof raw.activityMatrix === 'object')
      ? (raw.activityMatrix as Record<ActivityId, Record<PhaseId, any[]>>)
      : ((raw?.taskMatrix && typeof raw.taskMatrix === 'object')
          ? (raw.taskMatrix as Record<ActivityId, Record<PhaseId, any[]>>)
          : {} as Record<ActivityId, Record<PhaseId, any[]>>);
    const taskMatrix = matrix;
    const activityMatrix = matrix;
    const projectItemsMatrix = (raw?.projectItemsMatrix ?? raw?.projectTasksMatrix) && typeof (raw?.projectItemsMatrix ?? raw?.projectTasksMatrix) === 'object'
      ? ((raw.projectItemsMatrix ?? raw.projectTasksMatrix) as Record<ActivityId, Record<PhaseId, Record<string, any[]>>>)
      : {} as Record<ActivityId, Record<PhaseId, Record<string, any[]>>>;
    const projectTasksMatrix = projectItemsMatrix;
    const phaseDefinitionsRaw = (raw?.phaseDefinitions && typeof raw.phaseDefinitions === 'object')
      ? raw.phaseDefinitions
      : {};
    const phaseDefinitions: Record<PhaseId, any> = {} as Record<PhaseId, any>;
    for (const phase of phases) {
      const def = phaseDefinitionsRaw?.[phase];
      const label = String(def?.label ?? phase).trim() || phase;
      phaseDefinitions[phase] = {
        id: phase,
        label,
        startDate: String(def?.startDate ?? ''),
        endDate: String(def?.endDate ?? ''),
      };
    }

    // Garantit une matrice complète pour éviter les trous en template/components
    for (const activityId of Object.keys(activities) as ActivityId[]) {
      if (!taskMatrix[activityId] || typeof taskMatrix[activityId] !== 'object') {
        taskMatrix[activityId] = {} as Record<PhaseId, any[]>;
      }
      if (!projectTasksMatrix[activityId] || typeof projectTasksMatrix[activityId] !== 'object') {
        projectTasksMatrix[activityId] = {} as Record<PhaseId, Record<string, any[]>>;
      }
      for (const phase of phases) {
        if (!Array.isArray(taskMatrix[activityId][phase])) {
          taskMatrix[activityId][phase] = [];
        }
        if (!projectTasksMatrix[activityId][phase] || typeof projectTasksMatrix[activityId][phase] !== 'object') {
          projectTasksMatrix[activityId][phase] = {};
        }
      }
    }

    return {
      ...raw,
      id: String(raw?.id ?? fallbackId),
      name: String(raw?.name ?? `Projet ${fallbackId}`),
      description: String(raw?.description ?? ''),
      displayInteractions: raw?.displayInteractions && typeof raw.displayInteractions === 'object'
        ? {
            periodPreset: String((raw.displayInteractions as any)?.periodPreset ?? '6m') as any,
            viewMode: String((raw.displayInteractions as any)?.viewMode ?? 'split') as any,
            hoverHintsEnabled: Boolean((raw.displayInteractions as any)?.hoverHintsEnabled ?? true),
            linkTooltipsEnabled: Boolean((raw.displayInteractions as any)?.linkTooltipsEnabled ?? true),
            defaultDependencyType: String((raw.displayInteractions as any)?.defaultDependencyType ?? 'F2S') as any,
          }
        : undefined,
      projectHealth: Array.isArray(raw?.projectHealth)
        ? raw.projectHealth.map((h: any) => ({
            healthId: String(h?.healthId ?? '').trim(),
            shortName: String(h?.shortName ?? '').trim(),
            longName: String(h?.longName ?? '').trim(),
            description: String(h?.description ?? '').trim(),
            status: String(h?.status ?? 'active').trim(),
            dateCreated: String(h?.dateCreated ?? '').trim(),
            dateLastUpdated: String(h?.dateLastUpdated ?? '').trim(),
          }))
        : [],
      projectRisks: Array.isArray(raw?.projectRisks)
        ? raw.projectRisks.map((r: any) => ({
            projectId: String(r?.projectId ?? String(raw?.id ?? fallbackId)).trim(),
            riskId: String(r?.riskId ?? '').trim(),
            title: String(r?.title ?? '').trim(),
            description: String(r?.description ?? '').trim(),
            probability: String(r?.probability ?? '').trim(),
            criticity: String(r?.criticity ?? '').trim(),
            status: String(r?.status ?? 'Open').trim(),
            dateCreated: String(r?.dateCreated ?? '').trim(),
            dateLastUpdated: String(r?.dateLastUpdated ?? '').trim(),
            remainingRiskId: String(r?.remainingRiskId ?? '').trim(),
          }))
        : [],
      phases,
      phaseDefinitions: phaseDefinitions as any,
      activities,
      activityMatrix,
      taskMatrix,
      projectItemsMatrix,
      projectTasksMatrix,
    } as ProjectDetail;
  }
}
