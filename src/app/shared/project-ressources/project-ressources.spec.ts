import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectRessources } from './project-ressources';

describe('ProjectRessources', () => {
  let component: ProjectRessources;
  let fixture: ComponentFixture<ProjectRessources>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectRessources]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectRessources);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
