import { Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type CollectionReference,
  type DocumentData,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore';
import type { ActivityDefinition, ActivityId, Item, ItemComment, PhaseId, ProjectDetail, ProjectMember, ProjectRole, ProjectSettings, ProjectWorkflow, UserRef } from '../models';
import { DEFAULT_PROJECT_SETTINGS } from '../models';
import type { ProjectDataBackend } from './project-data-backend';
import type {
  CreateProjectTypePayload,
  CreateProjectRiskPayload,
  ProjectHealthDefaultRef,
  ProjectRiskRef,
  ProjectTypeDefaults,
  ProjectTypeRef,
  UpdateProjectTypePayload,
  UpdateProjectRiskPayload,
} from './project-data.service';
import { DEFAULT_WORKFLOW, getProjectTypeFallback, PROJECT_TYPE_FALLBACKS } from './project-type-fallbacks';
import { FirebaseSdkService } from './firebase-sdk.service';
import { AuthService } from './auth.service';

type FirestoreMap = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class FirebaseProjectDataBackendService implements ProjectDataBackend {
  private static readonly DEFAULT_PHASES: PhaseId[] = ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'];
  private static readonly DEFAULT_ACTIVITIES: Record<ActivityId, ActivityDefinition> = {
    projet: { id: 'projet', label: 'Gestion du projet', owner: '—', sequence: 1 },
    metier: { id: 'metier', label: 'Gestion du métier', owner: '—', sequence: 2 },
    changement: { id: 'changement', label: 'Gestion du changement', owner: '—', sequence: 3 },
    technologie: { id: 'technologie', label: 'Gestion de la technologie', owner: '—', sequence: 4 },
  };
  private static readonly DEFAULT_HEALTH_DEFAULTS: ProjectHealthDefaultRef[] = [
    { healthId: 'good', shortName: 'Good', longName: 'No known issues', status: 'active', dateCreated: '', dateLastUpdated: '' },
    { healthId: 'average', shortName: 'Average', longName: 'Non blocking issues to manage', status: 'active', dateCreated: '', dateLastUpdated: '' },
    { healthId: 'bad', shortName: 'Bad', longName: 'Severe issues requiring action', status: 'active', dateCreated: '', dateLastUpdated: '' },
    { healthId: 'blocked', shortName: 'Blocked', longName: 'Blocking issues requiring immediate action', status: 'active', dateCreated: '', dateLastUpdated: '' },
  ];

  constructor(
    private firebaseSdk: FirebaseSdkService,
    private auth: AuthService,
  ) {}

  private unsupported(): never {
    throw new Error('Firebase project data backend operation is not implemented.');
  }

  private firestore(): Firestore {
    return this.firebaseSdk.firestore();
  }

  private asRecord(value: unknown): FirestoreMap | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as FirestoreMap) : null;
  }

  private asArray<T = unknown>(value: unknown): T[] {
    return Array.isArray(value) ? value as T[] : [];
  }

  private asString(value: unknown, fallback = ''): string {
    if (value instanceof Timestamp) {
      return value.toDate().toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value ?? fallback).trim();
  }

  private asDateString(value: unknown): string {
    const raw = this.asString(value);
    if (!raw) return '';

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toISOString();
  }

  private asProjectDateString(value: unknown): string {
    const raw = this.asString(value);
    if (!raw) return '';

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toISOString().slice(0, 10);
  }

  private asNumberOrNull(value: unknown): number | null {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private defaultPhaseLabel(phaseId: string): string {
    const match = /^Phase\s*([0-9]+)$/i.exec(phaseId.trim());
    return match ? `Phase ${match[1]}` : phaseId;
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  private normalizeRiskStatus(raw: string): string {
    const norm = raw.trim().toUpperCase();
    if (norm === 'OPEN') return 'Open';
    if (norm === 'IN_PROGRESS' || norm === 'IN PROGRESS') return 'In Progress';
    if (norm === 'ON_HOLD' || norm === 'ON HOLD') return 'On Hold';
    if (norm === 'RESOLVED') return 'Resolved';
    if (norm === 'CLOSED') return 'Closed';
    return 'Open';
  }

  private buildRiskShortName(longName: string): string {
    const clean = longName.replace(/[^\p{L}\p{N}\s]+/gu, ' ').trim();
    if (!clean) return 'RSK';

    const parts = clean.split(/\s+/u).filter(Boolean);
    let shortName = '';
    for (const part of parts) {
      shortName += part.slice(0, 1).toUpperCase();
      if (shortName.length >= 3) break;
    }

    if (shortName.length < 3) {
      const fallback = clean.replace(/[^\p{L}\p{N}]+/gu, '').toUpperCase();
      shortName += fallback.slice(0, 3 - shortName.length);
    }

    return shortName.padEnd(3, 'X').slice(0, 3);
  }

  private createUuid(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const rand = Math.floor(Math.random() * 16);
      const value = char === 'x' ? rand : ((rand & 0x3) | 0x8);
      return value.toString(16);
    });
  }

  private compareByCaseInsensitive(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  }

  private slugifyProjectTypeId(value: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async getProjectOrThrow(projectId: string): Promise<ProjectDetail> {
    const id = this.asString(projectId);
    if (!id) {
      throw new Error('Missing project id');
    }

    const snapshot = await getDoc(doc(this.firestore(), 'projects', id));
    if (!snapshot.exists()) {
      throw new Error('Project not found');
    }

    return this.normalizeProjectDetail(snapshot.id, snapshot.data());
  }

  private async getCurrentUserAccess(): Promise<{ userId: string; globalRoles: string[]; projectIds: string[] }> {
    const userId = this.asString(this.auth.user?.id);
    if (!userId) {
      return { userId: '', globalRoles: [], projectIds: [] };
    }

    try {
      const snapshot = await getDoc(doc(this.firestore(), 'users', userId));
      
      // If user doc doesn't exist, return empty access (will be populated by rebuild-firestore-access)
      if (!snapshot.exists()) {
        console.warn('[FirebaseProjectDataBackend] User document not found', { userId });
        return { userId, globalRoles: [], projectIds: [] };
      }

      const data = this.asRecord(snapshot.data()) ?? {};
      const globalRoles = this.asArray(data['globalRoles'])
        .map((role) => this.asString(role))
        .filter((role) => role !== '');
      const projectIds = this.asArray(data['projectIds'])
        .map((projectId) => this.asString(projectId))
        .filter((projectId) => projectId !== '');
      return { userId, globalRoles, projectIds };
    } catch (error) {
      console.error('[FirebaseProjectDataBackend] getCurrentUserAccess failed', { userId, error });
      return { userId, globalRoles: [], projectIds: [] };
    }
  }

  private async ensureCurrentUserProjectAccess(projectId: string, memberRoles: Record<string, unknown>): Promise<void> {
    const userId = this.asString(this.auth.user?.id);
    if (!userId) return;

    const normalizedProjectId = this.asString(projectId);
    if (!normalizedProjectId) return;

    const userRef = doc(this.firestore(), 'users', userId);
    const snapshot = await getDoc(userRef);
    const data = snapshot.exists() ? (this.asRecord(snapshot.data()) ?? {}) : {};
    const currentProjectIds = this.asArray(data['projectIds'])
      .map((item) => this.asString(item))
      .filter((item) => item !== '');
    const nextProjectIds = Array.from(new Set([...currentProjectIds, normalizedProjectId])).sort();

    const nextGlobalRoles = this.asArray(data['globalRoles'])
      .map((item) => this.asString(item))
      .filter((item) => item !== '');

    await setDoc(userRef, {
      id: userId,
      uid: userId,
      projectIds: nextProjectIds,
      globalRoles: nextGlobalRoles,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  private async getHealthDefaultsMap(): Promise<Map<string, ProjectHealthDefaultRef>> {
    const fetched = await this.listProjectHealthDefaults();
    const rows = fetched.length > 0 ? fetched : FirebaseProjectDataBackendService.DEFAULT_HEALTH_DEFAULTS;
    const byShortName = new Map<string, ProjectHealthDefaultRef>();

    for (const row of rows) {
      const shortName = this.asString(row.shortName);
      if (!shortName) continue;
      byShortName.set(shortName.toLowerCase(), row);
    }

    return byShortName;
  }

  private normalizeItem(task: unknown, fallbackId = ''): Item | null {
    const raw = this.asRecord(task);
    if (!raw) return null;

    const id = this.asString(raw['id'], fallbackId);
    if (!id) return null;

    const normalized: Item = {
      id,
      label: this.asString(raw['label'], id),
      status: (this.asString(raw['status'], 'todo') || 'todo') as Item['status'],
    };

    const startDate = this.asProjectDateString(raw['startDate'] ?? raw['startdate']);
    const endDate = this.asProjectDateString(raw['endDate'] ?? raw['enddate']);
    if (startDate) normalized['startDate'] = startDate;
    if (endDate) normalized['endDate'] = endDate;

    const reporterId = this.asString(raw['reporterId']);
    const accountantId = this.asString(raw['accountantId']);
    const responsibleId = this.asString(raw['responsibleId']);
    const parentActivityId = this.asString(raw['parentActivityId']);
    const category = this.asString(raw['category']);
    const phase = this.asString(raw['phase']);
    if (reporterId) normalized.reporterId = reporterId;
    if (accountantId) normalized.accountantId = accountantId;
    if (responsibleId) normalized.responsibleId = responsibleId;
    if (parentActivityId) normalized.parentActivityId = parentActivityId;
    if (category) normalized.category = category as Item['category'];
    if (phase) normalized.phase = phase as PhaseId;

    const comments = this.asArray(raw['comments'])
      .map((comment) => {
        const item = this.asRecord(comment);
        if (!item) return null;
        const text = this.asString(item['text'] ?? item['comment']);
        if (!text) return null;
        return {
          text,
          authorId: this.asString(item['authorId']),
          authorName: this.asString(item['authorName']),
          createdAt: this.asDateString(item['createdAt']),
        } as ItemComment;
      })
      .filter((item): item is ItemComment => !!item);

    if (comments.length) normalized['comments'] = comments;
    return normalized;
  }

  /** @deprecated Use normalizeItem instead */
  private normalizeTask(task: unknown, fallbackId = ''): Item | null {
    return this.normalizeItem(task, fallbackId);
  }

  private normalizeActivityDefinitions(raw: unknown): Record<ActivityId, ActivityDefinition> {
    const source = this.asRecord(raw) ?? {};
    const normalized: Partial<Record<ActivityId, ActivityDefinition>> = {};

    for (const [activityId, fallback] of Object.entries(FirebaseProjectDataBackendService.DEFAULT_ACTIVITIES) as Array<[ActivityId, ActivityDefinition]>) {
      const item = this.asRecord(source[activityId]) ?? {};
      normalized[activityId] = {
        id: activityId,
        label: this.asString(item['label'], fallback.label) || fallback.label,
        owner: this.asString(item['owner'], fallback.owner) || fallback.owner,
        sequence: this.asNumberOrNull(item['sequence'] ?? fallback.sequence),
      };
    }

    return normalized as Record<ActivityId, ActivityDefinition>;
  }

  private normalizePhases(rawProject: FirestoreMap): {
    phases: PhaseId[];
    phaseDefinitions: Record<PhaseId, { id: PhaseId; label: string; startDate: string; endDate: string }>;
  } {
    const rawPhases = this.asArray(rawProject['phases']);
    const phases = (rawPhases.length ? rawPhases : FirebaseProjectDataBackendService.DEFAULT_PHASES)
      .map((phase) => this.asString(phase))
      .filter(Boolean) as PhaseId[];

    const uniquePhases = Array.from(new Set(phases)) as PhaseId[];
    const rawDefinitions = this.asRecord(rawProject['phaseDefinitions']) ?? {};
    const phaseDefinitions = {} as Record<PhaseId, { id: PhaseId; label: string; startDate: string; endDate: string }>;

    for (const phaseId of uniquePhases) {
      const def = this.asRecord(rawDefinitions[phaseId]) ?? {};
      phaseDefinitions[phaseId] = {
        id: phaseId,
        label: this.asString(def['label'], this.defaultPhaseLabel(phaseId)) || this.defaultPhaseLabel(phaseId),
        startDate: this.asProjectDateString(def['startDate']),
        endDate: this.asProjectDateString(def['endDate']),
      };
    }

    return { phases: uniquePhases, phaseDefinitions };
  }

  private normalizeActivityMatrix(
    rawMatrix: unknown,
    activities: Record<ActivityId, ActivityDefinition>,
    phases: PhaseId[],
  ): Record<ActivityId, Record<PhaseId, Item[]>> {
    const source = this.asRecord(rawMatrix) ?? {};
    const matrix = {} as Record<ActivityId, Record<PhaseId, Item[]>>;

    for (const activityId of Object.keys(activities) as ActivityId[]) {
      matrix[activityId] = {} as Record<PhaseId, Item[]>;
      const activityRows = this.asRecord(source[activityId]) ?? {};
      for (const phaseId of phases) {
        const rows = this.asArray(activityRows[phaseId])
          .map((item) => this.normalizeItem(item))
          .filter((item): item is Item => !!item);
        matrix[activityId][phaseId] = rows;
      }
    }

    return matrix;
  }

  private normalizeProjectItemsMatrix(
    rawMatrix: unknown,
    activities: Record<ActivityId, ActivityDefinition>,
    phases: PhaseId[],
    activityMatrix: Record<ActivityId, Record<PhaseId, Item[]>>,
  ): Record<ActivityId, Record<PhaseId, Record<string, Item[]>>> {
    const source = this.asRecord(rawMatrix) ?? {};
    const matrix = {} as Record<ActivityId, Record<PhaseId, Record<string, Item[]>>>;

    for (const activityId of Object.keys(activities) as ActivityId[]) {
      matrix[activityId] = {} as Record<PhaseId, Record<string, Item[]>>;
      const activityRows = this.asRecord(source[activityId]) ?? {};

      for (const phaseId of phases) {
        const phaseRows = this.asRecord(activityRows[phaseId]) ?? {};
        const normalizedPhaseRows: Record<string, Item[]> = {};

        for (const [parentId, items] of Object.entries(phaseRows)) {
          normalizedPhaseRows[parentId] = this.asArray(items)
            .map((item) => this.normalizeItem(item, parentId))
            .filter((item): item is Item => !!item)
            .map((item) => ({
              ...item,
              parentActivityId: item.parentActivityId || parentId,
              comments: this.asArray<ItemComment>(item.comments),
            }));
        }

        if (Object.keys(normalizedPhaseRows).length === 0) {
          for (const parentItem of activityMatrix[activityId][phaseId]) {
            const parentId = this.asString(parentItem['id']);
            if (!parentId) continue;
            normalizedPhaseRows[parentId] = [{
              ...parentItem,
              parentActivityId: parentId,
              comments: this.asArray<ItemComment>(parentItem.comments),
            }];
          }
        }

        matrix[activityId][phaseId] = normalizedPhaseRows;
      }
    }

    return matrix;
  }

  private normalizeProjectHealth(raw: unknown): ProjectDetail['projectHealth'] {
    return this.asArray(raw).map((item) => {
      const row = this.asRecord(item) ?? {};
      return {
        healthId: this.asString(row['healthId'] ?? row['id']),
        shortName: this.asString(row['shortName']),
        longName: this.asString(row['longName']),
        description: this.asString(row['description']),
        status: this.asString(row['status'], 'active') || 'active',
        dateCreated: this.asDateString(row['dateCreated'] ?? row['createdAt']),
        dateLastUpdated: this.asDateString(row['dateLastUpdated'] ?? row['updatedAt']),
      };
    });
  }

  private normalizeProjectRisks(raw: unknown, projectId: string): ProjectRiskRef[] {
    return this.asArray(raw).map((item) => {
      const row = this.asRecord(item) ?? {};
      const longName = this.asString(row['longName'] ?? row['title']);
      return {
        projectId: this.asString(row['projectId'], projectId) || projectId,
        riskId: this.asString(row['riskId'] ?? row['id']),
        shortName: this.asString(row['shortName']),
        longName,
        title: longName,
        description: this.asString(row['description']),
        probability: this.asString(row['probability']),
        criticity: this.asString(row['criticity']),
        status: this.asString(row['status'], 'Open') || 'Open',
        dateCreated: this.asDateString(row['dateCreated'] ?? row['createdAt']),
        dateLastUpdated: this.asDateString(row['dateLastUpdated'] ?? row['updatedAt']),
        remainingRiskId: this.asString(row['remainingRiskId']),
      };
    });
  }

  private normalizeProjectTypeDefaults(docId: string, raw: unknown): ProjectTypeDefaults {
    const data = this.asRecord(raw) ?? {};
    const rawProjectType = this.asRecord(data['projectType']);
    const rawPhases = this.asArray(data['phases']);
    const rawActivities = this.asArray(data['activities']);
    const defaultsRows = this.asArray(data['activitiesDefault']).length
      ? this.asArray(data['activitiesDefault'])
      : this.asArray(data['tasks']);

    const normalizedDefaults = defaultsRows.map((item) => {
      const row = this.asRecord(item) ?? {};
      return {
        id: this.asString(row['id']),
        label: this.asString(row['label'] ?? row['id']),
        phaseId: this.asString(row['phaseId']),
        activityId: this.asString(row['activityId']),
        sequence: this.asNumberOrNull(row['sequence']),
      };
    }).filter((item) => !!item.id && !!item.phaseId && !!item.activityId);

    const normalizedPhases = rawPhases.map((item) => {
      const row = this.asRecord(item) ?? {};
      return {
        id: this.asString(row['id']),
        label: this.asString(row['label'] ?? row['id']),
        sequence: this.asNumberOrNull(row['sequence']),
      };
    }).filter((item) => !!item.id);

    if (normalizedPhases.length === 0) {
      const seen = new Set<string>();
      for (const row of normalizedDefaults) {
        if (seen.has(row.phaseId)) continue;
        seen.add(row.phaseId);
        normalizedPhases.push({
          id: row.phaseId,
          label: row.phaseId,
          sequence: normalizedPhases.length + 1,
        });
      }
    }

    const normalizedProjectTypeId = this.asString(rawProjectType?.['id'], docId) || docId;
    const fallback = getProjectTypeFallback(normalizedProjectTypeId);
    const fallbackActivities = fallback?.activities ?? [];
    const fallbackPhases = fallback?.phases ?? [];
    const fallbackDefaults = fallback?.activitiesDefault ?? [];

    const mergedPhases = normalizedPhases.length > 0 ? [...normalizedPhases] : [];
    const seenPhaseIds = new Set(mergedPhases.map((item) => item.id));
    for (const phase of fallbackPhases) {
      if (!phase.id || seenPhaseIds.has(phase.id)) continue;
      seenPhaseIds.add(phase.id);
      mergedPhases.push({
        id: phase.id,
        label: phase.label,
        sequence: phase.sequence ?? null,
      });
    }

    const normalizedActivities = rawActivities.map((item) => {
      const row = this.asRecord(item) ?? {};
      return {
        id: this.asString(row['id']),
        label: this.asString(row['label'] ?? row['id']),
        sequence: this.asNumberOrNull(row['sequence']),
      };
    }).filter((item) => !!item.id);
    const seenActivityIds = new Set(normalizedActivities.map((item) => item.id));
    for (const activity of fallbackActivities) {
      if (!activity.id || seenActivityIds.has(activity.id)) continue;
      seenActivityIds.add(activity.id);
      normalizedActivities.push({
        id: activity.id,
        label: activity.label,
        sequence: activity.sequence ?? null,
      });
    }

    const mergedDefaults = [...normalizedDefaults];
    const seenDefaultKeys = new Set(mergedDefaults.map((item) => `${item.activityId}|${item.phaseId}|${item.id}`));
    for (const row of fallbackDefaults) {
      const key = `${row.activityId}|${row.phaseId}|${row.id}`;
      if (!row.id || !row.phaseId || !row.activityId || seenDefaultKeys.has(key)) continue;
      seenDefaultKeys.add(key);
      mergedDefaults.push({
        id: row.id,
        label: row.label,
        phaseId: row.phaseId,
        activityId: row.activityId,
        sequence: row.sequence ?? null,
      });
    }

    const rawWorkflow = this.asRecord(data['workflow']);
    const fallbackWorkflow = getProjectTypeFallback(normalizedProjectTypeId)?.workflow ?? DEFAULT_WORKFLOW;
    const workflow: ProjectWorkflow = rawWorkflow
      ? this.normalizeWorkflow(rawWorkflow, fallbackWorkflow)
      : fallbackWorkflow;
    const displayInteractions = this.normalizeDisplayInteractions(data['displayInteractions']);

    return {
      projectType: {
        id: normalizedProjectTypeId,
        name: this.asString(rawProjectType?.['name'] ?? data['name'], docId) || docId,
        description: this.asString(rawProjectType?.['description'] ?? data['description']),
      },
      phases: mergedPhases.sort((left, right) => (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER)),
      activities: normalizedActivities.sort((left, right) => (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER)),
      activitiesDefault: mergedDefaults.sort((left, right) => (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER)),
      tasks: mergedDefaults.sort((left, right) => (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER)),
      workflow,
      displayInteractions,
    };
  }

  private normalizeWorkflow(raw: Record<string, unknown>, fallback: ProjectWorkflow): ProjectWorkflow {
    const rawStatuses = this.asArray(raw['statuses']);
    if (!rawStatuses.length) return fallback;

    const statuses = rawStatuses
      .map((item, idx) => {
        const row = this.asRecord(item) ?? {};
        return {
          id: this.asString(row['id']) as ProjectWorkflow['statuses'][number]['id'],
          label: this.asString(row['label']),
          sequence: this.asNumberOrNull(row['sequence']) ?? idx + 1,
        };
      })
      .filter((s) => !!s.id && !!s.label);

    return statuses.length ? { statuses } : fallback;
  }

  private normalizeDisplayInteractions(raw: unknown): ProjectSettings {
    const row = this.asRecord(raw) ?? {};
    return {
      periodPreset: this.asString(row['periodPreset'], DEFAULT_PROJECT_SETTINGS.periodPreset) as ProjectSettings['periodPreset'],
      viewMode: this.asString(row['viewMode'], DEFAULT_PROJECT_SETTINGS.viewMode) as ProjectSettings['viewMode'],
      hoverHintsEnabled: row['hoverHintsEnabled'] !== undefined ? Boolean(row['hoverHintsEnabled']) : DEFAULT_PROJECT_SETTINGS.hoverHintsEnabled,
      linkTooltipsEnabled: row['linkTooltipsEnabled'] !== undefined ? Boolean(row['linkTooltipsEnabled']) : DEFAULT_PROJECT_SETTINGS.linkTooltipsEnabled,
      defaultDependencyType: this.asString(row['defaultDependencyType'], DEFAULT_PROJECT_SETTINGS.defaultDependencyType) as ProjectSettings['defaultDependencyType'],
    };
  }

  private normalizeProjectDetail(docId: string, raw: unknown): ProjectDetail {
    const source = this.asRecord(raw) ?? {};
    const project = this.asRecord(source['payload']) ?? source;
    const { phases, phaseDefinitions } = this.normalizePhases(project);
    const activities = this.normalizeActivityDefinitions(project['activities']);
    const activityMatrix = this.normalizeActivityMatrix(project['activityMatrix'] ?? project['taskMatrix'], activities, phases);
    const projectItemsMatrix = this.normalizeProjectItemsMatrix(
      project['projectItemsMatrix'] ?? project['projectTasksMatrix'],
      activities,
      phases,
      activityMatrix,
    );

    const rawWorkflow = this.asRecord(project['workflow']);
    const workflow: ProjectWorkflow | undefined = rawWorkflow
      ? this.normalizeWorkflow(rawWorkflow, DEFAULT_WORKFLOW)
      : undefined;
    const displayInteractions = this.normalizeDisplayInteractions(project['displayInteractions']);

    return {
      ...project,
      id: this.asString(project['id'], docId) || docId,
      name: this.asString(project['name'], docId) || docId,
      description: this.asString(project['description']),
      owner: this.asString(project['owner']),
      projectManager: this.asString(project['projectManager']),
      phases,
      phaseDefinitions,
      activities,
      activityMatrix,
      taskMatrix: activityMatrix,
      projectItemsMatrix,
      projectTasksMatrix: projectItemsMatrix,
      displayInteractions,
      ...(workflow ? { workflow } : {}),
      ganttDependencies: this.asArray(project['ganttDependencies']).map((item) => {
        const row = this.asRecord(item) ?? {};
        return {
          fromId: this.asString(row['fromId']),
          toId: this.asString(row['toId']),
          type: this.asString(row['type'], 'F2S') || 'F2S',
        };
      }).filter((item) => !!item.fromId && !!item.toId),
      projectHealth: this.normalizeProjectHealth(project['projectHealth']),
      projectRisks: this.normalizeProjectRisks(project['projectRisks'], this.asString(project['id'], docId) || docId),
    } as ProjectDetail;
  }

  private sanitizeForFirestore(value: unknown): unknown {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value instanceof Date || value instanceof Timestamp) return value;
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeForFirestore(item));
    }

    const record = this.asRecord(value);
    if (record) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(record)) {
        const next = this.sanitizeForFirestore(item);
        if (next !== undefined) {
          sanitized[key] = next;
        }
      }
      return sanitized;
    }

    return value;
  }

  private buildProjectDocument(project: ProjectDetail): Record<string, unknown> {
    const normalized = this.normalizeProjectDetail(project.id, project as unknown);
    const payload = this.sanitizeForFirestore(normalized) as Record<string, unknown>;
    const source = this.asRecord(project as unknown) ?? {};
    const memberRoles = this.sanitizeForFirestore(source['memberRoles'] ?? payload['memberRoles'] ?? {}) as Record<string, unknown>;
    const memberIds = Object.keys(memberRoles ?? {}).filter((id) => this.asString(id) !== '');
    const projectTypeId = this.asString(source['projectTypeId'] ?? payload['projectTypeId']);
    const createdAt = source['createdAt'] ?? serverTimestamp();

    return {
      id: normalized.id,
      name: normalized.name,
      description: normalized.description,
      projectTypeId,
      memberIds,
      memberRoles,
      payload,
      createdAt,
      updatedAt: serverTimestamp(),
    };
  }

  private async safeGetCollectionDocs(
    pathSegments: string[],
    ...constraints: QueryConstraint[]
  ): Promise<Array<{ id: string; data: FirestoreMap }>> {
    try {
      const ref = collection(this.firestore(), pathSegments.join('/')) as CollectionReference<DocumentData>;
      const snapshot = constraints.length ? await getDocs(query(ref, ...constraints)) : await getDocs(ref);
      return snapshot.docs.map((item) => ({
        id: item.id,
        data: (this.asRecord(item.data()) ?? {}) as FirestoreMap,
      }));
    } catch (error) {
      console.error('[FirebaseProjectDataBackend] safeGetCollectionDocs failed', {
        path: pathSegments.join('/'),
        constraints: constraints.length,
        error,
      });
      return [];
    }
  }

  async listProjects(): Promise<Array<Pick<ProjectDetail, 'id' | 'name'>>> {
    await this.auth.whenReady();
    const access = await this.getCurrentUserAccess();
    if (!access.userId) {
      return [];
    }

    const isSysAdmin = access.globalRoles.some((role) => this.asString(role).toLowerCase() === 'sysadmin');

    if (isSysAdmin) {
      const docs = await this.safeGetCollectionDocs(['projects']);
      return docs
        .map((item) => {
          const payload = this.asRecord(item.data['payload']) ?? item.data;
          return {
            id: this.asString(payload['id'], item.id) || item.id,
            name: this.asString(payload['name'], item.id) || item.id,
            updatedAt: this.asDateString(item.data['updatedAt'] ?? payload['updatedAt']),
          };
        })
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map(({ id, name }) => ({ id, name }));
    }

    const projectIds = Array.from(new Set(access.projectIds)).filter((projectId) => projectId !== '');
    if (projectIds.length === 0) {
      return [];
    }

    const snapshots = await Promise.all(
      projectIds.map(async (projectId) => {
        try {
          return await getDoc(doc(this.firestore(), 'projects', projectId));
        } catch (error) {
          console.error('[FirebaseProjectDataBackend] get project failed', { projectId, error });
          return null;
        }
      }),
    );

    return snapshots
      .filter((snapshot): snapshot is NonNullable<typeof snapshot> => !!snapshot && snapshot.exists())
      .map((snapshot) => {
        const data = this.asRecord(snapshot.data()) ?? {};
        const payload = this.asRecord(data['payload']) ?? data;
        return {
          id: this.asString(payload['id'], snapshot.id) || snapshot.id,
          name: this.asString(payload['name'], snapshot.id) || snapshot.id,
          updatedAt: this.asDateString(data['updatedAt'] ?? payload['updatedAt']),
        };
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(({ id, name }) => ({ id, name }));
  }

  async listUsers(_projectId?: string | null): Promise<UserRef[]> {
    await this.auth.whenReady();
    const docs = await this.safeGetCollectionDocs(['users'], orderBy('label', 'asc'));
    if (docs.length === 0) {
      return [];
    }

    return docs
      .map((item) => ({
        id: this.asString(item.data['id'] ?? item.data['uid'], item.id) || item.id,
        label: this.asString(
          item.data['label']
            ?? item.data['displayName']
            ?? item.data['fullName']
            ?? item.data['name']
            ?? item.data['email'],
          item.id,
        ) || item.id,
        email: this.asString(item.data['email']),
      }))
      .filter((item) => !!item.id);
  }

  async listProjectTypes(): Promise<ProjectTypeRef[]> {
    await this.auth.whenReady();
    const docs = await this.safeGetCollectionDocs(['projectTypes']);
    const rows = docs.map((item) => {
      const normalized = this.normalizeProjectTypeDefaults(item.id, item.data);
      return normalized.projectType;
    });
    if (rows.length > 0) {
      return rows.sort((left, right) => this.compareByCaseInsensitive(left.name, right.name));
    }

    return PROJECT_TYPE_FALLBACKS
      .map((item) => item.projectType)
      .sort((left, right) => this.compareByCaseInsensitive(left.name, right.name));
  }

  async createProjectType(payload: CreateProjectTypePayload): Promise<ProjectTypeDefaults> {
    await this.auth.whenReady();
    const name = this.asString(payload?.name);
    if (!name) throw new Error('Missing project type name');

    const requestedId = this.asString(payload?.id);
    const id = requestedId || this.slugifyProjectTypeId(name);
    if (!id) throw new Error('Missing project type id');

    const ref = doc(this.firestore(), 'projectTypes', id);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      throw new Error(`Project type ${id} already exists`);
    }

    const description = this.asString(payload?.description);
    const baseDoc = {
      id,
      name,
      description,
      projectType: {
        id,
        name,
        description,
      },
      phases: [],
      activities: [],
      activitiesDefault: [],
      tasks: [],
      workflow: this.sanitizeForFirestore(DEFAULT_WORKFLOW),
      displayInteractions: this.sanitizeForFirestore(DEFAULT_PROJECT_SETTINGS),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, baseDoc, { merge: false });
    return this.normalizeProjectTypeDefaults(id, {
      ...baseDoc,
      workflow: DEFAULT_WORKFLOW,
      displayInteractions: DEFAULT_PROJECT_SETTINGS,
    });
  }

  async updateProjectType(projectTypeId: string, payload: UpdateProjectTypePayload): Promise<ProjectTypeDefaults> {
    await this.auth.whenReady();
    const id = this.asString(projectTypeId);
    if (!id) throw new Error('Missing project type id');

    const ref = doc(this.firestore(), 'projectTypes', id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error(`Project type ${id} not found`);
    }

    const current = this.asRecord(snapshot.data()) ?? {};
    const currentType = this.asRecord(current['projectType']) ?? {};
    const name = this.asString(payload?.name, this.asString(currentType['name'] ?? current['name'], id)) || id;
    const description = this.asString(payload?.description, this.asString(currentType['description'] ?? current['description']));

    await setDoc(ref, {
      name,
      description,
      projectType: {
        id,
        name,
        description,
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const merged = {
      ...current,
      name,
      description,
      projectType: {
        id,
        name,
        description,
      },
    };
    return this.normalizeProjectTypeDefaults(id, merged);
  }

  async deleteProjectType(projectTypeId: string): Promise<void> {
    await this.auth.whenReady();
    const id = this.asString(projectTypeId);
    if (!id) throw new Error('Missing project type id');
    await deleteDoc(doc(this.firestore(), 'projectTypes', id));
  }

  async listProjectHealthDefaults(): Promise<ProjectHealthDefaultRef[]> {
    await this.auth.whenReady();
    const docs = await this.safeGetCollectionDocs(['healthDefaults'], orderBy('shortName', 'asc'));
    const rows = docs.map((item) => ({
      healthId: this.asString(item.data['healthId'] ?? item.data['id'], item.id) || item.id,
      shortName: this.asString(item.data['shortName']),
      longName: this.asString(item.data['longName']),
      status: this.asString(item.data['status'], 'active') || 'active',
      dateCreated: this.asDateString(item.data['dateCreated'] ?? item.data['createdAt']),
      dateLastUpdated: this.asDateString(item.data['dateLastUpdated'] ?? item.data['updatedAt']),
    }));

    return rows.length > 0 ? rows : FirebaseProjectDataBackendService.DEFAULT_HEALTH_DEFAULTS;
  }

  async updateProjectHealth(projectId: string, healthShortName: string, description?: string): Promise<any[]> {
    const project = await this.getProjectOrThrow(projectId);
    const normalizedHealthShortName = this.asString(healthShortName);
    if (!normalizedHealthShortName) {
      throw new Error('Missing healthShortName');
    }

    const defaultsByShortName = await this.getHealthDefaultsMap();
    const selectedDefault = defaultsByShortName.get(normalizedHealthShortName.toLowerCase());
    if (!selectedDefault) {
      throw new Error(`Unknown health status: ${normalizedHealthShortName}`);
    }

    const now = this.nowIso();
    const existingRows: NonNullable<ProjectDetail['projectHealth']> = this.normalizeProjectHealth(project.projectHealth) ?? [];
    const selectedDescription = this.asString(description, selectedDefault.longName) || selectedDefault.longName;
    const selectedExisting = existingRows.find(
      (row) => this.asString(row.shortName).toLowerCase() === selectedDefault.shortName.toLowerCase(),
    );

    const nextRows = existingRows.map((row) => {
      const isSelected = this.asString(row.shortName).toLowerCase() === selectedDefault.shortName.toLowerCase();
      return {
        ...row,
        status: isSelected ? 'active' : 'inactive',
        longName: isSelected ? selectedDefault.longName : row.longName,
        description: isSelected ? selectedDescription : (row.description || row.longName),
        dateCreated: row.dateCreated || now,
        dateLastUpdated: now,
      };
    });

    if (!selectedExisting) {
      nextRows.push({
        healthId: this.asString(selectedDefault.healthId, this.createUuid()) || this.createUuid(),
        shortName: selectedDefault.shortName,
        longName: selectedDefault.longName,
        description: selectedDescription,
        status: 'active',
        dateCreated: now,
        dateLastUpdated: now,
      });
    }

    const healthOrder = new Map(
      Array.from(defaultsByShortName.values()).map((row, index) => [row.shortName.toLowerCase(), index]),
    );
    nextRows.sort((left, right) => {
      const leftRank = healthOrder.get(this.asString(left.shortName).toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = healthOrder.get(this.asString(right.shortName).toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return this.compareByCaseInsensitive(left.shortName, right.shortName);
    });

    await this.saveProject({
      ...project,
      projectHealth: nextRows,
    });

    return nextRows;
  }

  async createProjectRisk(projectId: string, payload: CreateProjectRiskPayload): Promise<ProjectRiskRef> {
    const project = await this.getProjectOrThrow(projectId);
    const title = this.asString(payload?.title);
    const probability = this.asString(payload?.probability);
    const criticity = this.asString(payload?.criticity);
    if (!title) throw new Error('Missing risk title');
    if (!probability) throw new Error('Missing risk probability');
    if (!criticity) throw new Error('Missing risk criticity');

    const now = this.nowIso();
    const created: ProjectRiskRef = {
      projectId: project.id,
      riskId: this.createUuid(),
      shortName: this.buildRiskShortName(title),
      longName: title,
      title,
      description: this.asString(payload?.description),
      probability,
      criticity,
      status: this.normalizeRiskStatus(this.asString(payload?.status, 'Open') || 'Open'),
      dateCreated: now,
      dateLastUpdated: now,
      remainingRiskId: this.asString(payload?.remainingRiskId),
    };

    await this.saveProject({
      ...project,
      projectRisks: [...this.normalizeProjectRisks(project.projectRisks, project.id), created],
    });

    return created;
  }

  async updateProjectRisk(projectId: string, riskId: string, payload: UpdateProjectRiskPayload): Promise<ProjectRiskRef> {
    const project = await this.getProjectOrThrow(projectId);
    const normalizedRiskId = this.asString(riskId);
    if (!normalizedRiskId) {
      throw new Error('Missing risk id');
    }

    const currentRisks = this.normalizeProjectRisks(project.projectRisks, project.id);
    const currentIndex = currentRisks.findIndex((row) => this.asString(row.riskId) === normalizedRiskId);
    if (currentIndex < 0) {
      throw new Error('Project risk not found');
    }

    const current = currentRisks[currentIndex];
    const nextLongName = this.asString(payload?.longName ?? payload?.title, current.longName) || current.longName;
    const nextProbability = this.asString(payload?.probability, current.probability) || current.probability;
    const nextCriticity = this.asString(payload?.criticity, current.criticity) || current.criticity;

    if (!nextLongName) throw new Error('Missing longName');
    if (!nextProbability) throw new Error('Missing risk probability');
    if (!nextCriticity) throw new Error('Missing risk criticity');

    const updated: ProjectRiskRef = {
      ...current,
      longName: nextLongName,
      title: nextLongName,
      shortName: this.buildRiskShortName(nextLongName),
      description: payload?.description !== undefined ? this.asString(payload.description) : current.description,
      probability: nextProbability,
      criticity: nextCriticity,
      status: payload?.status !== undefined
        ? this.normalizeRiskStatus(this.asString(payload.status, current.status) || current.status)
        : this.normalizeRiskStatus(current.status),
      remainingRiskId: payload?.remainingRiskId !== undefined
        ? this.asString(payload.remainingRiskId)
        : current.remainingRiskId,
      dateLastUpdated: this.nowIso(),
    };

    currentRisks[currentIndex] = updated;
    await this.saveProject({
      ...project,
      projectRisks: currentRisks,
    });

    return updated;
  }

  async listProjectRisks(projectId: string): Promise<ProjectRiskRef[]> {
    const direct = await getDoc(doc(this.firestore(), 'projects', projectId));
    if (direct.exists()) {
      const data = this.asRecord(direct.data()) ?? {};
      const payload = this.asRecord(data['payload']) ?? data;
      return this.normalizeProjectRisks(payload['projectRisks'], projectId);
    }
    return [];
  }

  async getProjectTypeDefaults(projectTypeId: string): Promise<ProjectTypeDefaults | null> {
    await this.auth.whenReady();
    try {
      const snapshot = await getDoc(doc(this.firestore(), 'projectTypes', projectTypeId));
      if (snapshot.exists()) {
        const raw = this.asRecord(snapshot.data()) ?? {};
        return this.normalizeProjectTypeDefaults(snapshot.id, raw);
      }
    } catch {
      // Fall through to local defaults.
    }

    return PROJECT_TYPE_FALLBACKS.find((item) => item.projectType.id === projectTypeId) ?? null;
  }

  async getProjectById(projectId: string): Promise<unknown> {
    await this.auth.whenReady();
    const snapshot = await getDoc(doc(this.firestore(), 'projects', projectId));
    if (!snapshot.exists()) {
      throw new Error(`Project ${projectId} not found in Firestore`);
    }

    return this.normalizeProjectDetail(snapshot.id, snapshot.data());
  }

  async getProjectDisplayInteractions(projectId: string): Promise<ProjectSettings> {
    const project = await this.getProjectById(projectId);
    return this.normalizeDisplayInteractions((project as ProjectDetail | null)?.displayInteractions);
  }

  async saveProjectDisplayInteractions(projectId: string, settings: ProjectSettings): Promise<ProjectSettings> {
    await this.auth.whenReady();
    const id = this.asString(projectId);
    if (!id) throw new Error('Missing projectId');

    const snapshot = await getDoc(doc(this.firestore(), 'projects', id));
    if (!snapshot.exists()) throw new Error(`Project ${id} not found`);

    const data = this.asRecord(snapshot.data()) ?? {};
    const payload = this.asRecord(data['payload']) ?? {};
    const displayInteractions = this.normalizeDisplayInteractions(settings);

    await setDoc(
      doc(this.firestore(), 'projects', id),
      { payload: { ...payload, displayInteractions }, updatedAt: serverTimestamp() },
      { merge: true }
    );

    return displayInteractions;
  }

  async saveProject(project: ProjectDetail): Promise<void> {
    await this.auth.whenReady();
    const projectId = this.asString(project?.id);
    if (!projectId) {
      throw new Error('Missing project id');
    }

    const source = this.asRecord(project as unknown) ?? {};
    const projectTypeId = this.asString(source['projectTypeId']);
    let displayInteractions = source['displayInteractions'];

    if (!this.asRecord(displayInteractions)) {
      const snapshot = await getDoc(doc(this.firestore(), 'projects', projectId));
      const existing = snapshot.exists() ? this.asRecord(snapshot.data()) : null;
      const existingPayload = this.asRecord(existing?.['payload']);
      displayInteractions = existingPayload?.['displayInteractions'];

      if (!this.asRecord(displayInteractions) && projectTypeId) {
        const defaults = await this.getProjectTypeDefaults(projectTypeId);
        displayInteractions = defaults?.displayInteractions ?? DEFAULT_PROJECT_SETTINGS;
      }
    }

    const docPayload = this.buildProjectDocument({
      ...project,
      id: projectId,
      displayInteractions: this.normalizeDisplayInteractions(displayInteractions),
    });

    await setDoc(doc(this.firestore(), 'projects', projectId), docPayload, { merge: true });
    await this.ensureCurrentUserProjectAccess(projectId, (docPayload['memberRoles'] as Record<string, unknown>) ?? {});
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.auth.whenReady();
    await deleteDoc(doc(this.firestore(), 'projects', projectId));
  }

  async runProjectProcedure(projectId: string, procedure: 'save_project', payload: { project: ProjectDetail }): Promise<void> {
    if (procedure !== 'save_project') {
      throw new Error(`Unknown procedure: ${procedure}`);
    }

    const project = payload?.project;
    if (!project) {
      throw new Error('Missing payload.project for save_project');
    }

    await this.saveProject({
      ...project,
      id: this.asString(projectId, project.id) || project.id,
    });
  }

  async listProjectMembers(projectId: string): Promise<ProjectMember[]> {
    await this.auth.whenReady();
    const id = this.asString(projectId);
    if (!id) return [];

    const snapshot = await getDoc(doc(this.firestore(), 'projects', id));
    if (!snapshot.exists()) return [];

    const data = this.asRecord(snapshot.data()) ?? {};
    const memberRoles = this.asRecord(data['memberRoles']) ?? {};

    if (Object.keys(memberRoles).length === 0) return [];

    // Fetch user labels in one pass
    const userDocs = await this.safeGetCollectionDocs(['users']);
    const userLabelMap = new Map<string, string>(
      userDocs.map((u) => [
        this.asString(u.data['id'] ?? u.data['uid'], u.id) || u.id,
        this.asString(u.data['label'] ?? u.data['displayName'] ?? u.data['fullName'] ?? u.data['name'] ?? u.data['email'], u.id) || u.id,
      ])
    );

    return Object.entries(memberRoles)
      .map(([userId, roles]): ProjectMember => ({
        userId,
        label: userLabelMap.get(userId) ?? userId,
        roles: this.asArray(roles).map((r) => this.asString(r)).filter(Boolean) as ProjectRole[],
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }

  async setProjectMembers(projectId: string, members: ProjectMember[]): Promise<void> {
    await this.auth.whenReady();
    const id = this.asString(projectId);
    if (!id) throw new Error('Missing project id');

    const memberRoles: Record<string, string[]> = {};
    for (const m of members) {
      const uid = this.asString(m.userId);
      if (!uid) continue;
      memberRoles[uid] = m.roles.filter(Boolean);
    }
    const memberIds = Object.keys(memberRoles);

    await setDoc(
      doc(this.firestore(), 'projects', id),
      { memberRoles, memberIds, updatedAt: serverTimestamp() },
      { merge: true }
    );

    // Update only the current user's projectIds index (other users' docs are not writable by us)
    await this.ensureCurrentUserProjectAccess(id, memberRoles);
  }

  async saveProjectTypeWorkflow(projectTypeId: string, workflow: ProjectWorkflow): Promise<void> {
    await this.auth.whenReady();
    const id = this.asString(projectTypeId);
    if (!id) throw new Error('Missing projectTypeId');

    const sanitized = this.sanitizeForFirestore(workflow) as Record<string, unknown>;
    await setDoc(
      doc(this.firestore(), 'projectTypes', id),
      { workflow: sanitized, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  async saveProjectWorkflow(projectId: string, workflow: ProjectWorkflow): Promise<void> {
    await this.auth.whenReady();
    const id = this.asString(projectId);
    if (!id) throw new Error('Missing projectId');

    const snapshot = await getDoc(doc(this.firestore(), 'projects', id));
    if (!snapshot.exists()) throw new Error(`Project ${id} not found`);

    const data = this.asRecord(snapshot.data()) ?? {};
    const payload = this.asRecord(data['payload']) ?? {};
    const updatedPayload = { ...payload, workflow: this.sanitizeForFirestore(workflow) };

    await setDoc(
      doc(this.firestore(), 'projects', id),
      { payload: updatedPayload, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  async getCurrentProjectId(): Promise<string | null> {
    await this.auth.whenReady();
    const userId = this.auth.user?.id;
    if (!userId) return null;
    const snap = await getDoc(doc(this.firestore(), 'users', userId));
    if (!snap.exists()) return null;
    const data = this.asRecord(snap.data()) ?? {};
    const id = this.asString(data['currentProjectId'], '');
    return id || null;
  }

  async setCurrentProjectId(projectId: string): Promise<void> {
    await this.auth.whenReady();
    const userId = this.auth.user?.id;
    if (!userId) return;
    await setDoc(
      doc(this.firestore(), 'users', userId),
      { currentProjectId: projectId },
      { merge: true }
    );
  }
}
