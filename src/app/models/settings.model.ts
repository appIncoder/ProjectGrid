import type { PeriodPreset } from './params.model';
import type { DependencyType, ViewMode } from './gantt.model';

export type ProjectSettings = {
  periodPreset: PeriodPreset;
  viewMode: ViewMode;
  hoverHintsEnabled: boolean;
  linkTooltipsEnabled: boolean;
  defaultDependencyType: DependencyType;
};

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  periodPreset: '6m',
  viewMode: 'split',
  hoverHintsEnabled: true,
  linkTooltipsEnabled: true,
  defaultDependencyType: 'F2S',
};
