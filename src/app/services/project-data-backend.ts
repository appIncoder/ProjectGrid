import type { ProjectDetail, ProjectMember, ProjectSettings, ProjectWorkflow, UserRef } from '../models';
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

export interface ProjectDataBackend {
  listProjects(): Promise<Array<Pick<ProjectDetail, 'id' | 'name'>>>;
  listUsers(projectId?: string | null): Promise<UserRef[]>;
  listProjectTypes(): Promise<ProjectTypeRef[]>;
  createProjectType(payload: CreateProjectTypePayload): Promise<ProjectTypeDefaults>;
  updateProjectType(projectTypeId: string, payload: UpdateProjectTypePayload): Promise<ProjectTypeDefaults>;
  deleteProjectType(projectTypeId: string): Promise<void>;
  listProjectHealthDefaults(): Promise<ProjectHealthDefaultRef[]>;
  updateProjectHealth(projectId: string, healthShortName: string, description?: string): Promise<any[]>;
  createProjectRisk(projectId: string, payload: CreateProjectRiskPayload): Promise<ProjectRiskRef>;
  updateProjectRisk(projectId: string, riskId: string, payload: UpdateProjectRiskPayload): Promise<ProjectRiskRef>;
  listProjectRisks(projectId: string): Promise<ProjectRiskRef[]>;
  getProjectTypeDefaults(projectTypeId: string): Promise<ProjectTypeDefaults | null>;
  getProjectById(projectId: string): Promise<unknown>;
  getProjectDisplayInteractions(projectId: string): Promise<ProjectSettings>;
  saveProjectDisplayInteractions(projectId: string, settings: ProjectSettings): Promise<ProjectSettings>;
  saveProject(project: ProjectDetail): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  runProjectProcedure(projectId: string, procedure: 'save_project', payload: { project: ProjectDetail }): Promise<void>;
  listProjectMembers(projectId: string): Promise<ProjectMember[]>;
  setProjectMembers(projectId: string, members: ProjectMember[]): Promise<void>;
  saveProjectTypeWorkflow(projectTypeId: string, workflow: ProjectWorkflow): Promise<void>;
  saveProjectWorkflow(projectId: string, workflow: ProjectWorkflow): Promise<void>;
  getCurrentProjectId(): Promise<string | null>;
  setCurrentProjectId(projectId: string): Promise<void>;
}
