import { TestBed } from '@angular/core/testing';

import { DEFAULT_PROJECT_SETTINGS } from '../models';
import { FirebaseProjectDataBackendService } from './firebase-project-data-backend.service';
import { ProjectDataService } from './project-data.service';

describe('ProjectDataService', () => {
  let service: ProjectDataService;
  const backendStub = {
    listProjects: async () => [],
    listUsers: async () => [],
    listProjectTypes: async () => [],
    createProjectType: async () => null,
    updateProjectType: async () => null,
    deleteProjectType: async () => undefined,
    listProjectHealthDefaults: async () => [],
    updateProjectHealth: async () => [],
    createProjectRisk: async () => ({}),
    updateProjectRisk: async () => ({}),
    listProjectRisks: async () => [],
    getProjectTypeDefaults: async () => null,
    getProjectById: async () => null,
    getProjectDisplayInteractions: async () => ({ ...DEFAULT_PROJECT_SETTINGS }),
    saveProjectDisplayInteractions: async (_projectId: string, settings: unknown) => settings,
    saveProject: async () => undefined,
    deleteProject: async () => undefined,
    runProjectProcedure: async () => undefined,
    listProjectMembers: async () => [],
    setProjectMembers: async () => undefined,
    saveProjectTypeWorkflow: async () => undefined,
    saveProjectWorkflow: async () => undefined,
    getCurrentProjectId: async () => null,
    setCurrentProjectId: async () => undefined,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProjectDataService,
        { provide: FirebaseProjectDataBackendService, useValue: backendStub },
      ],
    });
    service = TestBed.inject(ProjectDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
