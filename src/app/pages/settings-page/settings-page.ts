import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormGroup } from '@angular/forms';

import type { PeriodPreset } from '../../models/params.model';
import type { DependencyType, ViewMode } from '../../models/gantt.model';
import type { ProjectDetail } from '../../models/project.model';

type ProjectSettings = {
  periodPreset: PeriodPreset;
  viewMode: ViewMode;
  hoverHintsEnabled: boolean;
  linkTooltipsEnabled: boolean;
  defaultDependencyType: DependencyType;
};

const DEFAULT_SETTINGS: ProjectSettings = {
  periodPreset: '6m',
  viewMode: 'split',
  hoverHintsEnabled: true,
  linkTooltipsEnabled: true,
  defaultDependencyType: 'F2S',
};

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings-page.html',
})
export class SettingsPage implements OnInit, OnChanges {
  @Input() project: ProjectDetail | null = null;

  form!: FormGroup; // 👈 initialisé plus tard
  savedState: 'idle' | 'saved' | 'error' = 'idle';

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      periodPreset: DEFAULT_SETTINGS.periodPreset as PeriodPreset,
      hoverHintsEnabled: DEFAULT_SETTINGS.hoverHintsEnabled,
      linkTooltipsEnabled: DEFAULT_SETTINGS.linkTooltipsEnabled,
      viewMode: DEFAULT_SETTINGS.viewMode as ViewMode,
      defaultDependencyType: DEFAULT_SETTINGS.defaultDependencyType as DependencyType,
      projectName: '',
      projectDescription: '',
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && this.form) {
      this.loadFromProject();
    }
  }

  private storageKey(projectId: string) {
    return `projectgrid:settings:${projectId}`;
  }

  private loadFromProject(): void {
    this.savedState = 'idle';

    const p = this.project;
    if (!p?.id) {
      this.form.reset({
        periodPreset: DEFAULT_SETTINGS.periodPreset,
        hoverHintsEnabled: DEFAULT_SETTINGS.hoverHintsEnabled,
        linkTooltipsEnabled: DEFAULT_SETTINGS.linkTooltipsEnabled,
        viewMode: DEFAULT_SETTINGS.viewMode,
        defaultDependencyType: DEFAULT_SETTINGS.defaultDependencyType,
        projectName: '',
        projectDescription: '',
      });
      return;
    }

    const stored = this.readSettings(p.id);

    this.form.reset({
      periodPreset: stored.periodPreset,
      hoverHintsEnabled: stored.hoverHintsEnabled,
      linkTooltipsEnabled: stored.linkTooltipsEnabled,
      viewMode: stored.viewMode,
      defaultDependencyType: stored.defaultDependencyType,
      projectName: p.name,
      projectDescription: p.description,
    });
  }

  private readSettings(projectId: string): ProjectSettings {
    try {
      const raw = localStorage.getItem(this.storageKey(projectId));
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  save(): void {
    if (!this.project?.id) {
      this.savedState = 'error';
      return;
    }

    const v = this.form.getRawValue();

    const toSave: ProjectSettings = {
      periodPreset: v.periodPreset,
      hoverHintsEnabled: v.hoverHintsEnabled,
      linkTooltipsEnabled: v.linkTooltipsEnabled,
      viewMode: v.viewMode,
      defaultDependencyType: v.defaultDependencyType,
    };

    localStorage.setItem(this.storageKey(this.project.id), JSON.stringify(toSave));
    this.savedState = 'saved';
    setTimeout(() => (this.savedState = 'idle'), 1500);
  }

  resetToDefaults(): void {
    if (this.project?.id) {
      localStorage.removeItem(this.storageKey(this.project.id));
    }
    this.loadFromProject();
  }
}
