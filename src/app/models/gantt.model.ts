// src/app/models/gantt.model.ts

import type { ActivityId, PhaseId } from './project.model';

export type DependencyType = 'F2S' | 'F2F' | 'S2S';

export type GanttDependency = {
  fromId: string;
  toId: string;
  type?: DependencyType; // défaut = F2S
};

export type GanttPhaseBand = {
  id: string;
  label: string;
  startMonthIndex: number;
  endMonthIndex: number;
};

export type GanttActivityRow = {
  activityId: ActivityId;
  label: string;
  rowIndex: number;
  isHeader: boolean;
};

export type GanttTaskView = {
  id: string;
  label: string;
  activityId: ActivityId;
  phase: PhaseId;
  rowIndex: number;

  monthIndex: number;
  startMonthIndex: number;
  endMonthIndex: number;

  startDayIndex: number;
  endDayIndex: number;

  x: number;
  y: number;
  width: number;
  height: number;
};

export type GanttLinkView = {
  fromId: string;
  toId: string;
  path: string;
};

export type EditableDependencyRow = { 
  toId: string; 
  type: DependencyType 
};

export type ItemScheduleOverride = { startDayIndex: number; endDayIndex: number };
/** @deprecated Use ItemScheduleOverride instead */
export type TaskScheduleOverride = ItemScheduleOverride;

export type ItemConstraints = {
  startNoEarlierThan?: string; // ISO YYYY-MM-DD
  startNoLaterThan?: string;   // ISO YYYY-MM-DD
  endNoEarlierThan?: string;   // ISO YYYY-MM-DD
  endNoLaterThan?: string;     // ISO YYYY-MM-DD
};
/** @deprecated Use ItemConstraints instead */
export type TaskConstraints = ItemConstraints;

export type ScheduleNode = { id: string; start: number; end: number; duration: number };

export type RoadmapLinkView = GanttLinkView & {
  key: string;
  type: DependencyType;
};

export type ViewMode = 'split' | 'focusLeft' | 'focusRight';