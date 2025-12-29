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
