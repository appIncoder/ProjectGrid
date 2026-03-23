import type { ProjectDetail, ProjectMember, ProjectWorkflow, UserRef } from '../models';
import type {
  CreateProjectRiskPayload,
  ProjectHealthDefaultRef,
  ProjectRiskRef,
  ProjectTypeDefaults,
  ProjectTypeRef,
  UpdateProjectRiskPayload,
} from './project-data.service';

export interface ProjectDataBackend {
  listProjects(): Promise<Array<Pick<ProjectDetail, 'id' | 'name'>>>;
  listUsers(projectId?: string | null): Promise<UserRef[]>;
  listProjectTypes(): Promise<ProjectTypeRef[]>;
  listProjectHealthDefaults(): Promise<ProjectHealthDefaultRef[]>;
  updateProjectHealth(projectId: string, healthShortName: string, description?: string): Promise<any[]>;
  createProjectRisk(projectId: string, payload: CreateProjectRiskPayload): Promise<ProjectRiskRef>;
  updateProjectRisk(projectId: string, riskId: string, payload: UpdateProjectRiskPayload): Promise<ProjectRiskRef>;
  listProjectRisks(projectId: string): Promise<ProjectRiskRef[]>;
  getProjectTypeDefaults(projectTypeId: string): Promise<ProjectTypeDefaults | null>;
  getProjectById(projectId: string): Promise<unknown>;
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
