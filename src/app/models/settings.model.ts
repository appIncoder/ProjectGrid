import type { PeriodPreset } from './params.model';
import type { DependencyType, ViewMode } from './gantt.model';

export type ProjectSettings = {
  periodPreset: PeriodPreset;
  viewMode: ViewMode;
  hoverHintsEnabled: boolean;
  linkTooltipsEnabled: boolean;
  defaultDependencyType: DependencyType;
};
