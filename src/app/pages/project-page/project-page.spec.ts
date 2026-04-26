import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { ProjectDataService } from '../../services/project-data.service';
import { ProjectService } from '../../services/project.service';
import { ProjectPage } from './project-page';

describe('ProjectPage', () => {
  let component: ProjectPage;
  let fixture: ComponentFixture<ProjectPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'p1' })),
            snapshot: { paramMap: convertToParamMap({ id: 'p1' }) },
          },
        },
        {
          provide: ProjectDataService,
          useValue: {
            getProjectById: async () => null,
            listUsers: async () => [],
            listProjectHealthDefaults: async () => [],
            runProjectProcedure: async () => undefined,
            cacheProject: () => undefined,
            updateProjectHealth: async () => [],
          },
        },
        {
          provide: ProjectService,
          useValue: {
            currentProjectId: null,
            mutations$: of(),
            registerProject: () => undefined,
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
