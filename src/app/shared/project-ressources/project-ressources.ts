import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common'; 

import {
  ActivityId,
  ActivityStatus,
  GanttActivityRow,
  GanttPhaseBand,
  GanttTaskView,
  PhaseId,
  ProjectDetail,
  Task,
  TaskCategory,
  DependencyType,
  GanttDependency,
  EditableDependencyRow,
  RoadmapLinkView,
  PeriodPreset,
  HoverHint,
  LinkTooltip,
  ViewMode,
} from '../../models';

@Component({
  selector: 'app-project-ressources',
  imports: [CommonModule],
  templateUrl: './project-ressources.html',
  styleUrl: './project-ressources.scss',
})
export class ProjectRessources {
    @Input() project: ProjectDetail | null = null;
}
 