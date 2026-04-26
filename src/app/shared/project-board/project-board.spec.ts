import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { ActivityId, PhaseId, ProjectDetail, Task } from '../../models/project.model';
import { ProjectBoard } from './project-board';

describe('ProjectBoard', () => {
  let component: ProjectBoard;
  let fixture: ComponentFixture<ProjectBoard>;
  let project: ProjectDetail;

  const renderProject = async () => {
    fixture.componentRef.setInput('project', project);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectBoard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectBoard);
    component = fixture.componentInstance;
    const emptyPhaseMatrix = (): Record<PhaseId, Task[]> => ({
      Phase1: [],
      Phase2: [],
      Phase3: [],
      Phase4: [],
      Phase5: [],
      Phase6: [],
    });
    const taskMatrix: Record<ActivityId, Record<PhaseId, Task[]>> = {
      projet: emptyPhaseMatrix(),
      metier: emptyPhaseMatrix(),
      changement: emptyPhaseMatrix(),
      technologie: emptyPhaseMatrix(),
    };
    taskMatrix.projet.Phase1 = [
      { id: 't1', label: 'Task projet', status: 'todo', phase: 'Phase1', category: 'projectManagement' },
    ];
    taskMatrix.metier.Phase1 = [
      { id: 't2', label: 'Task métier', status: 'todo', phase: 'Phase1', category: 'businessManagement' },
    ];
    taskMatrix.changement.Phase1 = [
      { id: 't3', label: 'Task changement', status: 'todo', phase: 'Phase1', category: 'changeManagement' },
    ];
    taskMatrix.technologie.Phase1 = [
      { id: 't4', label: 'Task techno', status: 'todo', phase: 'Phase1', category: 'technologyManagement' },
    ];
    project = {
      id: 'p1',
      name: 'Projet test',
      description: 'desc',
      phases: ['Phase1'],
      activities: {
        projet: { id: 'projet', label: 'Gestion du projet', owner: 'pm' },
        metier: { id: 'metier', label: 'Gestion du métier', owner: 'bm' },
        changement: { id: 'changement', label: 'Gestion du changement', owner: 'cm' },
        technologie: { id: 'technologie', label: 'Gestion de la technologie', owner: 'tm' },
      },
      taskMatrix,
    };
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the four swimlanes by default', async () => {
    await renderProject();

    const laneHeaders = fixture.nativeElement.querySelectorAll('.lane-header');
    expect(laneHeaders.length).toBe(4);
  });

  it('hides a swimlane when its category is deselected', async () => {
    await renderProject();

    component.toggleSwimlaneCategory('businessManagement');

    const laneTitles = component.visibleLanes.map((lane) => lane.label);

    expect(component.visibleLanes.length).toBe(3);
    expect(laneTitles).not.toContain('Gestion du métier');
  });

  it('focuses one swimlane in full screen mode', async () => {
    await renderProject();

    component.maximizeLane('metier');

    expect(component.focusedLaneId).toBe('metier');
    expect(component.displayedLanes.length).toBe(1);
    expect(component.displayedLanes[0]?.label).toBe('Gestion du métier');
    expect(document.body.classList.contains('project-board-fullscreen-open')).toBe(true);
  });

  it('restores the normal board view after full screen mode', async () => {
    await renderProject();

    component.maximizeLane('metier');
    component.restoreBoardView('metier');

    expect(component.focusedLaneId).toBeNull();
    expect(component.isLaneCollapsed('metier')).toBe(false);
    expect(component.displayedLanes.length).toBe(4);
    expect(document.body.classList.contains('project-board-fullscreen-open')).toBe(false);
  });
});
