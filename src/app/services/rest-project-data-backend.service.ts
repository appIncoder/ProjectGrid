import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ProjectDetail, UserRef } from '../models';
import { environment } from '../environments/environment';
import type { ProjectDataBackend } from './project-data-backend';
import type {
  CreateProjectRiskPayload,
  ProjectHealthDefaultRef,
  ProjectRiskRef,
  ProjectTypeDefaults,
  ProjectTypeRef,
  UpdateProjectRiskPayload,
} from './project-data.service';

@Injectable({ providedIn: 'root' })
export class RestProjectDataBackendService implements ProjectDataBackend {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  private withNoCache(url: string): string {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}_ts=${Date.now()}`;
  }

  async listProjects(): Promise<Array<Pick<ProjectDetail, 'id' | 'name'>>> {
    const url = this.withNoCache(`${this.baseUrl}/projects`);
    const list = await firstValueFrom(this.http.get<Array<Pick<ProjectDetail, 'id' | 'name'>>>(url));
    console.log('[ProjectDataBackend:REST] listProjects()', { url, count: list?.length ?? 0, list });
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
    if (!id) throw new Error('Missing projectId');

    const url = `${this.baseUrl}/projects/${encodeURIComponent(id)}/risks`;
    const res = await firstValueFrom(this.http.post<any>(url, payload));
    const risk = res?.risk ?? res;

    return {
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
  }

  async updateProjectRisk(projectId: string, riskId: string, payload: UpdateProjectRiskPayload): Promise<ProjectRiskRef> {
    const id = String(projectId ?? '').trim();
    const rid = String(riskId ?? '').trim();
    if (!id || !rid) throw new Error('Missing projectId or riskId');

    const url = `${this.baseUrl}/projects/${encodeURIComponent(id)}/risks/${encodeURIComponent(rid)}`;
    const res = await firstValueFrom(this.http.put<any>(url, payload ?? {}));
    const risk = res?.risk ?? res;

    return {
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

    const defaultsRows = Array.isArray(raw?.activitiesDefault) ? raw.activitiesDefault : Array.isArray(raw?.tasks) ? raw.tasks : [];

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

  async getProjectById(projectId: string): Promise<unknown> {
    const url = this.withNoCache(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}`);
    const res = await firstValueFrom(this.http.get<any>(url));
    console.log('[ProjectDataBackend:REST] raw response', { url, res });
    return res;
  }

  async saveProject(project: ProjectDetail): Promise<void> {
    const url = `${this.baseUrl}/projects`;
    const matrix = (project as any)?.activityMatrix && typeof (project as any).activityMatrix === 'object'
      ? (project as any).activityMatrix
      : (project as any)?.taskMatrix && typeof (project as any).taskMatrix === 'object'
        ? (project as any).taskMatrix
        : {};
    const payload = {
      ...project,
      activityMatrix: matrix,
      taskMatrix: matrix,
    };

    const snapshot =
      typeof structuredClone === 'function'
        ? structuredClone(payload)
        : JSON.parse(JSON.stringify(payload));

    console.log('[ProjectDataBackend:REST] saveProject() POST', { url, payload: snapshot });
    await firstValueFrom(this.http.post<ProjectDetail>(url, payload));
    console.log('[ProjectDataBackend:REST] saveProject() OK', { url, projectId: payload?.id });
  }

  async deleteProject(projectId: string): Promise<void> {
    const id = String(projectId ?? '').trim();
    if (!id) throw new Error('Missing project id');

    const url = `${this.baseUrl}/projects/${encodeURIComponent(id)}`;
    await firstValueFrom(this.http.delete<{ ok?: boolean; id?: string }>(url));
  }

  async runProjectProcedure(projectId: string, procedure: 'save_project', payload: { project: ProjectDetail }): Promise<void> {
    const url = `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/procedure`;
    const matrix = (payload?.project as any)?.activityMatrix && typeof (payload?.project as any).activityMatrix === 'object'
      ? (payload.project as any).activityMatrix
      : (payload?.project as any)?.taskMatrix && typeof (payload?.project as any).taskMatrix === 'object'
        ? (payload.project as any).taskMatrix
        : {};
    const normalizedPayload = {
      project: {
        ...payload.project,
        activityMatrix: matrix,
        taskMatrix: matrix,
      },
    };

    await firstValueFrom(this.http.post(url, { procedure, payload: normalizedPayload }));
  }
}
