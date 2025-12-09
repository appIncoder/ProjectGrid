import { TestBed } from '@angular/core/testing';

import { Project } from './project.service';

describe('Project', () => {
  let service: Project;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Project);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
