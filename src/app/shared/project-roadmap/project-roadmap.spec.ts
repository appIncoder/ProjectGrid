import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectRoadmap } from './project-roadmap';

describe('ProjectRoadmap', () => {
  let component: ProjectRoadmap;
  let fixture: ComponentFixture<ProjectRoadmap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectRoadmap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectRoadmap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
