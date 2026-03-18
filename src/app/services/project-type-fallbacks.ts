import type { ProjectTypeDefaults } from './project-data.service';

function derivePhases(rows: ProjectTypeDefaults['activitiesDefault']): ProjectTypeDefaults['phases'] {
  const seen = new Set<string>();
  const phases: ProjectTypeDefaults['phases'] = [];
  for (const row of rows) {
    const phaseId = String(row.phaseId ?? '').trim();
    if (!phaseId || seen.has(phaseId)) continue;
    seen.add(phaseId);
    phases.push({
      id: phaseId,
      label: phaseId,
      sequence: phases.length + 1,
    });
  }
  return phases;
}

const PMBOK_DEFAULTS: ProjectTypeDefaults['activitiesDefault'] = [
  { id: 'pmp-101', label: 'Définir la charte projet et les objectifs', phaseId: 'Phase1', activityId: 'projet', sequence: 1 },
  { id: 'pmm-101', label: 'Recueillir les besoins métier et le périmètre', phaseId: 'Phase1', activityId: 'metier', sequence: 2 },
  { id: 'pmt-101', label: 'Évaluer l’architecture cible et les contraintes techniques', phaseId: 'Phase1', activityId: 'technologie', sequence: 3 },
  { id: 'pmc-101', label: "Évaluer la maturité changement et le contexte organisationnel", phaseId: 'Phase1', activityId: 'changement', sequence: 101 },
  { id: 'pmc-102', label: 'Identifier sponsors clés et parties prenantes impactées', phaseId: 'Phase1', activityId: 'changement', sequence: 102 },
  { id: 'pmp-201', label: 'Structurer la gouvernance et le plan de management', phaseId: 'Phase2', activityId: 'projet', sequence: 4 },
  { id: 'pmm-201', label: 'Formaliser les exigences fonctionnelles et les critères de succès', phaseId: 'Phase2', activityId: 'metier', sequence: 5 },
  { id: 'pmt-201', label: 'Définir la solution et le macro-design technique', phaseId: 'Phase2', activityId: 'technologie', sequence: 6 },
  { id: 'pmc-103', label: 'Construire la stratégie changement et le plan de sponsorisation', phaseId: 'Phase2', activityId: 'changement', sequence: 103 },
  { id: 'pmc-104', label: 'Élaborer le plan de communication orienté ADKAR (Awareness/Desire)', phaseId: 'Phase2', activityId: 'changement', sequence: 104 },
  { id: 'pmp-301', label: 'Piloter le planning détaillé, les coûts et les ressources', phaseId: 'Phase3', activityId: 'projet', sequence: 7 },
  { id: 'pmm-301', label: 'Valider les processus cibles et les cas d’usage', phaseId: 'Phase3', activityId: 'metier', sequence: 8 },
  { id: 'pmt-301', label: 'Configurer, développer et intégrer la solution', phaseId: 'Phase3', activityId: 'technologie', sequence: 9 },
  { id: 'pmc-105', label: 'Déployer le plan de coaching managers de proximité', phaseId: 'Phase3', activityId: 'changement', sequence: 105 },
  { id: 'pmc-106', label: 'Préparer et piloter le plan de formation (Knowledge/Ability)', phaseId: 'Phase3', activityId: 'changement', sequence: 106 },
  { id: 'pmp-401', label: 'Suivre les risques, arbitrages et décisions de pilotage', phaseId: 'Phase4', activityId: 'projet', sequence: 10 },
  { id: 'pmm-401', label: 'Exécuter la recette métier et sécuriser l’acceptation', phaseId: 'Phase4', activityId: 'metier', sequence: 11 },
  { id: 'pmt-401', label: 'Réaliser les tests techniques, qualité et sécurité', phaseId: 'Phase4', activityId: 'technologie', sequence: 12 },
  { id: 'pmc-107', label: "Mesurer l'adoption et traiter les résistances prioritaires", phaseId: 'Phase4', activityId: 'changement', sequence: 107 },
  { id: 'pmp-501', label: 'Préparer le go-live et coordonner les parties prenantes', phaseId: 'Phase5', activityId: 'projet', sequence: 13 },
  { id: 'pmm-501', label: 'Valider la readiness opérationnelle et le support métier', phaseId: 'Phase5', activityId: 'metier', sequence: 14 },
  { id: 'pmt-501', label: 'Déployer la solution et assurer l’hypercare technique', phaseId: 'Phase5', activityId: 'technologie', sequence: 15 },
  { id: 'pmc-108', label: 'Renforcer les comportements cibles (quick wins, reconnaissance)', phaseId: 'Phase5', activityId: 'changement', sequence: 108 },
  { id: 'pmp-601', label: 'Clôturer le projet et formaliser le retour d’expérience', phaseId: 'Phase6', activityId: 'projet', sequence: 16 },
  { id: 'pmm-601', label: 'Mesurer les bénéfices métier et transférer au run', phaseId: 'Phase6', activityId: 'metier', sequence: 17 },
  { id: 'pmt-601', label: 'Stabiliser l’exploitation et documenter la solution', phaseId: 'Phase6', activityId: 'technologie', sequence: 18 },
  { id: 'pmc-109', label: 'Réaliser le bilan ADKAR et transférer en mode BAU', phaseId: 'Phase6', activityId: 'changement', sequence: 109 },
];

const AGILE_PM_DEFAULTS: ProjectTypeDefaults['activitiesDefault'] = [
  { id: 'agc-101', label: 'Qualifier les impacts humains et la capacité de changement', phaseId: 'pre_project', activityId: 'changement', sequence: 101 },
  { id: 'agc-102', label: 'Définir la stratégie de conduite du changement et les rôles sponsor', phaseId: 'feasibility', activityId: 'changement', sequence: 102 },
  { id: 'agc-103', label: 'Construire le plan de communication et de coaching (itératif)', phaseId: 'foundations', activityId: 'changement', sequence: 103 },
  { id: 'agc-104', label: 'Animer des boucles de feedback utilisateurs et ajuster messages', phaseId: 'exploration', activityId: 'changement', sequence: 104 },
  { id: 'agc-105', label: 'Préparer contenus de formation et support au fil des incréments', phaseId: 'engineering', activityId: 'changement', sequence: 105 },
  { id: 'agc-106', label: 'Piloter le readiness go-live et le plan de gestion des résistances', phaseId: 'deployment', activityId: 'changement', sequence: 106 },
  { id: 'agc-107', label: 'Mesurer adoption durable et planifier le renforcement', phaseId: 'post_project', activityId: 'changement', sequence: 107 },
  { id: 'agp-001', label: 'Nommer Executive et Business Sponsor', phaseId: 'pre_project', activityId: 'projet', sequence: 1 },
  { id: 'agp-002', label: 'Clarifier besoin métier initial', phaseId: 'pre_project', activityId: 'metier', sequence: 2 },
  { id: 'agp-003', label: "Conduire l'étude de faisabilité", phaseId: 'feasibility', activityId: 'projet', sequence: 3 },
  { id: 'agp-004', label: 'Valider faisabilité technique de haut niveau', phaseId: 'feasibility', activityId: 'technologie', sequence: 4 },
  { id: 'agp-005', label: 'Établir Prioritised Requirements List (PRL)', phaseId: 'foundations', activityId: 'metier', sequence: 5 },
  { id: 'agp-006', label: 'Produire Foundations Summary', phaseId: 'foundations', activityId: 'projet', sequence: 6 },
  { id: 'agp-007', label: 'Construire Delivery Plan et Timeboxes', phaseId: 'foundations', activityId: 'projet', sequence: 7 },
  { id: 'agp-008', label: 'Animer ateliers de clarification des exigences', phaseId: 'exploration', activityId: 'metier', sequence: 8 },
  { id: 'agp-009', label: 'Réaliser prototypage fonctionnel', phaseId: 'exploration', activityId: 'technologie', sequence: 9 },
  { id: 'agp-010', label: 'Préparer conduite du changement incrémentale', phaseId: 'exploration', activityId: 'changement', sequence: 10 },
  { id: 'agp-011', label: 'Développer solution en timebox', phaseId: 'engineering', activityId: 'technologie', sequence: 11 },
  { id: 'agp-012', label: 'Exécuter tests techniques et qualité', phaseId: 'engineering', activityId: 'technologie', sequence: 12 },
  { id: 'agp-013', label: 'Valider fonctionnalités avec Business Ambassador', phaseId: 'engineering', activityId: 'metier', sequence: 13 },
  { id: 'agp-014', label: 'Préparer déploiement incrémental', phaseId: 'deployment', activityId: 'projet', sequence: 14 },
  { id: 'agp-015', label: 'Former utilisateurs et support', phaseId: 'deployment', activityId: 'changement', sequence: 15 },
  { id: 'agp-016', label: "Confirmer bénéfices attendus de l'incrément", phaseId: 'deployment', activityId: 'metier', sequence: 16 },
  { id: 'agp-017', label: "Mesurer bénéfices et retour d'expérience", phaseId: 'post_project', activityId: 'projet', sequence: 17 },
  { id: 'agp-018', label: 'Consolider adoption et amélioration continue', phaseId: 'post_project', activityId: 'changement', sequence: 18 },
];

const PRINCE2_DEFAULTS: ProjectTypeDefaults['activitiesDefault'] = [
  { id: 'pr2-001', label: 'Désigner Executive et Project Manager', phaseId: 'su', activityId: 'projet', sequence: 1 },
  { id: 'pr2-002', label: 'Capturer le Project Mandate', phaseId: 'su', activityId: 'projet', sequence: 2 },
  { id: 'pr2-003', label: "Assembler l'équipe de management projet", phaseId: 'su', activityId: 'projet', sequence: 3 },
  { id: 'pr2-004', label: 'Élaborer Project Initiation Documentation (PID)', phaseId: 'ip', activityId: 'projet', sequence: 4 },
  { id: 'pr2-005', label: 'Définir Business Case détaillé', phaseId: 'ip', activityId: 'metier', sequence: 5 },
  { id: 'pr2-006', label: 'Mettre en place registres (risks, issues, quality)', phaseId: 'ip', activityId: 'projet', sequence: 6 },
  { id: 'pr2-007', label: 'Soumettre stage plan au Project Board', phaseId: 'dp', activityId: 'projet', sequence: 7 },
  { id: 'pr2-008', label: 'Obtenir autorisation de démarrage de stage', phaseId: 'dp', activityId: 'projet', sequence: 8 },
  { id: 'pr2-009', label: 'Suivre avancement et écarts du stage', phaseId: 'cs', activityId: 'projet', sequence: 9 },
  { id: 'pr2-010', label: 'Gérer risques et issues du stage', phaseId: 'cs', activityId: 'projet', sequence: 10 },
  { id: 'pr2-011', label: 'Accepter work package', phaseId: 'mp', activityId: 'technologie', sequence: 11 },
  { id: 'pr2-012', label: 'Produire et vérifier produits', phaseId: 'mp', activityId: 'technologie', sequence: 12 },
  { id: 'pr2-013', label: 'Livrer produits complétés au Project Manager', phaseId: 'mp', activityId: 'metier', sequence: 13 },
  { id: 'pr2-014', label: 'Préparer End Stage Report', phaseId: 'sb', activityId: 'projet', sequence: 14 },
  { id: 'pr2-015', label: 'Préparer plan du stage suivant', phaseId: 'sb', activityId: 'projet', sequence: 15 },
  { id: 'pr2-016', label: 'Mettre à jour Business Case pour décision', phaseId: 'sb', activityId: 'metier', sequence: 16 },
  { id: 'pr2-017', label: 'Préparer End Project Report', phaseId: 'cp', activityId: 'projet', sequence: 17 },
  { id: 'pr2-018', label: 'Planifier revue post-projet et transfert en BAU', phaseId: 'cp', activityId: 'changement', sequence: 18 },
  { id: 'prc-101', label: 'Évaluer les impacts organisationnels et les parties prenantes', phaseId: 'su', activityId: 'changement', sequence: 101 },
  { id: 'prc-102', label: 'Intégrer la stratégie changement dans le PID', phaseId: 'ip', activityId: 'changement', sequence: 102 },
  { id: 'prc-103', label: "Suivre l'adoption, escalader résistances et actions correctives", phaseId: 'cs', activityId: 'changement', sequence: 103 },
  { id: 'prc-104', label: 'Accompagner les équipes de livraison sur les impacts utilisateurs', phaseId: 'mp', activityId: 'changement', sequence: 104 },
  { id: 'prc-105', label: 'Actualiser le plan changement pour le stage suivant', phaseId: 'sb', activityId: 'changement', sequence: 105 },
  { id: 'prc-106', label: "Présenter au Project Board les indicateurs d'adoption", phaseId: 'dp', activityId: 'changement', sequence: 106 },
  { id: 'prc-107', label: 'Consolider le plan de renforcement et transfert aux opérations', phaseId: 'cp', activityId: 'changement', sequence: 107 },
];

const COMMON_ACTIVITIES: ProjectTypeDefaults['activities'] = [
  { id: 'projet', label: 'Gestion du projet', sequence: 1 },
  { id: 'metier', label: 'Gestion du métier', sequence: 2 },
  { id: 'changement', label: 'Gestion du changement', sequence: 3 },
  { id: 'technologie', label: 'Gestion de la technologie', sequence: 4 },
];

export const PROJECT_TYPE_FALLBACKS: ProjectTypeDefaults[] = [
  {
    projectType: { id: '875c9b43-bf76-57e1-b35b-e296826ef9b4', name: 'PMBOK', description: '6 phases' },
    phases: derivePhases(PMBOK_DEFAULTS),
    activities: COMMON_ACTIVITIES,
    activitiesDefault: PMBOK_DEFAULTS,
    tasks: PMBOK_DEFAULTS,
  },
  {
    projectType: {
      id: '052100f2-f3ee-6be3-b16a-301b9923a6ad',
      name: 'AgilePM',
      description: 'Lifecycle AgilePM (DSDM): Pre-Project, Feasibility, Foundations, Exploration, Engineering, Deployment, Post-Project',
    },
    phases: derivePhases(AGILE_PM_DEFAULTS),
    activities: COMMON_ACTIVITIES,
    activitiesDefault: AGILE_PM_DEFAULTS,
    tasks: AGILE_PM_DEFAULTS,
  },
  {
    projectType: {
      id: '4ad0e28c-414b-8ace-2090-5acbeb0bc21c',
      name: 'Prince2',
      description: 'PRINCE2 process model: SU, IP, CS, MP, SB, DP, CP',
    },
    phases: derivePhases(PRINCE2_DEFAULTS),
    activities: COMMON_ACTIVITIES,
    activitiesDefault: PRINCE2_DEFAULTS,
    tasks: PRINCE2_DEFAULTS,
  },
];

export function getProjectTypeFallback(projectTypeId: string): ProjectTypeDefaults | null {
  const id = String(projectTypeId ?? '').trim();
  return PROJECT_TYPE_FALLBACKS.find((item) => item.projectType.id === id) ?? null;
}
