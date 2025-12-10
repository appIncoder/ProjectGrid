import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectScoreCard } from './project-score-card';

describe('ProjectScoreCard', () => {
  let component: ProjectScoreCard;
  let fixture: ComponentFixture<ProjectScoreCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectScoreCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectScoreCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
