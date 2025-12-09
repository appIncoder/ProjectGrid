import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterModule } from '@angular/router';

type Health = 'good' | 'warning' | 'critical';
type ProjectStatus = 'Planifié' | 'En cours' | 'En pause' | 'Clôturé';

interface ProjectListItem {
  id: string;
  name: string;
  owner: string;
  role: string;
  status: ProjectStatus;
  health: Health;
  currentPhase: string;
}

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgbDropdownModule],
  templateUrl: './projects-page.html',
  styleUrls: ['./projects-page.scss'],
})
export class ProjectsPage {
  searchTerm = '';
  statusFilter: ProjectStatus | 'Tous' = 'Tous';
  healthFilter: Health | 'Tous' = 'Tous';
  statuses: (ProjectStatus | 'Tous')[] = ['Tous', 'Planifié', 'En cours', 'En pause', 'Clôturé'];
  healthOptions: (Health | 'Tous')[] = ['Tous', 'good', 'warning', 'critical'];

  projects: ProjectListItem[] = [
    {
      id: 'proj-a',
      name: 'Projet A – Plateforme opérationnelle',
      owner: 'Alice Dupont',
      role: 'Membre',
      status: 'En cours',
      health: 'warning',
      currentPhase: 'Phase 2',
    },
    {
      id: 'proj-b',
      name: 'Projet B – Refonte onboarding',
      owner: 'Emma Dubois',
      role: 'Owner',
      status: 'Planifié',
      health: 'good',
      currentPhase: 'Phase 1',
    },
    {
      id: 'proj-c',
      name: 'Projet C – Modernisation IT',
      owner: 'Isabelle Marchal',
      role: 'Viewer',
      status: 'Clôturé',
      health: 'critical',
      currentPhase: 'Phase 6',
    },
  ];

  constructor(private router: Router) {}

  get filteredProjects(): ProjectListItem[] {
    return this.projects.filter((p) => {
      const matchesSearch =
        !this.searchTerm ||
        p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.owner.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus =
        this.statusFilter === 'Tous' || p.status === this.statusFilter;

      const matchesHealth =
        this.healthFilter === 'Tous' || p.health === this.healthFilter;

      return matchesSearch && matchesStatus && matchesHealth;
    });
  }

  getHealthLabel(health: Health): string {
    switch (health) {
      case 'good':
        return 'Tout est OK';
      case 'warning':
        return 'Attention';
      case 'critical':
        return 'Alerte';
    }
  }

  // Actions
  // 🔹 Création projet (à adapter plus tard)
  onCreateProject(): void {
    // ex : page de création
    this.router.navigate(['/project', 'new']);
  }

  // 🔹 Ouvrir la page détail du projet
  onOpen(project: ProjectListItem): void {
    alert('en cours de développement...');
    this.router.navigate(['/project', project.id]);
  }

  onEdit(project: ProjectListItem): void {
    this.router.navigate(['/project', project.id, 'edit']);
  }

  onPause(project: ProjectListItem): void {
    project.status = 'En pause';
  }

  onArchive(project: ProjectListItem): void {
    project.status = 'Clôturé';
  }
}
