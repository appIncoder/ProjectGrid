import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';
import { ProjectDataService, type ProjectTypeDefaults } from '../../services/project-data.service';
import { ProjectService } from '../../services/project.service';

type AdminProjectTypeRow = {
  id: string;
  name: string;
  description: string;
  phasesCount: number;
  activitiesCount: number;
  defaultsCount: number;
};

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-page.html',
  styleUrls: ['./admin-page.scss'],
})
export class AdminPage implements OnInit {
  readonly superUserEmail = 'etienne.darquennes@gmail.com';
  projectTypes: AdminProjectTypeRow[] = [];
  selectedProjectTypeId = '';
  selectedProjectType: ProjectTypeDefaults | null = null;
  isLoadingProjectTypes = false;
  projectTypesError: string | null = null;
  projectTypeActionState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  projectTypeActionError: string | null = null;

  createForm = {
    id: '',
    name: '',
    description: '',
  };

  editForm = {
    id: '',
    name: '',
    description: '',
  };

  constructor(
    public auth: AuthService,
    public projectService: ProjectService,
    private projectData: ProjectDataService,
  ) {}

  ngOnInit(): void {
    void this.loadProjectTypes();
  }

  async loadProjectTypes(selectProjectTypeId?: string): Promise<void> {
    this.isLoadingProjectTypes = true;
    this.projectTypesError = null;

    try {
      const refs = await this.projectData.listProjectTypes();
      const defaultsRows = await Promise.allSettled(
        refs.map(async (projectType) => this.projectData.getProjectTypeDefaults(projectType.id))
      );

      this.projectTypes = refs
        .map((projectType, index) => {
          const row = defaultsRows[index];
          if (row?.status === 'fulfilled' && row.value) {
            return {
              id: row.value.projectType.id,
              name: row.value.projectType.name,
              description: row.value.projectType.description ?? '',
              phasesCount: row.value.phases.length,
              activitiesCount: row.value.activities.length,
              defaultsCount: row.value.activitiesDefault.length,
            };
          }

          return {
            id: projectType.id,
            name: projectType.name,
            description: projectType.description ?? '',
            phasesCount: 0,
            activitiesCount: 0,
            defaultsCount: 0,
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' }));

      const nextSelectedId = selectProjectTypeId
        || this.selectedProjectTypeId
        || this.projectTypes[0]?.id
        || '';

      if (nextSelectedId) {
        await this.selectProjectType(nextSelectedId);
      } else {
        this.selectedProjectTypeId = '';
        this.selectedProjectType = null;
        this.resetEditForm();
      }
    } catch (error) {
      console.error('[AdminPage] loadProjectTypes error', error);
      this.projectTypes = [];
      this.selectedProjectTypeId = '';
      this.selectedProjectType = null;
      this.resetEditForm();
      this.projectTypesError = 'Impossible de charger les projectTypes.';
    } finally {
      this.isLoadingProjectTypes = false;
    }
  }

  async selectProjectType(projectTypeId: string): Promise<void> {
    const id = String(projectTypeId ?? '').trim();
    this.selectedProjectTypeId = id;
    this.projectTypeActionError = null;
    this.projectTypeActionState = 'idle';

    if (!id) {
      this.selectedProjectType = null;
      this.resetEditForm();
      return;
    }

    try {
      this.selectedProjectType = await this.projectData.getProjectTypeDefaults(id);
      this.patchEditFormFromSelection();
    } catch (error) {
      console.error('[AdminPage] selectProjectType error', error);
      this.selectedProjectType = null;
      this.resetEditForm();
      this.projectTypeActionState = 'error';
      this.projectTypeActionError = 'Impossible de charger le détail du projectType.';
    }
  }

  async createProjectType(): Promise<void> {
    const name = this.createForm.name.trim();
    if (!name) {
      this.projectTypeActionState = 'error';
      this.projectTypeActionError = 'Le nom du projectType est obligatoire.';
      return;
    }

    this.projectTypeActionState = 'saving';
    this.projectTypeActionError = null;

    try {
      const created = await this.projectData.createProjectType({
        id: this.createForm.id.trim() || undefined,
        name,
        description: this.createForm.description.trim(),
      });
      this.createForm = { id: '', name: '', description: '' };
      this.projectTypeActionState = 'saved';
      await this.loadProjectTypes(created.projectType.id);
    } catch (error) {
      console.error('[AdminPage] createProjectType error', error);
      this.projectTypeActionState = 'error';
      this.projectTypeActionError = "Impossible de créer le projectType.";
    }
  }

  async saveProjectType(): Promise<void> {
    const id = this.editForm.id.trim();
    const name = this.editForm.name.trim();
    if (!id) return;
    if (!name) {
      this.projectTypeActionState = 'error';
      this.projectTypeActionError = 'Le nom du projectType est obligatoire.';
      return;
    }

    this.projectTypeActionState = 'saving';
    this.projectTypeActionError = null;

    try {
      const updated = await this.projectData.updateProjectType(id, {
        name,
        description: this.editForm.description.trim(),
      });
      this.selectedProjectType = updated;
      this.patchEditFormFromSelection();
      this.projectTypeActionState = 'saved';
      await this.loadProjectTypes(updated.projectType.id);
    } catch (error) {
      console.error('[AdminPage] saveProjectType error', error);
      this.projectTypeActionState = 'error';
      this.projectTypeActionError = "Impossible de sauvegarder le projectType.";
    }
  }

  async deleteProjectType(): Promise<void> {
    const id = this.editForm.id.trim();
    if (!id) return;
    if (!confirm(`Supprimer le projectType "${this.editForm.name || id}" ?`)) return;

    this.projectTypeActionState = 'saving';
    this.projectTypeActionError = null;

    try {
      await this.projectData.deleteProjectType(id);
      this.selectedProjectType = null;
      this.selectedProjectTypeId = '';
      this.resetEditForm();
      this.projectTypeActionState = 'saved';
      await this.loadProjectTypes();
    } catch (error) {
      console.error('[AdminPage] deleteProjectType error', error);
      this.projectTypeActionState = 'error';
      this.projectTypeActionError = "Impossible de supprimer le projectType.";
    }
  }

  private patchEditFormFromSelection(): void {
    this.editForm = {
      id: this.selectedProjectType?.projectType.id ?? '',
      name: this.selectedProjectType?.projectType.name ?? '',
      description: this.selectedProjectType?.projectType.description ?? '',
    };
  }

  private resetEditForm(): void {
    this.editForm = {
      id: '',
      name: '',
      description: '',
    };
  }
}
