import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ProjectService } from '../../services/project.service'; // adapte le chemin

type PhaseId = 'Phase1' | 'Phase2' | 'Phase3' | 'Phase4' | 'Phase5' | 'Phase6';
type ActivityId = 'projet' | 'metier' | 'changement' | 'technologie';
type ActivityStatus = 'done' | 'todo' | 'inprogress' | 'notdone';

interface Project {
  id: string;
  name: string;
  description: string;    
  role: string;
  status: string;
  health: 'good' | 'warning' | 'critical';
  projectManager: string;
  sponsor: string;
  currentPhase: PhaseId;
  changePractitioner: string;
  businessVisionary: string;
  technicalExpert: string;
  activityMatrix: Record<ActivityId, Record<PhaseId, ActivityStatus>>;
}

@Component({
  selector: 'app-private-page',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbDropdownModule],
  templateUrl: './private-page.html',
  styleUrls: ['./private-page.scss']
})
export class PrivatePage {
  phases: PhaseId[] = ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'];

  activities: { id: ActivityId; label: string }[] = [
    { id: 'projet',       label: 'Gestion du projet' },
    { id: 'metier',       label: 'Gestion du métier' },
    { id: 'changement',   label: 'Gestion du changement' },
    { id: 'technologie',  label: 'Gestion de la technologie' }
  ];

myProjects: Project[] = [
  {
    id: 'proj-a',
    name: 'Projet A',
    description: 'Mise en place d’une nouvelle plateforme de suivi opérationnel.', // 👈
    role: 'Membre',
    status: 'En cours',
    health: 'warning',
    projectManager: 'Alice Dupont',
    sponsor: 'Marc Leroy',          // 👈
    currentPhase: 'Phase2',         // 👈
    changePractitioner: 'Bruno Martin',
    businessVisionary: 'Claire Leroy',
    technicalExpert: 'David Lambert',
    activityMatrix: {
  projet: {
    Phase1: 'done',
    Phase2: 'inprogress',
    Phase3: 'todo',
    Phase4: 'todo',
    Phase5: 'notdone',
    Phase6: 'notdone'
  },
  metier: {
    Phase1: 'done',
    Phase2: 'done',
    Phase3: 'inprogress',
    Phase4: 'todo',
    Phase5: 'todo',
    Phase6: 'notdone'
  },
  changement: {
    Phase1: 'todo',
    Phase2: 'todo',
    Phase3: 'inprogress',
    Phase4: 'todo',
    Phase5: 'todo',
    Phase6: 'notdone'
  },
  technologie: {
    Phase1: 'done',
    Phase2: 'done',
    Phase3: 'done',
    Phase4: 'inprogress',
    Phase5: 'todo',
    Phase6: 'todo'
  }
}

  },
  {
    id: 'proj-b',
    name: 'Projet B',
    description: 'Développement d’une application mobile pour la gestion des tâches.', // 👈
    role: 'Owner',
    status: 'Planifié',
    health: 'good',
    projectManager: 'Emma Dubois',
    sponsor: 'Sophie Laurent',      // 👈
    currentPhase: 'Phase1',         // 👈
    changePractitioner: 'François Colin',
    businessVisionary: 'Gilles Robert',
    technicalExpert: 'Hélène Simon',
    activityMatrix: {
  projet:       { Phase1: 'done', Phase2: 'done', Phase3: 'done', Phase4: 'done', Phase5: 'done', Phase6: 'done' },
  metier:       { Phase1: 'done', Phase2: 'done', Phase3: 'done', Phase4: 'done', Phase5: 'done', Phase6: 'done' },
  changement:   { Phase1: 'done', Phase2: 'done', Phase3: 'done', Phase4: 'done', Phase5: 'done', Phase6: 'done' },
  technologie:  { Phase1: 'done', Phase2: 'done', Phase3: 'done', Phase4: 'done', Phase5: 'done', Phase6: 'done' }
}

  },
  {
    id: 'proj-c',
    name: 'Projet C',
    description: 'Clôture et bilan du projet.', // 👈
    role: 'Viewer',
    status: 'Clôturé',
    health: 'critical',
    projectManager: 'Isabelle Marchal',
    sponsor: 'Patrick Denis',       // 👈
    currentPhase: 'Phase6',         // 👈
    changePractitioner: 'Julien Petit',
    businessVisionary: 'Karine Denis',
    technicalExpert: 'Laurent Moreau',
    activityMatrix: {
  projet:       { Phase1: 'todo', Phase2: 'todo', Phase3: 'todo', Phase4: 'todo', Phase5: 'todo', Phase6: 'todo' },
  metier:       { Phase1: 'todo', Phase2: 'todo', Phase3: 'todo', Phase4: 'todo', Phase5: 'todo', Phase6: 'todo' },
  changement:   { Phase1: 'todo', Phase2: 'todo', Phase3: 'todo', Phase4: 'todo', Phase5: 'todo', Phase6: 'todo' },
  technologie:  { Phase1: 'todo', Phase2: 'todo', Phase3: 'todo', Phase4: 'todo', Phase5: 'todo', Phase6: 'todo' }
}

  }
];

  selectedProject: Project | null = this.myProjects.length ? this.myProjects[0] : null;

  constructor(
    private router: Router,
    private projectService: ProjectService
  ) {}

  selectProject(project: Project): void {
    this.selectedProject = project;
  }

  getHealthLabel(health: Project['health']): string {
    switch (health) {
      case 'good':
        return 'Tout est OK';
      case 'warning':
        return 'Attention';
      case 'critical':
        return 'Alerte';
      default:
        return '';
    }
  }

  getStatusClass(status: ActivityStatus | undefined): string {
    switch (status) {
      case 'done':
        return 'status-done';
      case 'todo':
        return 'status-todo';
      case 'inprogress':
        return 'status-inprogress';
      case 'notdone':
        return 'status-notdone';
      default:
        return 'status-todo';
    }
  }

  // === Actions du menu contextuel ===

  onView(project: Project): void {
    this.selectProject(project);
    this.router.navigate(['/project', project.id]);
  }

  onEdit(project: Project): void {
    this.router.navigate(['/project', project.id, 'edit']);
  }

  onPause(project: Project): void {
    this.projectService.pauseProject({ projectId: project.id });
    project.status = 'En pause';
  }

  onArchive(project: Project): void {
    this.projectService.archiveProject({ projectId: project.id });
    project.status = 'Archivé';
  }
}
