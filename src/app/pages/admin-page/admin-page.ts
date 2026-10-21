import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';
import { ProjectDataService, type ProjectTypeDefaults } from '../../services/project-data.service';
import { ProjectService } from '../../services/project.service';
import { UserAdminService, type ManagedUser } from '../../services/user-admin.service';
import type { UserLicenseStatus } from '../../models';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-page.html',
  styleUrls: ['./admin-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage implements OnInit {
  readonly superUserEmail = 'etienne.darquennes@gmail.com';
  // État alimenté par des appels asynchrones : en signaux pour que la vue se mette à jour
  // dès la réponse de Firestore (l'application tourne sans zone.js).
  readonly projectTypes = signal<AdminProjectTypeRow[]>([]);
  readonly selectedProjectTypeId = signal('');
  readonly selectedProjectType = signal<ProjectTypeDefaults | null>(null);
  readonly isLoadingProjectTypes = signal(false);
  readonly projectTypesError = signal<string | null>(null);
  readonly projectTypeActionState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly projectTypeActionError = signal<string | null>(null);

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

  // ── Utilisateurs & licences ────────────────────────────────────────────
  readonly users = signal<ManagedUser[]>([]);
  readonly isLoadingUsers = signal(false);
  readonly usersError = signal<string | null>(null);
  readonly userActionState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly userActionMessage = signal<string | null>(null);
  readonly userBusyId = signal<string | null>(null);
  readonly userSearch = signal('');

  userForm = {
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    sendPasswordResetEmail: true,
  };

  readonly auth = inject(AuthService);
  readonly projectService = inject(ProjectService);
  private readonly projectData = inject(ProjectDataService);
  private readonly userAdmin = inject(UserAdminService);

  ngOnInit(): void {
    void this.loadProjectTypes();
    void this.loadUsers();
  }

  /** Filtre au fil de la saisie sur le nom, l'adresse mail et le nom d'utilisateur (sans tenir compte des accents ni de la casse). */
  readonly filteredUsers = computed<ManagedUser[]>(() => {
    const users = this.users();
    const terms = this.normalizeSearch(this.userSearch()).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return users;
    return users.filter((user) => {
      const haystack = this.normalizeSearch(`${user.label} ${user.email} ${user.username}`);
      return terms.every((term) => haystack.includes(term));
    });
  });

  private normalizeSearch(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  readonly activeLicenseCount = computed(() =>
    this.users().filter((u) => u.licenseStatus === 'active' || u.licenseStatus === 'legacy').length);

  /** Demandes faites depuis l'écran de connexion, les plus anciennes en premier. */
  readonly pendingUsers = computed(() =>
    this.users()
      .filter((u) => u.licenseStatus === 'pending')
      .sort((a, b) => (a.requestedAt?.getTime() ?? 0) - (b.requestedAt?.getTime() ?? 0)));

  licenseLabel(user: ManagedUser): string {
    switch (user.licenseStatus) {
      case 'active': return 'Active';
      case 'legacy': return 'Active (existant)';
      case 'pending': return 'En attente';
      case 'rejected': return 'Refusée';
      case 'revoked': return 'Révoquée';
    }
  }

  async loadUsers(): Promise<void> {
    this.isLoadingUsers.set(true);
    this.usersError.set(null);
    try {
      this.users.set(await this.withTimeout(this.userAdmin.listUsers(), 15000, 'listUsers'));
    } catch (error) {
      console.error('[AdminPage] loadUsers error', error);
      this.users.set([]);
      this.usersError.set('Impossible de charger les utilisateurs.');
    } finally {
      this.isLoadingUsers.set(false);
    }
  }

  generatePassword(): void {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const bytes = crypto.getRandomValues(new Uint32Array(12));
    this.userForm.password = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  }

  async createUser(): Promise<void> {
    const { firstName, lastName, email, password } = this.userForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      this.userActionState.set('error');
      this.userActionMessage.set('Le prénom, le nom et l\'adresse mail sont obligatoires.');
      return;
    }
    if (password.length < 6) {
      this.userActionState.set('error');
      this.userActionMessage.set('Le mot de passe initial doit contenir au moins 6 caractères.');
      return;
    }

    this.userActionState.set('saving');
    this.userActionMessage.set(null);
    try {
      await this.userAdmin.createLicensedUser({ ...this.userForm });
      const createdEmail = email.trim().toLowerCase();
      const sentReset = this.userForm.sendPasswordResetEmail;
      this.userForm = { firstName: '', lastName: '', email: '', username: '', password: '', sendPasswordResetEmail: true };
      this.userActionState.set('saved');
      this.userActionMessage.set(sentReset
        ? `Utilisateur ${createdEmail} créé avec une licence active. Un e-mail de définition du mot de passe lui a été envoyé.`
        : `Utilisateur ${createdEmail} créé avec une licence active. Communiquez-lui son mot de passe initial.`);
      await this.loadUsers();
    } catch (error) {
      console.error('[AdminPage] createUser error', error);
      this.userActionState.set('error');
      this.userActionMessage.set(error instanceof Error ? error.message : "Impossible de créer l'utilisateur.");
    }
  }

  isCurrentUser(user: ManagedUser): boolean {
    return user.id === this.auth.user?.id;
  }

  async setLicense(user: ManagedUser, status: UserLicenseStatus): Promise<void> {
    if (this.isCurrentUser(user)) return;
    this.userBusyId.set(user.id);
    this.userActionMessage.set(null);
    try {
      await this.userAdmin.setLicenseStatus(user.id, status);
      this.userActionState.set('saved');
      this.userActionMessage.set(this.licenseChangeMessage(user, status));
      await this.loadUsers();
    } catch (error) {
      console.error('[AdminPage] setLicense error', error);
      this.userActionState.set('error');
      this.userActionMessage.set('Impossible de modifier la licence.');
    } finally {
      this.userBusyId.set(null);
    }
  }

  private licenseChangeMessage(user: ManagedUser, status: UserLicenseStatus): string {
    switch (status) {
      case 'active':
        return user.licenseStatus === 'pending' || user.licenseStatus === 'rejected'
          ? `Demande de ${user.label} approuvée : le compte peut désormais se connecter.`
          : `Licence activée pour ${user.label}.`;
      case 'rejected':
        return `Demande de ${user.label} refusée : le compte ne peut pas se connecter.`;
      default:
        return `Licence révoquée pour ${user.label} : il ne peut plus se connecter ni être ajouté à une équipe.`;
    }
  }

  /**
   * Les appels Firestore sans timeout peuvent rester "pending" indéfiniment
   * (ex: négociation long-polling qui échoue silencieusement) : si ça arrive
   * en plein milieu de loadProjectTypes(), le `finally` qui éteint le spinner
   * n'est jamais atteint et "Chargement des projectTypes…" reste affiché pour
   * toujours, même quand la liste elle-même a bien été récupérée. On bascule
   * donc chaque appel réseau à risque sur un timeout explicite.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Délai dépassé (${label})`)), ms);
      promise.then(
        (value) => { clearTimeout(timer); resolve(value); },
        (error) => { clearTimeout(timer); reject(error); },
      );
    });
  }

  async loadProjectTypes(selectProjectTypeId?: string): Promise<void> {
    this.isLoadingProjectTypes.set(true);
    this.projectTypesError.set(null);

    try {
      const refs = await this.withTimeout(this.projectData.listProjectTypes(), 15000, 'listProjectTypes');
      const defaultsRows = await Promise.allSettled(
        refs.map((projectType) =>
          this.withTimeout(this.projectData.getProjectTypeDefaults(projectType.id), 15000, 'getProjectTypeDefaults')
        )
      );

      this.projectTypes.set(refs
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
        .sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })));

      const nextSelectedId = selectProjectTypeId
        || this.selectedProjectTypeId()
        || this.projectTypes()[0]?.id
        || '';

      // La liste est prête : on arrête le spinner ici plutôt qu'après la
      // sélection du détail ci-dessous, pour que la liste reste utilisable
      // même si ce second appel (lui aussi protégé par timeout) est lent.
      this.isLoadingProjectTypes.set(false);

      if (nextSelectedId) {
        await this.selectProjectType(nextSelectedId);
      } else {
        this.selectedProjectTypeId.set('');
        this.selectedProjectType.set(null);
        this.resetEditForm();
      }
    } catch (error) {
      console.error('[AdminPage] loadProjectTypes error', error);
      this.projectTypes.set([]);
      this.selectedProjectTypeId.set('');
      this.selectedProjectType.set(null);
      this.resetEditForm();
      this.projectTypesError.set('Impossible de charger les projectTypes.');
    } finally {
      this.isLoadingProjectTypes.set(false);
    }
  }

  async selectProjectType(projectTypeId: string): Promise<void> {
    const id = String(projectTypeId ?? '').trim();
    this.selectedProjectTypeId.set(id);
    this.projectTypeActionError.set(null);
    this.projectTypeActionState.set('idle');

    if (!id) {
      this.selectedProjectType.set(null);
      this.resetEditForm();
      return;
    }

    try {
      this.selectedProjectType.set(await this.withTimeout(
        this.projectData.getProjectTypeDefaults(id), 15000, 'getProjectTypeDefaults'
      ));
      this.patchEditFormFromSelection();
    } catch (error) {
      console.error('[AdminPage] selectProjectType error', error);
      this.selectedProjectType.set(null);
      this.resetEditForm();
      this.projectTypeActionState.set('error');
      this.projectTypeActionError.set('Impossible de charger le détail du projectType.');
    }
  }

  async createProjectType(): Promise<void> {
    const name = this.createForm.name.trim();
    if (!name) {
      this.projectTypeActionState.set('error');
      this.projectTypeActionError.set('Le nom du projectType est obligatoire.');
      return;
    }

    this.projectTypeActionState.set('saving');
    this.projectTypeActionError.set(null);

    try {
      const created = await this.projectData.createProjectType({
        id: this.createForm.id.trim() || undefined,
        name,
        description: this.createForm.description.trim(),
      });
      this.createForm = { id: '', name: '', description: '' };
      this.projectTypeActionState.set('saved');
      await this.loadProjectTypes(created.projectType.id);
    } catch (error) {
      console.error('[AdminPage] createProjectType error', error);
      this.projectTypeActionState.set('error');
      this.projectTypeActionError.set("Impossible de créer le projectType.");
    }
  }

  async saveProjectType(): Promise<void> {
    const id = this.editForm.id.trim();
    const name = this.editForm.name.trim();
    if (!id) return;
    if (!name) {
      this.projectTypeActionState.set('error');
      this.projectTypeActionError.set('Le nom du projectType est obligatoire.');
      return;
    }

    this.projectTypeActionState.set('saving');
    this.projectTypeActionError.set(null);

    try {
      const updated = await this.projectData.updateProjectType(id, {
        name,
        description: this.editForm.description.trim(),
      });
      this.selectedProjectType.set(updated);
      this.patchEditFormFromSelection();
      this.projectTypeActionState.set('saved');
      await this.loadProjectTypes(updated.projectType.id);
    } catch (error) {
      console.error('[AdminPage] saveProjectType error', error);
      this.projectTypeActionState.set('error');
      this.projectTypeActionError.set("Impossible de sauvegarder le projectType.");
    }
  }

  async deleteProjectType(): Promise<void> {
    const id = this.editForm.id.trim();
    if (!id) return;
    if (!confirm(`Supprimer le projectType "${this.editForm.name || id}" ?`)) return;

    this.projectTypeActionState.set('saving');
    this.projectTypeActionError.set(null);

    try {
      await this.projectData.deleteProjectType(id);
      this.selectedProjectType.set(null);
      this.selectedProjectTypeId.set('');
      this.resetEditForm();
      this.projectTypeActionState.set('saved');
      await this.loadProjectTypes();
    } catch (error) {
      console.error('[AdminPage] deleteProjectType error', error);
      this.projectTypeActionState.set('error');
      this.projectTypeActionError.set("Impossible de supprimer le projectType.");
    }
  }

  private patchEditFormFromSelection(): void {
    this.editForm = {
      id: this.selectedProjectType()?.projectType.id ?? '',
      name: this.selectedProjectType()?.projectType.name ?? '',
      description: this.selectedProjectType()?.projectType.description ?? '',
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
