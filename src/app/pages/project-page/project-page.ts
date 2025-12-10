// project-page.ts

import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import {
  ActivityDefinition,
  ActivityId,
  PhaseId,
  ProjectDetail,
  ProjectTab,
  Task,
} from '../../models/project-models';

// Composants d’onglet
import { ProjectScorecard } from '../../shared/project-score-card/project-score-card';
import { ProjectRisks } from '../../shared/project-risks/project-risks';
import { ProjectBudget } from '../../shared/project-budget/project-budget';
import { ProjectRoadmap } from '../../shared/project-roadmap/project-roadmap';

@Component({
  selector: 'app-project-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ProjectScorecard,
    ProjectRisks,
    ProjectBudget,
    ProjectRoadmap,
  ],
  templateUrl: './project-page.html',
  styleUrls: ['./project-page.scss'],
  // Styles globaux pour que les enfants les réutilisent
  encapsulation: ViewEncapsulation.None,
})
export class ProjectPage {
  project: ProjectDetail | null = null;
  activeTab: ProjectTab = 'scorecard';

  private sampleProjects: ProjectDetail[] = [
    {
      id: 'proj-a',
      name: 'Projet A – Plateforme opérationnelle',
      description:
        'Mise en place d’une nouvelle plateforme de suivi opérationnel pour les équipes métiers et IT.',
      phases: ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'],
      activities: {
        projet:      { id: 'projet',      label: 'Gestion du projet',         owner: 'Alice Dupont' },
        metier:      { id: 'metier',      label: 'Gestion du métier',         owner: 'Claire Leroy' },
        changement:  { id: 'changement',  label: 'Gestion du changement',     owner: 'Bruno Martin' },
        technologie: { id: 'technologie', label: 'Gestion de la technologie', owner: 'David Lambert' },
      },
      taskMatrix: {
        projet: {
          Phase1: [
            { id: 'p1-1', label: 'Charte projet', status: 'done' },
            { id: 'p1-2', label: 'Nomination gouvernance', status: 'done' },
          ],
          Phase2: [
            { id: 'p2-1', label: 'Plan de projet détaillé', status: 'inprogress' },
            { id: 'p2-2', label: 'Plan de communication', status: 'todo' },
          ],
          Phase3: [
            { id: 'p3-1', label: 'Suivi risques', status: 'inprogress' },
          ],
          Phase4: [
            { id: 'p4-1', label: 'Comités de pilotage', status: 'todo' },
          ],
          Phase5: [
            { id: 'p5-1', label: 'Préparation clôture', status: 'todo' },
          ],
          Phase6: [
            { id: 'p6-1', label: 'Clôture administrative', status: 'notdone' },
          ],
        },
        metier: {
          Phase1: [
            { id: 'm1-1', label: 'Clarification besoins', status: 'done' },
          ],
          Phase2: [
            { id: 'm2-1', label: 'Priorisation fonctionnalités', status: 'inprogress' },
            { id: 'm2-2', label: 'Scénarios métier', status: 'todo' },
            { id: 'm2-3', label: 'Priorisation fonctionnalités', status: 'inprogress' },
            { id: 'm2-4', label: 'Scénarios métier', status: 'todo' },
          ],
          Phase3: [
            { id: 'm3-1', label: 'Validation maquettes', status: 'inprogress' },
          ],
          Phase4: [
            { id: 'm4-1', label: 'Recette métier', status: 'todo' },
          ],
          Phase5: [
            { id: 'm5-1', label: 'Validation Go / No-Go', status: 'todo' },
          ],
          Phase6: [
            { id: 'm6-1', label: 'Retour d’expérience métier', status: 'notdone' },
          ],
        },
        changement: {
          Phase1: [
            { id: 'c1-1', label: 'Analyse des impacts', status: 'todo' },
          ],
          Phase2: [
            { id: 'c2-1', label: 'Plan de formation', status: 'todo' },
            { id: 'c2-2', label: 'Carte des parties prenantes', status: 'todo' },
          ],
          Phase3: [
            { id: 'c3-1', label: 'Sessions d’info', status: 'inprogress' },
          ],
          Phase4: [
            { id: 'c4-1', label: 'Accompagnement terrain', status: 'todo' },
          ],
          Phase5: [
            { id: 'c5-1', label: 'Mesure de l’adoption', status: 'todo' },
          ],
          Phase6: [
            { id: 'c6-1', label: 'Stabilisation', status: 'notdone' },
          ],
        },
        technologie: {
          Phase1: [
            { id: 't1-1', label: 'Architecture cible', status: 'done' },
          ],
          Phase2: [
            { id: 't2-1', label: 'Spécifications techniques', status: 'inprogress' },
            { id: 't2-2', label: 'Plan d’intégration', status: 'todo' },
          ],
          Phase3: [
            { id: 't3-1', label: 'Développement', status: 'inprogress' },
            { id: 't3-2', label: 'Tests techniques', status: 'todo' },
          ],
          Phase4: [
            { id: 't4-1', label: 'Tests de performance', status: 'todo' },
          ],
          Phase5: [
            { id: 't5-1', label: 'Déploiement', status: 'todo' },
          ],
          Phase6: [
            { id: 't6-1', label: 'Support post-déploiement', status: 'todo' },
          ],
        },
      },
    },
  ];

  constructor(private route: ActivatedRoute) {
    const projectId = this.route.snapshot.paramMap.get('id');
    this.loadProject(projectId);
  }

  private loadProject(projectId: string | null): void {
    if (!projectId) {
      this.project = this.sampleProjects[0] ?? null;
    } else {
      const found = this.sampleProjects.find((p) => p.id === projectId);
      this.project = found ?? this.sampleProjects[0] ?? null;
    }
  }

  setTab(tab: ProjectTab): void {
    this.activeTab = tab;
  }
}
