import { inject, Injectable } from '@angular/core';
import type { ProjectDetail, ProjectRole, Task, TaskCategory } from '../models';
import type { AuthBackend } from './auth-backend';
import { FirebaseAuthBackendService } from './firebase-auth-backend.service';

const AUTH_STORAGE_KEY = 'pg_auth_session';
const SUPER_USER_EMAIL = 'etienne.darquennes@gmail.com';
const MANAGER_ROLE_BY_CATEGORY: Record<TaskCategory, ProjectRole> = {
  projectManagement: 'projectManager',
  businessManagement: 'businessManager',
  changeManagement: 'changeManager',
  technologyManagement: 'technologyManager',
};
const MEMBER_ROLES: ProjectRole[] = ['projectMember', 'businessMember', 'changeMember', 'technologyMember'];

export type AccessCheckMode = {
  role: ProjectRole;
  label: string;
};

type AuthSession = {
  isAuthenticated: boolean;
  user?: {
    id: string;
    username: string;
    label: string;
  };
  accessCheckMode?: AccessCheckMode | null;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isAuthenticated = false;
  private _user: AuthSession['user'] | null = null;
  private _accessCheckMode: AccessCheckMode | null = null;
  private readonly readyPromise: Promise<void>;
  private readonly backend: AuthBackend = inject(FirebaseAuthBackendService);

  constructor() {
    this.restoreFromStorage();
    this.readyPromise = this.initializeSession();
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  get user(): AuthSession['user'] | null {
    return this._user;
  }

  get isRealSysAdmin(): boolean {
    const email = String(this._user?.username ?? '').trim().toLowerCase();
    return email === SUPER_USER_EMAIL;
  }

  get isSuperUser(): boolean {
    return this.isRealSysAdmin && !this.isAccessCheckActive;
  }

  get isAccessCheckActive(): boolean {
    return this._accessCheckMode !== null;
  }

  get accessCheckMode(): AccessCheckMode | null {
    return this._accessCheckMode;
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  async login(username: string, password: string): Promise<boolean> {
    await this.readyPromise;
    const user = await this.backend.login(username, password);
    if (!user?.id) {
      this.logout();
      return false;
    }

    this._isAuthenticated = true;
    this._user = {
      id: String(user.id),
      username: String(user.username),
      label: String(user.label),
    };
    this._accessCheckMode = null;
    this.persistToStorage();
    return true;
  }

  startAccessCheckAs(role: ProjectRole, label: string): void {
    if (!this.isRealSysAdmin) return;
    this._accessCheckMode = { role, label };
    this.persistToStorage();
  }

  stopAccessCheck(): void {
    if (!this._accessCheckMode) return;
    this._accessCheckMode = null;
    this.persistToStorage();
  }

  getEffectiveProjectRoles(project?: ProjectDetail | null): ProjectRole[] {
    if (this._accessCheckMode) return [this._accessCheckMode.role];

    const userId = this._user?.id;
    if (!userId || !project?.memberRoles) return [];

    return project.memberRoles[userId] ?? [];
  }

  hasEffectiveProjectRole(project: ProjectDetail | null | undefined, roles: ProjectRole[]): boolean {
    const effectiveRoles = this.getEffectiveProjectRoles(project);
    return roles.some((role) => effectiveRoles.includes(role));
  }

  canManageActivityType(project: ProjectDetail | null | undefined, category: TaskCategory): boolean {
    if (this.isSuperUser) return true;
    return this.hasEffectiveProjectRole(project, [MANAGER_ROLE_BY_CATEGORY[category]]);
  }

  canAddProjectActivity(project: ProjectDetail | null | undefined): boolean {
    if (!project) return false;
    if (this.isAccessCheckActive) {
      return this.hasEffectiveProjectRole(project, ['projectManager']);
    }
    if (this.isSuperUser) return true;
    if (this.hasEffectiveProjectRole(project, ['projectManager'])) return true;

    const email = String(this._user?.username ?? '').trim().toLowerCase();
    const ownerEmail = String(project.owner ?? '').trim().toLowerCase();
    const projectManagerEmail = String(project.projectManager ?? '').trim().toLowerCase();
    return !!email && (email === ownerEmail || email === projectManagerEmail);
  }

  canMoveAssignedTask(project: ProjectDetail | null | undefined, task: Task | null | undefined): boolean {
    if (this.isSuperUser) return true;
    const userId = String(this._user?.id ?? '').trim();
    const responsibleId = String(task?.responsibleId ?? '').trim();
    if (!userId || !responsibleId || userId !== responsibleId) return false;
    return this.hasEffectiveProjectRole(project, MEMBER_ROLES);
  }

  canCommentAsProjectMember(project: ProjectDetail | null | undefined): boolean {
    return this.hasEffectiveProjectRole(project, MEMBER_ROLES);
  }

  private async initializeSession(): Promise<void> {
    if (!this.backend.restoreSession) return;

    try {
      const user = await this.backend.restoreSession();
      if (!user?.id) {
        this._isAuthenticated = false;
        this._user = null;
        this.clearStorage();
        return;
      }

      this._isAuthenticated = true;
      this._user = {
        id: String(user.id),
        username: String(user.username),
        label: String(user.label),
      };
      if (!this.isRealSysAdmin) {
        this._accessCheckMode = null;
      }
      this.persistToStorage();
    } catch {
      this._isAuthenticated = false;
      this._user = null;
      this._accessCheckMode = null;
      this.clearStorage();
    }
  }

  logout(): void {
    void this.backend.logout();
    this._isAuthenticated = false;
    this._user = null;
    this._accessCheckMode = null;
    this.clearStorage();
  }

  private restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AuthSession;
      if (parsed?.isAuthenticated) {
        this._isAuthenticated = true;
        this._user = parsed.user ?? null;
        this._accessCheckMode = parsed.accessCheckMode ?? null;
        if (!this.isRealSysAdmin) {
          this._accessCheckMode = null;
        }
      }
    } catch {
      this.clearStorage();
    }
  }

  private persistToStorage(): void {
    try {
      const payload: AuthSession = {
        isAuthenticated: this._isAuthenticated,
        user: this._user ?? undefined,
        accessCheckMode: this.isRealSysAdmin ? this._accessCheckMode : null,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
