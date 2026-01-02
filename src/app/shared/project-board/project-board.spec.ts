import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectBoard } from './project-board';

describe('ProjectBoard', () => {
  let component: ProjectBoard;
  let fixture: ComponentFixture<ProjectBoard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectBoard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectBoard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
