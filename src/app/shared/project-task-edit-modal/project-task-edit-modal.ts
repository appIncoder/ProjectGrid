import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type {
  ActivityStatus,
  DependencyType,
  EditableDependencyRow,
  Item,
  ItemCategory,
  PhaseId,
  UserRef,
} from '../../models';

@Component({
  selector: 'app-project-task-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-task-edit-modal.html',
  styleUrls: ['./project-task-edit-modal.scss'],
})
export class ProjectTaskEditModal {
  @ViewChild('assignmentsQuickWrap', { static: false }) assignmentsQuickWrap?: ElementRef<HTMLElement>;

  assignPopoverField: 'reporter' | 'accountant' | 'responsible' | null = null;
  pendingAssignUserId = '';

  @Input() editError: string | null = null;
  @Input() isCreateMode = false;

  @Input() editedItemLabel = '';
  @Output() editedItemLabelChange = new EventEmitter<string>();

  @Input() editedItemStatus: ActivityStatus = 'todo';
  @Output() editedItemStatusChange = new EventEmitter<ActivityStatus>();

  @Input() editedStartDate = '';
  @Output() editedStartDateChange = new EventEmitter<string>();

  @Input() editedEndDate = '';
  @Output() editedEndDateChange = new EventEmitter<string>();

  @Input() editedCategory: ItemCategory = 'projectManagement';
  @Output() editedCategoryChange = new EventEmitter<ItemCategory>();

  @Input() editedPhase: PhaseId | null = null;
  @Output() editedPhaseChange = new EventEmitter<PhaseId | null>();

  @Input() editedReporterId = '';
  @Output() editedReporterIdChange = new EventEmitter<string>();

  @Input() editedAccountantId = '';
  @Output() editedAccountantIdChange = new EventEmitter<string>();

  @Input() editedResponsibleId = '';
  @Output() editedResponsibleIdChange = new EventEmitter<string>();

  @Input() itemStatusOptions: { value: ActivityStatus; label: string }[] = [];
  @Input() itemCategoryOptions: { value: ItemCategory; label: string }[] = [];
  @Input() dependencyTypeOptions: { value: DependencyType; label: string }[] = [];

  @Input() phases: PhaseId[] = [];
  @Input() users: UserRef[] = [];
  @Input() editedDependencies: EditableDependencyRow[] = [];
  @Input() linkableTasks: Item[] = [];
  @Input() childItems: Item[] = [];

  @Output() addDependency = new EventEmitter<void>();
  @Output() removeDependency = new EventEmitter<number>();

  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  get modalTitle(): string {
    return this.isCreateMode ? 'Ajouter une activité' : 'Modifier l activité';
  }

  get modalSubtitle(): string {
    if (this.isCreateMode) {
      return "Champs obligatoires : nom, phase, type d'activité, début, fin.";
    }
    return this.editedItemLabel || 'Activité sans titre';
  }

  openAssignPopover(field: 'reporter' | 'accountant' | 'responsible'): void {
    this.assignPopoverField = field;
    this.pendingAssignUserId = this.getAssignValue(field);
  }

  closeAssignPopover(): void {
    this.assignPopoverField = null;
    this.pendingAssignUserId = '';
  }

  applyAssignSelection(value: string): void {
    if (!this.assignPopoverField) return;
    this.pendingAssignUserId = value;
    this.setAssignValue(this.assignPopoverField, value);
    this.closeAssignPopover();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.assignPopoverField) return;
    const target = event.target as Node | null;
    const wrapEl = this.assignmentsQuickWrap?.nativeElement;
    if (!target || !wrapEl || !wrapEl.contains(target)) {
      this.closeAssignPopover();
    }
  }

  getAssignFieldLabel(field: 'reporter' | 'accountant' | 'responsible' | null): string {
    if (field === 'reporter') return 'Rapporteur';
    if (field === 'accountant') return 'Comptable';
    if (field === 'responsible') return 'Responsable';
    return '';
  }

  private getAssignValue(field: 'reporter' | 'accountant' | 'responsible'): string {
    if (field === 'reporter') return this.editedReporterId ?? '';
    if (field === 'accountant') return this.editedAccountantId ?? '';
    return this.editedResponsibleId ?? '';
  }

  private setAssignValue(field: 'reporter' | 'accountant' | 'responsible', value: string): void {
    const v = (value ?? '').trim();
    if (field === 'reporter') {
      this.editedReporterId = v;
      this.editedReporterIdChange.emit(v);
      return;
    }
    if (field === 'accountant') {
      this.editedAccountantId = v;
      this.editedAccountantIdChange.emit(v);
      return;
    }
    this.editedResponsibleId = v;
    this.editedResponsibleIdChange.emit(v);
  }

  getUserLabel(userId: string): string {
    const id = (userId ?? '').trim();
    if (!id) return 'Non défini';
    const u = this.users.find((x) => x.id === id);
    return u?.label || id;
  }

  getAssignAvatarText(field: 'reporter' | 'accountant' | 'responsible', userId: string): string {
    const label = this.getUserLabel(userId);
    if (label === 'Non défini') {
      if (field === 'reporter') return 'REP';
      if (field === 'accountant') return 'ACC';
      return 'RES';
    }
    const parts = label.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (a + b).toUpperCase() || label.slice(0, 2).toUpperCase();
  }

  getAssignTitle(field: 'reporter' | 'accountant' | 'responsible', userId: string): string {
    const value = (userId ?? '').trim();
    const role = this.getAssignFieldLabel(field);
    if (!value) return `${role} non assigné. Cliquer pour assigner.`;
    return `${role} : ${this.getUserLabel(value)}`;
  }

  getCategoryHint(value: ItemCategory): string {
    if (value === 'projectManagement') return 'Pilotage, coordination et suivi global';
    if (value === 'businessManagement') return 'Besoins, priorisation et validation métier';
    if (value === 'changeManagement') return 'Communication, adoption et accompagnement';
    return 'Architecture, build, tests et déploiement';
  }

  getStatusLabel(status: ActivityStatus): string {
    const labels: Record<ActivityStatus, string> = {
      todo:          'To Do',
      inprogress:    'In Progress',
      onhold:        'On Hold',
      done:          'Done',
      notdone:       'Not Done',
      notapplicable: 'N/A',
    };
    return labels[status] ?? status;
  }

  getDependencyTypeShort(type: DependencyType | undefined): string {
    if (type === 'F2F') return 'FF';
    if (type === 'S2S') return 'SS';
    return 'FS';
  }

  getItemLabel(itemId: string): string {
    const id = (itemId ?? '').trim();
    if (!id) return 'Activité non définie';
    const found = this.linkableTasks.find((t) => t.id === id);
    return found?.label || id;
  }
}
