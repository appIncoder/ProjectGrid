import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectBudget } from './project-budget';

describe('ProjectBudget', () => {
  let component: ProjectBudget;
  let fixture: ComponentFixture<ProjectBudget>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectBudget]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectBudget);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
