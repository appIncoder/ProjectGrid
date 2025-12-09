import { Component, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

type PhaseId = 'Phase1' | 'Phase2' | 'Phase3' | 'Phase4' | 'Phase5' | 'Phase6';
type ActivityId = 'projet' | 'metier' | 'changement' | 'technologie';
type ActivityStatus = 'done' | 'todo' | 'inprogress' | 'notdone';

type ProjectTab = 'scorecard' | 'risks' | 'budget' | 'roadmap';

/* ----- Scorecard / tâches ----- */
interface Task {
  id: string;
  label: string;
  status: ActivityStatus;
}

interface ActivityDefinition {
  id: ActivityId;
  label: string;
  owner: string; // responsable du suivi de la thématique
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  phases: PhaseId[];
  activities: Record<ActivityId, ActivityDefinition>;
  taskMatrix: Record<ActivityId, Record<PhaseId, Task[]>>;
}

/* ----- Risques ----- */
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface RiskCellItem {
  id: string;
  label: string;
  level: RiskLevel;
}

interface TopRisk {
  id: string;
  title: string;
  impact: string;
  probability: string;
  level: RiskLevel;
  owner: string;
  dueDate: string;
}

/* ----- Budget ----- */
interface BudgetSummary {
  initial: number;
  engaged: number;
  spent: number;
  forecast: number;
  currency: string;
}

interface BudgetLine {
  id: string;
  category: string;
  initial: number;
  spent: number;
  forecast: number;
}

/* ----- Roadmap / Gantt ----- */
interface GanttActivityRow {
  activityId: ActivityId;
  label: string;
  rowIndex: number;
}

interface GanttTaskView {
  id: string;
  label: string;
  activityId: ActivityId;
  phase: PhaseId;
  rowIndex: number;
  monthIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GanttLinkView {
  fromId: string;
  toId: string;
  path: string;
}

interface GanttPhaseBand {
  id: PhaseId;
  label: string;
  startMonthIndex: number;
  endMonthIndex: number;
}

@Component({
  selector: 'app-project-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgbModalModule],
  templateUrl: './project-page.html',
  styleUrls: ['./project-page.scss'],
})
export class ProjectPage {
  project: ProjectDetail | null = null;
  activeTab: ProjectTab = 'scorecard';

  // =======================
  //   Édition de tâche (Scorecard)
  // =======================

  taskStatusOptions: { value: ActivityStatus; label: string }[] = [
    { value: 'done',       label: 'Fait (vert)' },
    { value: 'todo',       label: 'À faire (blanc)' },
    { value: 'inprogress', label: 'En cours (orange)' },
    { value: 'notdone',    label: 'Non fait (rouge)' },
  ];

  taskBeingEdited: Task | null = null;
  editedTaskStatus: ActivityStatus = 'todo';

  // =======================
  //   Données Scorecard
  // =======================

  private sampleProjects: ProjectDetail[] = [
    {
      id: 'proj-a',
      name: 'Projet A – Plateforme opérationnelle',
      description:
        'Mise en place d’une nouvelle plateforme de suivi opérationnel pour les équipes métiers et IT.',
      phases: ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'],
      activities: {
        projet:      { id: 'projet',      label: 'Gestion du projet',         owner: 'Alice Dupont' },
        metier:      { id: 'metier',      label: 'Gestion du métier',         owner: 'Claire Leroy' },
        changement:  { id: 'changement',  label: 'Gestion du changement',     owner: 'Bruno Martin' },
        technologie: { id: 'technologie', label: 'Gestion de la technologie', owner: 'David Lambert' },
      },
      taskMatrix: {
        projet: {
          Phase1: [
            { id: 'p1-1', label: 'Charte projet', status: 'done' },
            { id: 'p1-2', label: 'Nomination gouvernance', status: 'done' },
          ],
          Phase2: [
            { id: 'p2-1', label: 'Plan de projet détaillé', status: 'inprogress' },
            { id: 'p2-2', label: 'Plan de communication', status: 'todo' },
          ],
          Phase3: [
            { id: 'p3-1', label: 'Suivi risques', status: 'inprogress' },
          ],
          Phase4: [
            { id: 'p4-1', label: 'Comités de pilotage', status: 'todo' },
          ],
          Phase5: [
            { id: 'p5-1', label: 'Préparation clôture', status: 'todo' },
          ],
          Phase6: [
            { id: 'p6-1', label: 'Clôture administrative', status: 'notdone' },
          ],
        },
        metier: {
          Phase1: [
            { id: 'm1-1', label: 'Clarification besoins', status: 'done' },
          ],
          Phase2: [
            { id: 'm2-1', label: 'Priorisation fonctionnalités', status: 'inprogress' },
            { id: 'm2-2', label: 'Scénarios métier', status: 'todo' },
            { id: 'm2-3', label: 'Priorisation fonctionnalités', status: 'inprogress' },
            { id: 'm2-4', label: 'Scénarios métier', status: 'todo' },
          ],
          Phase3: [
            { id: 'm3-1', label: 'Validation maquettes', status: 'inprogress' },
          ],
          Phase4: [
            { id: 'm4-1', label: 'Recette métier', status: 'todo' },
          ],
          Phase5: [
            { id: 'm5-1', label: 'Validation Go / No-Go', status: 'todo' },
          ],
          Phase6: [
            { id: 'm6-1', label: 'Retour d’expérience métier', status: 'notdone' },
          ],
        },
        changement: {
          Phase1: [
            { id: 'c1-1', label: 'Analyse des impacts', status: 'todo' },
          ],
          Phase2: [
            { id: 'c2-1', label: 'Plan de formation', status: 'todo' },
            { id: 'c2-2', label: 'Carte des parties prenantes', status: 'todo' },
          ],
          Phase3: [
            { id: 'c3-1', label: 'Sessions d’info', status: 'inprogress' },
          ],
          Phase4: [
            { id: 'c4-1', label: 'Accompagnement terrain', status: 'todo' },
          ],
          Phase5: [
            { id: 'c5-1', label: 'Mesure de l’adoption', status: 'todo' },
          ],
          Phase6: [
            { id: 'c6-1', label: 'Stabilisation', status: 'notdone' },
          ],
        },
        technologie: {
          Phase1: [
            { id: 't1-1', label: 'Architecture cible', status: 'done' },
          ],
          Phase2: [
            { id: 't2-1', label: 'Spécifications techniques', status: 'inprogress' },
            { id: 't2-2', label: 'Plan d’intégration', status: 'todo' },
          ],
          Phase3: [
            { id: 't3-1', label: 'Développement', status: 'inprogress' },
            { id: 't3-2', label: 'Tests techniques', status: 'todo' },
          ],
          Phase4: [
            { id: 't4-1', label: 'Tests de performance', status: 'todo' },
          ],
          Phase5: [
            { id: 't5-1', label: 'Déploiement', status: 'todo' },
          ],
          Phase6: [
            { id: 't6-1', label: 'Support post-déploiement', status: 'todo' },
          ],
        },
      },
    },
  ];

  // =======================
  //   Données Risques
  // =======================

  riskImpactLevels: string[] = ['Faible', 'Modéré', 'Significatif', 'Majeur', 'Critique'];
  riskProbabilityLevels: string[] = ['Très faible', 'Faible', 'Moyenne', 'Élevée', 'Très élevée'];

  // clé = `${impact}|${prob}`
  riskMatrix: Record<string, RiskCellItem[]> = {
    'Significatif|Moyenne': [
      { id: 'R1', label: 'Disponibilité clé métier', level: 'high' },
    ],
    'Majeur|Élevée': [
      { id: 'R2', label: 'Retard de livraison IT', level: 'critical' },
      { id: 'R3', label: 'Sous-estimation charge', level: 'high' },
    ],
    'Modéré|Moyenne': [
      { id: 'R4', label: 'Turn-over équipe', level: 'medium' },
    ],
    'Critique|Faible': [
      { id: 'R5', label: 'Faille de sécurité majeure', level: 'critical' },
    ],
  };

  topRisks: TopRisk[] = [
    {
      id: 'R2',
      title: 'Retard de livraison IT critique',
      impact: 'Majeur',
      probability: 'Élevée',
      level: 'critical',
      owner: 'David Lambert',
      dueDate: '30/09/2025',
    },
    {
      id: 'R3',
      title: 'Sous-estimation des charges projet',
      impact: 'Majeur',
      probability: 'Élevée',
      level: 'high',
      owner: 'Alice Dupont',
      dueDate: '15/09/2025',
    },
    {
      id: 'R1',
      title: 'Indisponibilité d’un sponsor métier',
      impact: 'Significatif',
      probability: 'Moyenne',
      level: 'high',
      owner: 'Claire Leroy',
      dueDate: '01/09/2025',
    },
    {
      id: 'R4',
      title: 'Turn-over dans l’équipe projet',
      impact: 'Modéré',
      probability: 'Moyenne',
      level: 'medium',
      owner: 'Bruno Martin',
      dueDate: '15/10/2025',
    },
    {
      id: 'R5',
      title: 'Risque de faille de sécurité',
      impact: 'Critique',
      probability: 'Faible',
      level: 'critical',
      owner: 'Security Officer',
      dueDate: '31/12/2025',
    },
  ];

  // Drag & drop risque en cours
  draggedRisk: { item: RiskCellItem; fromImpact: string; fromProbability: string } | null = null;

  // =======================
  //   Données Budget
  // =======================

  budgetSummary: BudgetSummary = {
    initial: 250000,
    engaged: 160000,
    spent: 120000,
    forecast: 240000,
    currency: '€',
  };

  budgetLines: BudgetLine[] = [
    { id: 'B1', category: 'Ressources internes', initial: 80000, spent: 50000, forecast: 75000 },
    { id: 'B2', category: 'Consultance externe', initial: 90000, spent: 60000, forecast: 88000 },
    { id: 'B3', category: 'Licences & outils', initial: 50000, spent: 30000, forecast: 48000 },
    { id: 'B4', category: 'Formation & change', initial: 30000, spent: 10000, forecast: 19000 },
  ];

  // =======================
  //   Roadmap / Gantt
  // =======================

  readonly ganttMonthsCount = 6;

  readonly ganttColWidth = 140;
  readonly ganttRowHeight = 32;
  readonly ganttLeftOffset = 150;
  readonly ganttTopOffset = 70;

  ganttMonths: string[] = [];
  ganttPhaseBands: GanttPhaseBand[] = [];
  ganttMilestones: { label: string; monthIndex: number }[] = [];

  ganttActivityRows: GanttActivityRow[] = [];
  ganttTasksView: GanttTaskView[] = [];
  ganttLinksView: GanttLinkView[] = [];
  svgWidth = 0;
  svgHeight = 0;

  // mapping Phase -> mois (par défaut le "début" de la phase)
  phaseToMonthIndex: Record<PhaseId, number> = {
    Phase1: 0,
    Phase2: 1,
    Phase3: 2,
    Phase4: 3,
    Phase5: 4,
    Phase6: 5,
  };

  // dépendances entre tâches (exemple)
  ganttDependencies: { fromId: string; toId: string }[] = [
    { fromId: 'p1-1', toId: 'p2-1' },
    { fromId: 'p2-1', toId: 'p3-1' },
    { fromId: 'm2-1', toId: 'm3-1' },
    { fromId: 't2-1', toId: 't3-1' },
  ];

  // drag & drop Gantt
  draggingTask: GanttTaskView | null = null;
  dragStartClientX = 0;
  dragStartTaskX = 0;

  constructor(
    private route: ActivatedRoute,
    private modalService: NgbModal
  ) {
    const projectId = this.route.snapshot.paramMap.get('id');
    this.loadProject(projectId);
  }

  // =======================
  //   Scorecard helpers
  // =======================

  private loadProject(projectId: string | null): void {
    if (!projectId) {
      this.project = this.sampleProjects[0] ?? null;
    } else {
      const found = this.sampleProjects.find((p) => p.id === projectId);
      this.project = found ?? this.sampleProjects[0] ?? null;
    }

    if (this.project) {
      this.buildGanttCalendar();
      this.buildRoadmap();
    }
  }

  getActivities(): ActivityDefinition[] {
    if (!this.project) return [];
    return Object.values(this.project.activities);
  }

  getPhases(): PhaseId[] {
    return this.project?.phases ?? [];
  }

  getTasks(activityId: ActivityId, phase: PhaseId): Task[] {
    if (!this.project) return [];
    return this.project.taskMatrix[activityId]?.[phase] ?? [];
  }

  getStatusClass(status: ActivityStatus): string {
    switch (status) {
      case 'done':
        return 'status-done';
      case 'todo':
        return 'status-todo';
      case 'inprogress':
        return 'status-inprogress';
      case 'notdone':
        return 'status-notdone';
      default:
        return 'status-todo';
    }
  }

  getPhaseLabel(phase: PhaseId): string {
    return phase;
  }

  // =======================
  //   Onglets
  // =======================

  setTab(tab: ProjectTab): void {
    this.activeTab = tab;
  }

  // =======================
  //   Popup d’édition de tâche
  // =======================

  openTaskStatusModal(content: TemplateRef<any>, task: Task): void {
    this.taskBeingEdited = task;
    this.editedTaskStatus = task.status;
    this.modalService.open(content, { size: 'sm', centered: true });
  }

  saveTaskStatus(modal: any): void {
    if (this.taskBeingEdited) {
      this.taskBeingEdited.status = this.editedTaskStatus;
    }
    modal.close();
  }

  // =======================
  //   Risques
  // =======================

  private makeRiskKey(impact: string, probability: string): string {
    return `${impact}|${probability}`;
  }

  getRiskCellItems(impact: string, probability: string): RiskCellItem[] {
    return this.riskMatrix[this.makeRiskKey(impact, probability)] ?? [];
  }

  getRiskLevelClass(level: RiskLevel): string {
    switch (level) {
      case 'low':
        return 'risk-low';
      case 'medium':
        return 'risk-medium';
      case 'high':
        return 'risk-high';
      case 'critical':
        return 'risk-critical';
    }
  }

  onRiskDragStart(event: DragEvent, item: RiskCellItem, impact: string, probability: string): void {
    this.draggedRisk = { item, fromImpact: impact, fromProbability: probability };
    event.dataTransfer?.setData('text/plain', item.id);
  }

  onRiskDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onRiskDrop(event: DragEvent, targetImpact: string, targetProbability: string): void {
    event.preventDefault();
    if (!this.draggedRisk) return;

    const fromKey = this.makeRiskKey(this.draggedRisk.fromImpact, this.draggedRisk.fromProbability);
    const toKey = this.makeRiskKey(targetImpact, targetProbability);

    const fromList = this.riskMatrix[fromKey] ?? [];
    this.riskMatrix[fromKey] = fromList.filter(r => r.id !== this.draggedRisk!.item.id);

    const toList = this.riskMatrix[toKey] ?? [];
    this.riskMatrix[toKey] = [...toList, this.draggedRisk.item];

    this.draggedRisk = null;
  }

  // =======================
  //   Budget
  // =======================

  getPercent(value: number, base: number): number {
    if (!base) return 0;
    return Math.round((value / base) * 100);
  }

  // =======================
  //   Roadmap / Gantt
  // =======================

  private buildGanttCalendar(): void {
    const now = new Date();
    this.ganttMonths = [];

    for (let i = 0; i < this.ganttMonthsCount; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      this.ganttMonths.push(
        d.toLocaleString('fr-BE', { month: 'short' }) // janv., févr., ...
      );
    }

    // Phases qui peuvent chevaucher plusieurs mois
    this.ganttPhaseBands = [
      { id: 'Phase1', label: 'Phase 1', startMonthIndex: 0, endMonthIndex: 0 },
      { id: 'Phase2', label: 'Phase 2', startMonthIndex: 1, endMonthIndex: 1 },
      { id: 'Phase3', label: 'Phase 3', startMonthIndex: 2, endMonthIndex: 3 },
      { id: 'Phase4', label: 'Phase 4', startMonthIndex: 3, endMonthIndex: 4 },
      { id: 'Phase5', label: 'Phase 5', startMonthIndex: 4, endMonthIndex: 4 },
      { id: 'Phase6', label: 'Phase 6', startMonthIndex: 5, endMonthIndex: 5 },
    ];

    // Jalons "fake"
    this.ganttMilestones = [
      { label: 'Kick-off', monthIndex: 0 },
      { label: 'Pilote',   monthIndex: 2 },
      { label: 'Go live',  monthIndex: 4 },
    ];
  }

  private buildRoadmap(): void {
    if (!this.project) {
      this.ganttActivityRows = [];
      this.ganttTasksView = [];
      this.ganttLinksView = [];
      return;
    }

    const flatTasks: {
      task: Task;
      activityId: ActivityId;
      activityLabel: string;
      phase: PhaseId;
    }[] = [];

    const activities = this.getActivities();

    for (const activity of activities) {
      for (const phase of this.project.phases) {
        const tasks = this.getTasks(activity.id, phase);
        for (const task of tasks) {
          flatTasks.push({
            task,
            activityId: activity.id,
            activityLabel: activity.label,
            phase,
          });
        }
      }
    }

    // une ligne par tâche (lisible)
    this.ganttActivityRows = flatTasks.map((t, index) => ({
      activityId: t.activityId,
      label: t.activityLabel,
      rowIndex: index,
    }));

    this.ganttTasksView = flatTasks.map((t, index) => {
      const monthIndex = this.phaseToMonthIndex[t.phase] ?? 0;
      const x = this.ganttLeftOffset + monthIndex * this.ganttColWidth + 10;
      const y = this.ganttTopOffset + index * this.ganttRowHeight + 6;
      const width = this.ganttColWidth - 20;
      const height = this.ganttRowHeight - 12;

      return {
        id: t.task.id,
        label: t.task.label,
        activityId: t.activityId,
        phase: t.phase,
        rowIndex: index,
        monthIndex,
        x,
        y,
        width,
        height,
      };
    });

    this.svgWidth = this.ganttLeftOffset + this.ganttMonthsCount * this.ganttColWidth + 40;
    this.svgHeight = this.ganttTopOffset + this.ganttActivityRows.length * this.ganttRowHeight + 40;

    this.updateGanttLinks();
  }

  private updateGanttLinks(): void {
    const links: GanttLinkView[] = [];

    for (const dep of this.ganttDependencies) {
      const from = this.ganttTasksView.find(t => t.id === dep.fromId);
      const to = this.ganttTasksView.find(t => t.id === dep.toId);
      if (!from || !to) continue;

      const startX = from.x + from.width;
      const startY = from.y + from.height / 2;
      const endX = to.x;
      const endY = to.y + to.height / 2;
      const midX = startX + 15;

      const path = `M ${startX} ${startY}
                    L ${midX} ${startY}
                    L ${midX} ${endY}
                    L ${endX} ${endY}`;

      links.push({
        fromId: dep.fromId,
        toId: dep.toId,
        path,
      });
    }

    this.ganttLinksView = links;
  }

  // ---- drag & drop des barres Gantt ----

  onGanttBarMouseDown(event: MouseEvent, task: GanttTaskView): void {
    this.draggingTask = task;
    this.dragStartClientX = event.clientX;
    this.dragStartTaskX = task.x;
    event.stopPropagation();
    event.preventDefault();
  }

  onGanttMouseMove(event: MouseEvent): void {
    if (!this.draggingTask) return;
    const dx = event.clientX - this.dragStartClientX;
    this.draggingTask.x = this.dragStartTaskX + dx;
  }

  onGanttMouseUp(event: MouseEvent): void {
    if (!this.draggingTask) return;

    // snap sur le mois le plus proche
    const centerX = this.draggingTask.x + this.draggingTask.width / 2;
    let monthIndex = Math.round((centerX - this.ganttLeftOffset) / this.ganttColWidth);
    monthIndex = Math.max(0, Math.min(this.ganttMonthsCount - 1, monthIndex));

    this.draggingTask.monthIndex = monthIndex;
    this.draggingTask.x = this.ganttLeftOffset + monthIndex * this.ganttColWidth + 10;

    this.updateGanttLinks();
    this.draggingTask = null;
  }
}
