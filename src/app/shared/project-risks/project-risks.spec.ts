import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectRisks } from './project-risks';

describe('ProjectRisks', () => {
  let component: ProjectRisks;
  let fixture: ComponentFixture<ProjectRisks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectRisks]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectRisks);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
