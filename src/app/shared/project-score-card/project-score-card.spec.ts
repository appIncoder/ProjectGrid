import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ProjectService } from '../../services/project.service';
import { ProjectScorecard } from './project-score-card';

describe('ProjectScorecard', () => {
  let component: ProjectScorecard;
  let fixture: ComponentFixture<ProjectScorecard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectScorecard],
      providers: [
        { provide: ProjectService, useValue: { registerProject: () => undefined } },
        { provide: NgbModal, useValue: { open: () => undefined } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectScorecard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
