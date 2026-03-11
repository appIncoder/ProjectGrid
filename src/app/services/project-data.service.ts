// src/app/services/project-data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Observable, Subject } from 'rxjs';
import type { ActivityDefinition, ActivityId, PhaseId, ProjectDetail, UserRef } from '../models';
import { environment } from '../environments/environment';

export interface ProjectTypeRef {
  id: string;
  name: string;
  description?: string;
}

export interface ProjectTypeDefaults {
  projectType: ProjectTypeRef;
  phases: Array<{ id: string; label: string; sequence?: number | null }>;
  activities: Array<{ id: string; label: string; sequence?: number | null }>;
  activitiesDefault: Array<{ id: string; label: string; phaseId: string; activityId: string; sequence?: number | null }>;
  tasks: Array<{ id: string; label: string; phaseId: string; activityId: string; sequence?: number | null }>;
}

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
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly projectsCache = new Map<string, ProjectDetail>();
  private readonly risksChangedSubject = new Subject<{ projectId: string; reason: string }>();
  private static readonly DEFAULT_PHASES: PhaseId[] = ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'];
  private static readonly DEFAULT_ACTIVITIES: Record<ActivityId, ActivityDefinition> = {
    projet: { id: 'projet', label: 'Gestion du projet', owner: '—', sequence: 1 },
    metier: { id: 'metier', label: 'Gestion du métier', owner: '—', sequence: 2 },
    changement: { id: 'changement', label: 'Gestion du changement', owner: '—', sequence: 3 },
    technologie: { id: 'technologie', label: 'Gestion de la technologie', owner: '—', sequence: 4 },
  };

  constructor(private http: HttpClient) {}

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
    const url = this.withNoCache(`${this.baseUrl}/projects`);
    const list = await firstValueFrom(
      this.http.get<Array<Pick<ProjectDetail, 'id' | 'name'>>>(url)
    );

    console.log('[ProjectDataService] listProjects()', { url, count: list?.length ?? 0, list });

    return list;
  }

  async listUsers(projectId?: string | null): Promise<UserRef[]> {
    const id = String(projectId ?? '').trim();
    const qp = id ? `?projectId=${encodeURIComponent(id)}` : '';
    const url = this.withNoCache(`${this.baseUrl}/users${qp}`);
    const rows = await firstValueFrom(this.http.get<Array<{ id?: unknown; label?: unknown; name?: unknown }>>(url));
    return (Array.isArray(rows) ? rows : [])
      .map((r) => ({
        id: String(r?.id ?? '').trim(),
        label: String((r?.label ?? r?.name ?? r?.id ?? '')).trim(),
      }))
      .filter((u) => !!u.id);
  }

  async listProjectTypes(): Promise<ProjectTypeRef[]> {
    const url = this.withNoCache(`${this.baseUrl}/project-types`);
    const rows = await firstValueFrom(
      this.http.get<Array<{ id?: unknown; name?: unknown; description?: unknown }>>(url)
    );
    return (Array.isArray(rows) ? rows : [])
      .map((r) => ({
        id: String(r?.id ?? '').trim(),
        name: String(r?.name ?? '').trim(),
        description: String(r?.description ?? '').trim(),
      }))
      .filter((t) => !!t.id && !!t.name);
  }

  async listProjectHealthDefaults(): Promise<ProjectHealthDefaultRef[]> {
    const url = this.withNoCache(`${this.baseUrl}/project-health-defaults`);
    const rows = await firstValueFrom(this.http.get<any[]>(url));
    return (Array.isArray(rows) ? rows : []).map((r: any) => ({
      healthId: String(r?.healthId ?? '').trim(),
      shortName: String(r?.shortName ?? '').trim(),
      longName: String(r?.longName ?? '').trim(),
      status: String(r?.status ?? 'active').trim(),
      dateCreated: String(r?.dateCreated ?? '').trim(),
      dateLastUpdated: String(r?.dateLastUpdated ?? '').trim(),
    }));
  }

  async updateProjectHealth(projectId: string, healthShortName: string, description?: string): Promise<any[]> {
    const id = String(projectId ?? '').trim();
    const shortName = String(healthShortName ?? '').trim();
    if (!id || !shortName) {
      throw new Error('Missing projectId or healthShortName');
    }

    const url = `${this.baseUrl}/projects/${encodeURIComponent(id)}/health`;
    const payload: any = { healthShortName: shortName };
    if (typeof description === 'string') payload.description = description;

    const res = await firstValueFrom(this.http.post<any>(url, payload));
    return Array.isArray(res?.projectHealth) ? res.projectHealth : [];
  }

  async createProjectRisk(projectId: string, payload: CreateProjectRiskPayload): Promise<ProjectRiskRef> {
    const id = String(projectId ?? '').trim();
    if (!id) {
      throw new Error('Missing projectId');
    }

    const url = `${this.baseUrl}/projects/${encodeURIComponent(id)}/risks`;
    const res = await firstValueFrom(this.http.post<any>(url, payload));
    const risk = res?.risk ?? res;

    const created = {
      projectId: String(risk?.projectId ?? id).trim(),
      riskId: String(risk?.riskId ?? '').trim(),
      shortName: String(risk?.shortName ?? '').trim(),
      longName: String(risk?.longName ?? risk?.title ?? '').trim(),
      title: String(risk?.longName ?? risk?.title ?? '').trim(),
      description: String(risk?.description ?? '').trim(),
      probability: String(risk?.probability ?? '').trim(),
      criticity: String(risk?.criticity ?? '').trim(),
      status: String(risk?.status ?? 'Open').trim(),
      dateCreated: String(risk?.dateCreated ?? '').trim(),
      dateLastUpdated: String(risk?.dateLastUpdated ?? '').trim(),
      remainingRiskId: String(risk?.remainingRiskId ?? '').trim(),
    };

    this.notifyRisksChanged(id, 'create');
    return created;
  }

  async updateProjectRisk(projectId: string, riskId: string, payload: UpdateProjectRiskPayload): Promise<ProjectRiskRef> {
    const id = String(projectId ?? '').trim();
    const rid = String(riskId ?? '').trim();
    if (!id || !rid) {
      throw new Error('Missing projectId or riskId');
    }

    const url = `${this.baseUrl}/projects/${encodeURIComponent(id)}/risks/${encodeURIComponent(rid)}`;
    const res = await firstValueFrom(this.http.put<any>(url, payload ?? {}));
    const risk = res?.risk ?? res;

    const updated = {
      projectId: String(risk?.projectId ?? id).trim(),
      riskId: String(risk?.riskId ?? rid).trim(),
      shortName: String(risk?.shortName ?? '').trim(),
      longName: String(risk?.longName ?? risk?.title ?? '').trim(),
      title: String(risk?.longName ?? risk?.title ?? '').trim(),
      description: String(risk?.description ?? '').trim(),
      probability: String(risk?.probability ?? '').trim(),
      criticity: String(risk?.criticity ?? '').trim(),
      status: String(risk?.status ?? 'Open').trim(),
      dateCreated: String(risk?.dateCreated ?? '').trim(),
      dateLastUpdated: String(risk?.dateLastUpdated ?? '').trim(),
      remainingRiskId: String(risk?.remainingRiskId ?? '').trim(),
    };

    this.notifyRisksChanged(id, 'update');
    return updated;
  }

  async listProjectRisks(projectId: string): Promise<ProjectRiskRef[]> {
    const id = String(projectId ?? '').trim();
    if (!id) return [];

    const url = this.withNoCache(`${this.baseUrl}/projects/${encodeURIComponent(id)}/risks`);
    const rows = await firstValueFrom(this.http.get<any[]>(url));
    return (Array.isArray(rows) ? rows : []).map((risk) => ({
      projectId: String(risk?.projectId ?? id).trim(),
      riskId: String(risk?.riskId ?? '').trim(),
      shortName: String(risk?.shortName ?? '').trim(),
      longName: String(risk?.longName ?? risk?.title ?? '').trim(),
      title: String(risk?.longName ?? risk?.title ?? '').trim(),
      description: String(risk?.description ?? '').trim(),
      probability: String(risk?.probability ?? '').trim(),
      criticity: String(risk?.criticity ?? '').trim(),
      status: String(risk?.status ?? 'Open').trim(),
      dateCreated: String(risk?.dateCreated ?? '').trim(),
      dateLastUpdated: String(risk?.dateLastUpdated ?? '').trim(),
      remainingRiskId: String(risk?.remainingRiskId ?? '').trim(),
    }));
  }

  async getProjectTypeDefaults(projectTypeId: string): Promise<ProjectTypeDefaults | null> {
    const id = String(projectTypeId ?? '').trim();
    if (!id) return null;
    const url = this.withNoCache(`${this.baseUrl}/project-types/${encodeURIComponent(id)}/defaults`);
    const raw = await firstValueFrom(this.http.get<any>(url));
    if (!raw || !raw.projectType) return null;

    const defaultsRows = Array.isArray(raw?.activitiesDefault)
      ? raw.activitiesDefault
      : (Array.isArray(raw?.tasks) ? raw.tasks : []);

    return {
      projectType: {
        id: String(raw?.projectType?.id ?? '').trim(),
        name: String(raw?.projectType?.name ?? '').trim(),
        description: String(raw?.projectType?.description ?? '').trim(),
      },
      phases: Array.isArray(raw?.phases)
        ? raw.phases.map((p: any) => ({
            id: String(p?.id ?? '').trim(),
            label: String(p?.label ?? p?.id ?? '').trim(),
            sequence: Number.isFinite(Number(p?.sequence)) ? Number(p.sequence) : null,
          }))
        : [],
      activities: Array.isArray(raw?.activities)
        ? raw.activities.map((a: any) => ({
            id: String(a?.id ?? '').trim(),
            label: String(a?.label ?? a?.id ?? '').trim(),
            sequence: Number.isFinite(Number(a?.sequence)) ? Number(a.sequence) : null,
          }))
        : [],
      activitiesDefault: defaultsRows.map((t: any) => ({
        id: String(t?.id ?? '').trim(),
        label: String(t?.label ?? t?.id ?? '').trim(),
        phaseId: String(t?.phaseId ?? '').trim(),
        activityId: String(t?.activityId ?? '').trim(),
        sequence: Number.isFinite(Number(t?.sequence)) ? Number(t.sequence) : null,
      })),
      tasks: defaultsRows.map((t: any) => ({
            id: String(t?.id ?? '').trim(),
            label: String(t?.label ?? t?.id ?? '').trim(),
            phaseId: String(t?.phaseId ?? '').trim(),
            activityId: String(t?.activityId ?? '').trim(),
            sequence: Number.isFinite(Number(t?.sequence)) ? Number(t.sequence) : null,
          })),
    };
  }

  async getProjectById(projectId: string | null): Promise<ProjectDetail | null> {
    const requestedProjectId = projectId;

    if (!projectId) {
      const list = await this.listProjects();
      if (!list.length) return null;
      projectId = list[0].id;
    }

    const fetchOne = async (id: string): Promise<ProjectDetail | null> => {
      const url = this.withNoCache(`${this.baseUrl}/projects/${encodeURIComponent(id)}`);
      const res = await firstValueFrom(this.http.get<any>(url));

      console.log('[ProjectDataService] raw response', { url, res });

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


  async saveProject(project: ProjectDetail): Promise<void> {
    const url = `${this.baseUrl}/projects`;
    const matrix = ((project as any)?.activityMatrix && typeof (project as any).activityMatrix === 'object')
      ? (project as any).activityMatrix
      : ((project as any)?.taskMatrix && typeof (project as any).taskMatrix === 'object'
          ? (project as any).taskMatrix
          : {});
    const payload = {
      ...project,
      activityMatrix: matrix,
      taskMatrix: matrix,
    };

    const snapshot =
      typeof structuredClone === 'function'
        ? structuredClone(payload)
        : JSON.parse(JSON.stringify(payload));

    console.log('[ProjectDataService] saveProject() POST', { url, payload: snapshot });

    // POST upsert
    await firstValueFrom(this.http.post<ProjectDetail>(url, payload));
    this.cacheProject(payload as ProjectDetail);

    console.log('[ProjectDataService] saveProject() OK', { url, projectId: payload?.id });
  }

  async deleteProject(projectId: string): Promise<void> {
    const id = String(projectId ?? '').trim();
    if (!id) throw new Error('Missing project id');

    const url = `${this.baseUrl}/projects/${encodeURIComponent(id)}`;
    await firstValueFrom(this.http.delete<{ ok?: boolean; id?: string }>(url));
    this.removeCachedProject(id);
  }

  async runProjectProcedure(
    projectId: string,
    procedure: 'save_project',
    payload: { project: ProjectDetail }
  ): Promise<void> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/procedure`;
    const matrix = ((payload?.project as any)?.activityMatrix && typeof (payload?.project as any).activityMatrix === 'object')
      ? (payload.project as any).activityMatrix
      : ((payload?.project as any)?.taskMatrix && typeof (payload?.project as any).taskMatrix === 'object'
          ? (payload.project as any).taskMatrix
          : {});
    const normalizedPayload = {
      project: {
        ...payload.project,
        activityMatrix: matrix,
        taskMatrix: matrix,
      },
    };
    try {
      await firstValueFrom(this.http.post(url, { procedure, payload: normalizedPayload }));
    } catch (err) {
      console.error('[ProjectDataService] runProjectProcedure failed', {
        url,
        procedure,
        projectId,
        backendError: (err as any)?.error,
        status: (err as any)?.status,
      });

      // Fallback compat: certaines instances backend peuvent échouer sur /procedure
      // mais accepter encore l'endpoint historique /projects.
      await this.saveProject(normalizedPayload.project);
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
    const projectTasksMatrix = (raw?.projectTasksMatrix && typeof raw.projectTasksMatrix === 'object')
      ? (raw.projectTasksMatrix as Record<ActivityId, Record<PhaseId, Record<string, any[]>>>)
      : {} as Record<ActivityId, Record<PhaseId, Record<string, any[]>>>;
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
      projectTasksMatrix,
    } as ProjectDetail;
  }
}
