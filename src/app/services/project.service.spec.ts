import { TestBed } from '@angular/core/testing';

import { ProjectDataService } from './project-data.service';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        {
          provide: ProjectDataService,
          useValue: {
            cacheProject: () => undefined,
            getCachedProject: () => undefined,
          },
        },
      ],
    });
    service = TestBed.inject(ProjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
