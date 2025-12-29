import { TestBed } from '@angular/core/testing';

import { ProjectData } from './project-data';

describe('ProjectData', () => {
  let service: ProjectData;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectData);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
