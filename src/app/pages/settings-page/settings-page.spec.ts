import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';

import { DEFAULT_PROJECT_SETTINGS } from '../../models';
import { ProjectDataService } from '../../services/project-data.service';
import { ProjectService } from '../../services/project.service';
import { SettingsPage } from './settings-page';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: () => Promise.resolve(true),
          },
        },
        {
          provide: ProjectDataService,
          useValue: {
            listProjects: async () => [],
            getProjectById: async () => null,
            getProjectDisplayInteractions: async () => ({ ...DEFAULT_PROJECT_SETTINGS }),
            saveProjectDisplayInteractions: async (_projectId: string, settings: unknown) => settings,
            listProjectMembers: async () => [],
            listUsers: async () => [],
          },
        },
        {
          provide: ProjectService,
          useValue: {
            currentProjectId: null,
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
