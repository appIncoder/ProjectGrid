-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost
-- Généré le : mer. 18 fév. 2026 à 14:28
-- Version du serveur : 10.11.15-MariaDB-deb12
-- Version de PHP : 8.2.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `carec1650622_5ucp3q`
--

-- --------------------------------------------------------

--
-- Structure de la table `projects`
--

CREATE TABLE IF NOT EXISTS `projects` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` varchar(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `projects`
--

INSERT IGNORE INTO `projects` (`id`, `name`, `description`, `payload`, `updated_at`, `created_at`, `status`) VALUES
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Projet A – Plateforme opérationnelle', 'Mise en place d’une nouvelle plateforme de suivi opérationnel pour les équipes métiers et IT.', '{\r\n   \"id\":\"6c4a8c7c-95ca-4b5d-8667-7e8242f73596\",\r\n   \"name\":\"Projet A – Plateforme opérationnelle\",\r\n   \"description\":\"Mise en place d’une nouvelle plateforme de suivi opérationnel pour les équipes métiers et IT.\",\r\n   \"phases\":[\r\n      \"Phase1\",\r\n      \"Phase2\",\r\n      \"Phase3\",\r\n      \"Phase4\",\r\n      \"Phase5\",\r\n      \"Phase6\"\r\n   ],\r\n   \"activities\":{\r\n      \"projet\":{\r\n         \"id\":\"projet\",\r\n         \"label\":\"Gestion du projet\",\r\n         \"owner\":\"Alice Dupont\"\r\n      },\r\n      \"metier\":{\r\n         \"id\":\"metier\",\r\n         \"label\":\"Gestion du métier\",\r\n         \"owner\":\"Claire Leroy\"\r\n      },\r\n      \"changement\":{\r\n         \"id\":\"changement\",\r\n         \"label\":\"Gestion du changement\",\r\n         \"owner\":\"Bruno Martin\"\r\n      },\r\n      \"technologie\":{\r\n         \"id\":\"technologie\",\r\n         \"label\":\"Gestion de la technologie\",\r\n         \"owner\":\"David Lambert\"\r\n      }\r\n   },\r\n   \"taskMatrix\":{\r\n      \"projet\":{\r\n         \"Phase1\":[\r\n            {\r\n               \"id\":\"p1-1\",\r\n               \"label\":\"Charte projet\",\r\n               \"status\":\"done\"\r\n            },\r\n            {\r\n               \"id\":\"p1-2\",\r\n               \"label\":\"Nomination gouvernance\",\r\n               \"status\":\"done\"\r\n            }\r\n         ],\r\n         \"Phase2\":[\r\n            {\r\n               \"id\":\"p2-1\",\r\n               \"label\":\"Plan de projet détaillé\",\r\n               \"status\":\"inprogress\"\r\n            },\r\n            {\r\n               \"id\":\"p2-2\",\r\n               \"label\":\"Plan de communication\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase3\":[\r\n            {\r\n               \"id\":\"p3-1\",\r\n               \"label\":\"Suivi risques\",\r\n               \"status\":\"inprogress\"\r\n            }\r\n         ],\r\n         \"Phase4\":[\r\n            {\r\n               \"id\":\"p4-1\",\r\n               \"label\":\"Comités de pilotage\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase5\":[\r\n            {\r\n               \"id\":\"p5-1\",\r\n               \"label\":\"Préparation clôture\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase6\":[\r\n            {\r\n               \"id\":\"p6-1\",\r\n               \"label\":\"Clôture administrative\",\r\n               \"status\":\"notdone\"\r\n            }\r\n         ]\r\n      },\r\n      \"metier\":{\r\n         \"Phase1\":[\r\n            {\r\n               \"id\":\"m1-1\",\r\n               \"label\":\"Clarification besoins\",\r\n               \"status\":\"done\"\r\n            }\r\n         ],\r\n         \"Phase2\":[\r\n            {\r\n               \"id\":\"m2-1\",\r\n               \"label\":\"Priorisation fonctionnalités\",\r\n               \"status\":\"inprogress\"\r\n            },\r\n            {\r\n               \"id\":\"m2-2\",\r\n               \"label\":\"Scénarios métier\",\r\n               \"status\":\"todo\"\r\n            },\r\n            {\r\n               \"id\":\"m2-3\",\r\n               \"label\":\"Priorisation fonctionnalités\",\r\n               \"status\":\"inprogress\"\r\n            },\r\n            {\r\n               \"id\":\"m2-4\",\r\n               \"label\":\"Scénarios métier\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase3\":[\r\n            {\r\n               \"id\":\"m3-1\",\r\n               \"label\":\"Validation maquettes\",\r\n               \"status\":\"inprogress\"\r\n            }\r\n         ],\r\n         \"Phase4\":[\r\n            {\r\n               \"id\":\"m4-1\",\r\n               \"label\":\"Recette métier\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase5\":[\r\n            {\r\n               \"id\":\"m5-1\",\r\n               \"label\":\"Validation Go / No-Go\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase6\":[\r\n            {\r\n               \"id\":\"m6-1\",\r\n               \"label\":\"Retour d’expérience métier\",\r\n               \"status\":\"notdone\"\r\n            }\r\n         ]\r\n      },\r\n      \"changement\":{\r\n         \"Phase1\":[\r\n            {\r\n               \"id\":\"c1-1\",\r\n               \"label\":\"Analyse des impacts\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase2\":[\r\n            {\r\n               \"id\":\"c2-1\",\r\n               \"label\":\"Plan de formation\",\r\n               \"status\":\"todo\"\r\n            },\r\n            {\r\n               \"id\":\"c2-2\",\r\n               \"label\":\"Carte des parties prenantes\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase3\":[\r\n            {\r\n               \"id\":\"c3-1\",\r\n               \"label\":\"Sessions d’info\",\r\n               \"status\":\"inprogress\"\r\n            }\r\n         ],\r\n         \"Phase4\":[\r\n            {\r\n               \"id\":\"c4-1\",\r\n               \"label\":\"Accompagnement terrain\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase5\":[\r\n            {\r\n               \"id\":\"c5-1\",\r\n               \"label\":\"Mesure de l’adoption\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase6\":[\r\n            {\r\n               \"id\":\"c6-1\",\r\n               \"label\":\"Stabilisation\",\r\n               \"status\":\"notdone\"\r\n            }\r\n         ]\r\n      },\r\n      \"technologie\":{\r\n         \"Phase1\":[\r\n            {\r\n               \"id\":\"t1-1\",\r\n               \"label\":\"Architecture cible\",\r\n               \"status\":\"done\"\r\n            }\r\n         ],\r\n         \"Phase2\":[\r\n            {\r\n               \"id\":\"t2-1\",\r\n               \"label\":\"Spécifications techniques\",\r\n               \"status\":\"inprogress\"\r\n            },\r\n            {\r\n               \"id\":\"t2-2\",\r\n               \"label\":\"Plan d’intégration\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase3\":[\r\n            {\r\n               \"id\":\"t3-1\",\r\n               \"label\":\"Développement\",\r\n               \"status\":\"inprogress\"\r\n            },\r\n            {\r\n               \"id\":\"t3-2\",\r\n               \"label\":\"Tests techniques\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase4\":[\r\n            {\r\n               \"id\":\"t4-1\",\r\n               \"label\":\"Tests de performance\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase5\":[\r\n            {\r\n               \"id\":\"t5-1\",\r\n               \"label\":\"Déploiement\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase6\":[\r\n            {\r\n               \"id\":\"t6-1\",\r\n               \"label\":\"Support post-déploiement\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ]\r\n      }\r\n   }\r\n}', '2026-02-11 19:36:22', '2026-01-04 02:50:16', '');

-- --------------------------------------------------------

--
-- Structure de la table `roles`
--

CREATE TABLE IF NOT EXISTS `roles` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` varchar(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `username` varchar(120) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `full_name` varchar(180) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `users_roles_projects`
--

CREATE TABLE IF NOT EXISTS `users_roles_projects` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `user_id` uuid NOT NULL,
  `role_id` uuid NOT NULL,
  `project_id` uuid NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` varchar(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `project_task_assignments`
--

CREATE TABLE IF NOT EXISTS `project_task_assignments` (
  `project_id` uuid NOT NULL,
  `activity_id` varchar(64) NOT NULL,
  `phase_id` varchar(32) NOT NULL,
  `task_id` varchar(128) NOT NULL,
  `reporter_id` uuid DEFAULT NULL,
  `accountant_id` uuid DEFAULT NULL,
  `responsible_id` uuid DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`project_id`,`activity_id`,`phase_id`,`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_phases`
--

CREATE TABLE IF NOT EXISTS `project_phases` (
  `project_id` uuid NOT NULL,
  `phase_id` varchar(32) NOT NULL,
  `phase_order` int NOT NULL,
  PRIMARY KEY (`project_id`,`phase_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_activities`
--

CREATE TABLE IF NOT EXISTS `project_activities` (
  `project_id` uuid NOT NULL,
  `activity_id` varchar(64) NOT NULL,
  `label` varchar(255) NOT NULL,
  `owner_name` varchar(180) DEFAULT NULL,
  PRIMARY KEY (`project_id`,`activity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_tasks`
--

CREATE TABLE IF NOT EXISTS `project_tasks` (
  `project_id` uuid NOT NULL,
  `activity_id` varchar(64) NOT NULL,
  `phase_id` varchar(32) NOT NULL,
  `task_id` varchar(128) NOT NULL,
  `label` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL,
  PRIMARY KEY (`project_id`,`activity_id`,`phase_id`,`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_type` (paramètres)
--

CREATE TABLE IF NOT EXISTS `project_type` (
  `uuid` uuid NOT NULL DEFAULT uuid(),
  `name` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `activities` (paramètres)
--

CREATE TABLE IF NOT EXISTS `activities` (
  `uuid` uuid NOT NULL DEFAULT uuid(),
  `sequence` int NOT NULL,
  `short_name` varchar(64) NOT NULL,
  `long_name` varchar(255) NOT NULL,
  `id_project_type` uuid NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `phases` (paramètres)
--

CREATE TABLE IF NOT EXISTS `phases` (
  `uuid` uuid NOT NULL DEFAULT uuid(),
  `sequence` int NOT NULL,
  `short_name` varchar(64) NOT NULL,
  `long_name` varchar(255) NOT NULL,
  `id_project_type` uuid NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `risks`
--

CREATE TABLE IF NOT EXISTS `risks` (
  `uuid` uuid NOT NULL DEFAULT uuid(),
  `name` varchar(180) NOT NULL,
  `description` text DEFAULT NULL,
  `probability` varchar(32) NOT NULL,
  `criticity` varchar(32) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_risks`
--

CREATE TABLE IF NOT EXISTS `project_risks` (
  `projectId` uuid NOT NULL,
  `riskId` uuid NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` varchar(16) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`projectId`, `riskId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_changes` (historique des modifications)
--

CREATE TABLE IF NOT EXISTS `project_changes` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `project_id` uuid NOT NULL,
  `change_type` varchar(64) NOT NULL,
  `source` varchar(64) NOT NULL,
  `payload` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_project_changes_project_created` (`project_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `projects`
--
ALTER TABLE `projects`
  ADD COLUMN IF NOT EXISTS `description` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `payload` longtext DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `status` varchar(64) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS `idx_projects_name` ON `projects` (`name`);

--
-- Index pour la table `roles`
--
ALTER TABLE `roles`
  ADD COLUMN IF NOT EXISTS `name` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `status` varchar(64) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS `idx_roles_name` ON `roles` (`name`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `username` varchar(120) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `password_hash` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `full_name` varchar(180) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `email` varchar(190) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `is_active` tinyint(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp();
CREATE INDEX IF NOT EXISTS `idx_users_username` ON `users` (`username`);
CREATE INDEX IF NOT EXISTS `idx_users_full_name` ON `users` (`full_name`);
CREATE INDEX IF NOT EXISTS `idx_users_email` ON `users` (`email`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_users_username` ON `users` (`username`);

--
-- Index pour la table `users_roles_projects`
--
ALTER TABLE `users_roles_projects`
  ADD COLUMN IF NOT EXISTS `user_id` uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `role_id` uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `project_id` uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `status` varchar(64) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS `idx_urp_user` ON `users_roles_projects` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_urp_role` ON `users_roles_projects` (`role_id`);
CREATE INDEX IF NOT EXISTS `idx_urp_project` ON `users_roles_projects` (`project_id`);

-- Nettoyage des doublons avant contrainte d'unicité (même user/role/project)
SET @has_dedup_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND COLUMN_NAME = '__dedup_row'
);
SET @sql := IF(@has_dedup_col = 0,
  'ALTER TABLE `users_roles_projects` ADD COLUMN `__dedup_row` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

DELETE t1 FROM `users_roles_projects` t1
JOIN `users_roles_projects` t2
  ON t1.`user_id` <=> t2.`user_id`
 AND t1.`role_id` <=> t2.`role_id`
 AND t1.`project_id` <=> t2.`project_id`
 AND t1.`__dedup_row` > t2.`__dedup_row`;

SET @has_dedup_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND COLUMN_NAME = '__dedup_row'
);
SET @sql := IF(@has_dedup_col > 0,
  'ALTER TABLE `users_roles_projects` DROP COLUMN `__dedup_row`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE UNIQUE INDEX IF NOT EXISTS `uidx_urp_user_role_project` ON `users_roles_projects` (`user_id`, `role_id`, `project_id`);

--
-- Index pour la table `project_task_assignments`
--
ALTER TABLE `project_task_assignments`
  ADD COLUMN IF NOT EXISTS `reporter_id` uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `accountant_id` uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `responsible_id` uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp();
CREATE INDEX IF NOT EXISTS `idx_pta_reporter` ON `project_task_assignments` (`reporter_id`);
CREATE INDEX IF NOT EXISTS `idx_pta_accountant` ON `project_task_assignments` (`accountant_id`);
CREATE INDEX IF NOT EXISTS `idx_pta_responsible` ON `project_task_assignments` (`responsible_id`);
CREATE INDEX IF NOT EXISTS `idx_project_phases_order` ON `project_phases` (`project_id`,`phase_order`);
CREATE INDEX IF NOT EXISTS `idx_project_activities_owner` ON `project_activities` (`owner_name`);
CREATE INDEX IF NOT EXISTS `idx_project_tasks_status` ON `project_tasks` (`status`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_project_type_name` ON `project_type` (`name`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_activities_type_short` ON `activities` (`id_project_type`, `short_name`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_phases_type_short` ON `phases` (`id_project_type`, `short_name`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_risks_name` ON `risks` (`name`);
CREATE INDEX IF NOT EXISTS `idx_risks_name` ON `risks` (`name`);
CREATE INDEX IF NOT EXISTS `idx_risks_probability` ON `risks` (`probability`);
CREATE INDEX IF NOT EXISTS `idx_project_risks_status` ON `project_risks` (`status`);
CREATE INDEX IF NOT EXISTS `idx_project_risks_risk` ON `project_risks` (`riskId`);
CREATE INDEX IF NOT EXISTS `idx_project_changes_project_created` ON `project_changes` (`project_id`, `created_at`);

-- Correction précoce de FK legacy: fk_pta_project peut pointer vers `projects_`
-- et faire échouer les INSERT de project_task_assignments.
SET @fk_pta_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_task_assignments'
    AND CONSTRAINT_NAME = 'fk_pta_project'
);
SET @fk_pta_ref_table := (
  SELECT kcu.REFERENCED_TABLE_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'project_task_assignments'
    AND kcu.CONSTRAINT_NAME = 'fk_pta_project'
  LIMIT 1
);
SET @sql := IF(@fk_pta_exists > 0 AND @fk_pta_ref_table <> 'projects',
  'ALTER TABLE `project_task_assignments` DROP FOREIGN KEY `fk_pta_project`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @fk_pta_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_task_assignments'
    AND CONSTRAINT_NAME = 'fk_pta_project'
);
SET @sql := IF(@fk_pta_exists = 0,
  'ALTER TABLE `project_task_assignments` ADD CONSTRAINT `fk_pta_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

--
-- Données d'exemple supplémentaires (tolérant aux schémas legacy)
--

-- Purge complète des enregistrements avant réinjection des données de référence
-- (évite toute redondance lors des ré-exécutions du script)
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `project_task_assignments`;
DELETE FROM `project_tasks`;
DELETE FROM `project_activities`;
DELETE FROM `project_phases`;
DELETE FROM `users_roles_projects`;
DELETE FROM `project_risks`;
DELETE FROM `project_changes`;
DELETE FROM `risks`;
DELETE FROM `phases`;
DELETE FROM `activities`;
DELETE FROM `project_type`;
DELETE FROM `users`;
DELETE FROM `roles`;
DELETE FROM `projects`;
SET FOREIGN_KEY_CHECKS = 1;

-- Réinjection explicite du projet de référence (requis avant tasks/assignments/risks)
INSERT INTO `projects` (`id`, `name`, `description`, `payload`, `status`)
VALUES (
  '6c4a8c7c-95ca-4b5d-8667-7e8242f73596',
  'Projet A – Plateforme opérationnelle',
  'Mise en place d’une nouvelle plateforme de suivi opérationnel pour les équipes métiers et IT.',
  '{}',
  'active'
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`);

INSERT IGNORE INTO `project_type` (`name`, `description`, `date_created`)
VALUES ('PMBOK', '6 phases', NOW());

SET @id_project_type_pmbok := (
  SELECT `uuid`
  FROM `project_type`
  WHERE `name` = 'PMBOK'
  ORDER BY `date_created` ASC
  LIMIT 1
);

INSERT IGNORE INTO `activities` (`sequence`, `short_name`, `long_name`, `id_project_type`, `date_created`) VALUES
(1, 'projet', 'Gestion du projet', @id_project_type_pmbok, NOW()),
(2, 'metier', 'Gestion du métier', @id_project_type_pmbok, NOW()),
(3, 'changement', 'Gestion du changement', @id_project_type_pmbok, NOW()),
(4, 'technologie', 'Gestion de la technologie', @id_project_type_pmbok, NOW());

INSERT IGNORE INTO `phases` (`sequence`, `short_name`, `long_name`, `id_project_type`, `date_created`) VALUES
(1, 'Phase1', 'Phase 1', @id_project_type_pmbok, NOW()),
(2, 'Phase2', 'Phase 2', @id_project_type_pmbok, NOW()),
(3, 'Phase3', 'Phase 3', @id_project_type_pmbok, NOW()),
(4, 'Phase4', 'Phase 4', @id_project_type_pmbok, NOW()),
(5, 'Phase5', 'Phase 5', @id_project_type_pmbok, NOW()),
(6, 'Phase6', 'Phase 6', @id_project_type_pmbok, NOW());

INSERT IGNORE INTO `risks` (`uuid`, `name`, `description`, `probability`, `criticity`, `date_created`) VALUES
('10000000-0000-0000-0000-000000000001', 'Indisponibilité d''un sponsor métier', 'Disponibilité clé métier', 'Moyenne', 'high', NOW()),
('10000000-0000-0000-0000-000000000002', 'Retard de livraison IT critique', 'Retard de livraison IT', 'Élevée', 'critical', NOW()),
('10000000-0000-0000-0000-000000000003', 'Sous-estimation des charges projet', 'Sous-estimation charge', 'Élevée', 'high', NOW()),
('10000000-0000-0000-0000-000000000004', 'Turn-over dans l''équipe projet', 'Turn-over équipe', 'Moyenne', 'medium', NOW()),
('10000000-0000-0000-0000-000000000005', 'Risque de faille de sécurité', 'Faille de sécurité majeure', 'Faible', 'critical', NOW());

INSERT IGNORE INTO `project_risks` (`projectId`, `riskId`, `date_created`, `status`) VALUES
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', '10000000-0000-0000-0000-000000000001', NOW(), 'active'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', '10000000-0000-0000-0000-000000000002', NOW(), 'active'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', '10000000-0000-0000-0000-000000000003', NOW(), 'active'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', '10000000-0000-0000-0000-000000000004', NOW(), 'active'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', '10000000-0000-0000-0000-000000000005', NOW(), 'active');

-- Lien automatique du projet existant avec tous les risks existants
INSERT IGNORE INTO `project_risks` (`projectId`, `riskId`, `date_created`, `status`)
SELECT
  p.`id` AS `projectId`,
  r.`uuid` AS `riskId`,
  NOW() AS `date_created`,
  'active' AS `status`
FROM `projects` p
JOIN `risks` r
WHERE p.`id` = '6c4a8c7c-95ca-4b5d-8667-7e8242f73596';

SET @roles_pk_seed_col := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'id') > 0,
  'id',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'role_id') > 0,
    'role_id',
    NULL
  )
);
SET @users_pk_seed_col := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id') > 0,
  'id',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'user_id') > 0,
    'user_id',
    NULL
  )
);

SET @sql := IF(@roles_pk_seed_col IS NULL,
  'INSERT IGNORE INTO `roles` (`name`, `status`) VALUES (''Administrateur'', ''active''), (''Chef de projet'', ''active''), (''Contributeur'', ''active'')',
  CONCAT(
    'INSERT IGNORE INTO `roles` (`', @roles_pk_seed_col, '`, `name`, `status`) VALUES ',
    '(''11111111-1111-1111-1111-111111111111'', ''Administrateur'', ''active''), ',
    '(''22222222-2222-2222-2222-222222222222'', ''Chef de projet'', ''active''), ',
    '(''33333333-3333-3333-3333-333333333333'', ''Contributeur'', ''active'')'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@users_pk_seed_col IS NULL,
  'INSERT IGNORE INTO `users` (`username`, `password_hash`, `full_name`, `email`, `is_active`) VALUES (''alice.dupont'', ''0192023a7bbd73250516f069df18b500'', ''Alice Dupont'', ''alice.dupont@example.org'', 1), (''bruno.martin'', ''0192023a7bbd73250516f069df18b500'', ''Bruno Martin'', ''bruno.martin@example.org'', 1), (''claire.leroy'', ''0192023a7bbd73250516f069df18b500'', ''Claire Leroy'', ''claire.leroy@example.org'', 1), (''david.lambert'', ''0192023a7bbd73250516f069df18b500'', ''David Lambert'', ''david.lambert@example.org'', 1)',
  CONCAT(
    'INSERT IGNORE INTO `users` (`', @users_pk_seed_col, '`, `username`, `password_hash`, `full_name`, `email`, `is_active`) VALUES ',
    '(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'', ''alice.dupont'', ''0192023a7bbd73250516f069df18b500'', ''Alice Dupont'', ''alice.dupont@example.org'', 1), ',
    '(''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'', ''bruno.martin'', ''0192023a7bbd73250516f069df18b500'', ''Bruno Martin'', ''bruno.martin@example.org'', 1), ',
    '(''cccccccc-cccc-cccc-cccc-cccccccccccc'', ''claire.leroy'', ''0192023a7bbd73250516f069df18b500'', ''Claire Leroy'', ''claire.leroy@example.org'', 1), ',
    '(''dddddddd-dddd-dddd-dddd-dddddddddddd'', ''david.lambert'', ''0192023a7bbd73250516f069df18b500'', ''David Lambert'', ''david.lambert@example.org'', 1)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @urp_pk_seed_col := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND COLUMN_NAME = 'id') > 0,
  'id',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND COLUMN_NAME = 'user_role_project_id') > 0,
    'user_role_project_id',
    NULL
  )
);
SET @sql := IF(@urp_pk_seed_col IS NULL,
  'INSERT IGNORE INTO `users_roles_projects` (`user_id`, `role_id`, `project_id`, `status`) VALUES (''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'', ''22222222-2222-2222-2222-222222222222'', ''6c4a8c7c-95ca-4b5d-8667-7e8242f73596'', ''active''), (''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'', ''33333333-3333-3333-3333-333333333333'', ''6c4a8c7c-95ca-4b5d-8667-7e8242f73596'', ''active''), (''cccccccc-cccc-cccc-cccc-cccccccccccc'', ''33333333-3333-3333-3333-333333333333'', ''6c4a8c7c-95ca-4b5d-8667-7e8242f73596'', ''active'')',
  CONCAT(
    'INSERT IGNORE INTO `users_roles_projects` (`', @urp_pk_seed_col, '`, `user_id`, `role_id`, `project_id`, `status`) VALUES ',
    '(''90000000-0000-0000-0000-000000000001'', ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'', ''22222222-2222-2222-2222-222222222222'', ''6c4a8c7c-95ca-4b5d-8667-7e8242f73596'', ''active''), ',
    '(''90000000-0000-0000-0000-000000000002'', ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'', ''33333333-3333-3333-3333-333333333333'', ''6c4a8c7c-95ca-4b5d-8667-7e8242f73596'', ''active''), ',
    '(''90000000-0000-0000-0000-000000000003'', ''cccccccc-cccc-cccc-cccc-cccccccccccc'', ''33333333-3333-3333-3333-333333333333'', ''6c4a8c7c-95ca-4b5d-8667-7e8242f73596'', ''active'')'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO `project_phases` (`project_id`, `phase_id`, `phase_order`) VALUES
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Phase1', 1),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Phase2', 2),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Phase3', 3),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Phase4', 4),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Phase5', 5),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Phase6', 6);

INSERT IGNORE INTO `project_activities` (`project_id`, `activity_id`, `label`, `owner_name`) VALUES
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'projet', 'Gestion du projet', 'Alice Dupont'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'metier', 'Gestion du métier', 'Claire Leroy'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'changement', 'Gestion du changement', 'Bruno Martin'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'technologie', 'Gestion de la technologie', 'David Lambert');

INSERT INTO `project_tasks` (`project_id`, `activity_id`, `phase_id`, `task_id`, `label`, `status`) VALUES
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'projet', 'Phase1', 'p1-1', 'Charte projet', 'done'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'projet', 'Phase1', 'p1-2', 'Nomination gouvernance', 'done'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'projet', 'Phase2', 'p2-1', 'Plan de projet détaillé', 'inprogress'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'projet', 'Phase2', 'p2-2', 'Plan de communication', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'projet', 'Phase3', 'p3-1', 'Suivi risques', 'inprogress'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'projet', 'Phase4', 'p4-1', 'Comités de pilotage', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'projet', 'Phase5', 'p5-1', 'Préparation clôture', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'projet', 'Phase6', 'p6-1', 'Clôture administrative', 'notdone'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'metier', 'Phase1', 'm1-1', 'Clarification besoins', 'done'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'metier', 'Phase2', 'm2-1', 'Priorisation fonctionnalités', 'inprogress'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'metier', 'Phase2', 'm2-2', 'Scénarios métier', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'metier', 'Phase3', 'm3-1', 'Validation maquettes', 'inprogress'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'metier', 'Phase4', 'm4-1', 'Recette métier', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'metier', 'Phase5', 'm5-1', 'Validation Go / No-Go', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'metier', 'Phase6', 'm6-1', 'Retour d''expérience métier', 'notdone'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'changement', 'Phase1', 'c1-1', 'Analyse des impacts', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'changement', 'Phase2', 'c2-1', 'Plan de formation', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'changement', 'Phase2', 'c2-2', 'Carte des parties prenantes', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'changement', 'Phase3', 'c3-1', 'Sessions d''info', 'inprogress'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'changement', 'Phase4', 'c4-1', 'Accompagnement terrain', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'changement', 'Phase5', 'c5-1', 'Mesure de l''adoption', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'changement', 'Phase6', 'c6-1', 'Stabilisation', 'notdone'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'technologie', 'Phase1', 't1-1', 'Architecture cible', 'done'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'technologie', 'Phase2', 't2-1', 'Spécifications techniques', 'inprogress'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'technologie', 'Phase2', 't2-2', 'Plan d''intégration', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'technologie', 'Phase3', 't3-1', 'Développement', 'inprogress'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'technologie', 'Phase3', 't3-2', 'Tests techniques', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'technologie', 'Phase4', 't4-1', 'Tests de performance', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'technologie', 'Phase5', 't5-1', 'Déploiement', 'todo'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'technologie', 'Phase6', 't6-1', 'Support post-déploiement', 'todo')
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `status` = VALUES(`status`);

INSERT INTO `project_task_assignments`
(`project_id`, `activity_id`, `phase_id`, `task_id`, `reporter_id`, `accountant_id`, `responsible_id`) VALUES
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'projet', 'Phase1', 'p1-1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'metier', 'Phase2', 'm2-1', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'changement', 'Phase3', 'c3-1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'technologie', 'Phase2', 't2-1', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd')
ON DUPLICATE KEY UPDATE
  `reporter_id` = VALUES(`reporter_id`),
  `accountant_id` = VALUES(`accountant_id`),
  `responsible_id` = VALUES(`responsible_id`);

--
-- Enrichissement non destructif des données existantes
-- (copie des anciens champs vers les nouveaux si nécessaire)
--

-- users.full_name <= CONCAT(firstname, lastname) si les colonnes legacy existent
SET @has_users_firstname := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'firstname'
);
SET @has_users_lastname := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'lastname'
);
SET @sql := IF(@has_users_firstname > 0 AND @has_users_lastname > 0,
  'UPDATE `users`
   SET `full_name` = TRIM(CONCAT(COALESCE(`firstname`, ''''), '' '', COALESCE(`lastname`, '''')))
   WHERE (`full_name` IS NULL OR `full_name` = '''')',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users_roles_projects.user_id <= users_roles_projects.user (legacy)
SET @has_urp_user_legacy := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND COLUMN_NAME = 'user'
);
SET @sql := IF(@has_urp_user_legacy > 0,
  'UPDATE `users_roles_projects`
   SET `user_id` = `user`
   WHERE `user_id` IS NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users_roles_projects.role_id <= users_roles_projects.role (legacy)
SET @has_urp_role_legacy := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND COLUMN_NAME = 'role'
);
SET @sql := IF(@has_urp_role_legacy > 0,
  'UPDATE `users_roles_projects`
   SET `role_id` = `role`
   WHERE `role_id` IS NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users_roles_projects.project_id <= users_roles_projects.project (legacy)
SET @has_urp_project_legacy := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND COLUMN_NAME = 'project'
);
SET @sql := IF(@has_urp_project_legacy > 0,
  'UPDATE `users_roles_projects`
   SET `project_id` = `project`
   WHERE `project_id` IS NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Nettoyage des redondances non exploitées par le backend
-- (on conserve les colonnes canoniques: created_at/updated_at/full_name/user_id/role_id/project_id)

-- users: supprimer firstname/lastname après migration vers full_name
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'firstname'
);
SET @sql := IF(@col_exists > 0, 'ALTER TABLE `users` DROP COLUMN `firstname`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'lastname'
);
SET @sql := IF(@col_exists > 0, 'ALTER TABLE `users` DROP COLUMN `lastname`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users: uniformiser date_created/date_updated vers created_at/updated_at puis supprimer legacy
SET @has_users_date_created := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'date_created'
);
SET @has_users_created_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'created_at'
);
SET @sql := IF(@has_users_date_created > 0 AND @has_users_created_at > 0,
  'UPDATE `users` SET `created_at` = COALESCE(`created_at`, `date_created`) WHERE `date_created` IS NOT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_users_date_created > 0, 'ALTER TABLE `users` DROP COLUMN `date_created`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_users_date_updated := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'date_updated'
);
SET @has_users_updated_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'updated_at'
);
SET @sql := IF(@has_users_date_updated > 0 AND @has_users_updated_at > 0,
  'UPDATE `users` SET `updated_at` = COALESCE(`updated_at`, `date_updated`) WHERE `date_updated` IS NOT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_users_date_updated > 0, 'ALTER TABLE `users` DROP COLUMN `date_updated`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users_roles_projects: supprimer alias legacy après copie vers colonnes canoniques
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND COLUMN_NAME = 'user'
);
SET @sql := IF(@col_exists > 0, 'ALTER TABLE `users_roles_projects` DROP COLUMN `user`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND COLUMN_NAME = 'role'
);
SET @sql := IF(@col_exists > 0, 'ALTER TABLE `users_roles_projects` DROP COLUMN `role`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND COLUMN_NAME = 'project'
);
SET @sql := IF(@col_exists > 0, 'ALTER TABLE `users_roles_projects` DROP COLUMN `project`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Valeurs par défaut minimales pour éviter des NULL bloquants côté applicatif
UPDATE `projects` SET `status` = COALESCE(NULLIF(`status`, ''), 'active');
UPDATE `roles` SET `status` = COALESCE(NULLIF(`status`, ''), 'active');
UPDATE `users_roles_projects` SET `status` = COALESCE(NULLIF(`status`, ''), 'active');
UPDATE `users` SET `password_hash` = COALESCE(NULLIF(`password_hash`, ''), '0192023a7bbd73250516f069df18b500');
SET @has_users_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'
);
SET @has_users_user_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'user_id'
);

-- username: conversion des UUID vers des nicknames lisibles
UPDATE `users`
SET `username` = NULL
WHERE `username` REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

UPDATE `users`
SET `username` = LOWER(SUBSTRING_INDEX(`email`, '@', 1))
WHERE (`username` IS NULL OR `username` = '')
  AND `email` IS NOT NULL
  AND `email` <> '';

UPDATE `users`
SET `username` = LOWER(
  REPLACE(
    REPLACE(
      REPLACE(TRIM(`full_name`), ' ', '_'),
      '''',
      ''
    ),
    '.',
    '_'
  )
)
WHERE (`username` IS NULL OR `username` = '')
  AND `full_name` IS NOT NULL
  AND `full_name` <> '';

SET @sql := IF(@has_users_id > 0,
  'UPDATE `users` SET `username` = COALESCE(NULLIF(`username`, ''''), CONCAT(''user_'', LOWER(REPLACE(CAST(`id` AS CHAR(36)), ''-'', ''''))))',
  IF(@has_users_user_id > 0,
    'UPDATE `users` SET `username` = COALESCE(NULLIF(`username`, ''''), CONCAT(''user_'', LOWER(REPLACE(CAST(`user_id` AS CHAR(36)), ''-'', ''''))))',
    'UPDATE `users` SET `username` = COALESCE(NULLIF(`username`, ''''), CONCAT(''user_'', LOWER(REPLACE(UUID(), ''-'', ''''))))'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE `users` SET `full_name` = COALESCE(NULLIF(`full_name`, ''), `username`);

SET @users_pk_col := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id') > 0,
  'id',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'user_id') > 0,
    'user_id',
    NULL
  )
);
SET @roles_pk_col := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'id') > 0,
  'id',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'role_id') > 0,
    'role_id',
    NULL
  )
);
SET @projects_pk_col := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'id') > 0,
  'id',
  IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'project_id') > 0,
    'project_id',
    NULL
  )
);

-- username uniques: en cas de collision, suffixe avec la PK utilisateur
SET @sql := IF(@users_pk_col IS NOT NULL,
  CONCAT(
    'UPDATE `users` u ',
    'JOIN `users` u2 ON u.`username` = u2.`username` AND u.`', @users_pk_col, '` > u2.`', @users_pk_col, '` ',
    'SET u.`username` = CONCAT(u.`username`, ''_'', LOWER(REPLACE(CAST(u.`', @users_pk_col, '` AS CHAR(36)), ''-'', '''')))'
  ),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Compte administrateur imposé: admin / admin (stocké en MD5 pour compatibilité applicative)
UPDATE `users`
SET
  `password_hash` = MD5('admin'),
  `full_name` = COALESCE(NULLIF(`full_name`, ''), 'Administrateur'),
  `is_active` = 1
WHERE LOWER(`username`) = 'admin';

SET @admin_exists := (SELECT COUNT(*) FROM `users` WHERE LOWER(`username`) = 'admin');
SET @sql := IF(@admin_exists = 0,
  IF(@users_pk_col IS NOT NULL,
    CONCAT(
      'INSERT INTO `users` (`', @users_pk_col, '`, `username`, `password_hash`, `full_name`, `email`, `is_active`) ',
      'VALUES (''eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'', ''admin'', MD5(''admin''), ''Administrateur'', ''admin@local'', 1)'
    ),
    'INSERT INTO `users` (`username`, `password_hash`, `full_name`, `email`, `is_active`) VALUES (''admin'', MD5(''admin''), ''Administrateur'', ''admin@local'', 1)'
  ),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND CONSTRAINT_NAME = 'fk_urp_user'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'users_roles_projects' AND c1.COLUMN_NAME = 'user_id'
    AND c2.TABLE_NAME = 'users' AND c2.COLUMN_NAME = @users_pk_col
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @users_pk_col IS NOT NULL AND @col_match > 0,
  CONCAT('ALTER TABLE `users_roles_projects` ADD CONSTRAINT `fk_urp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`', @users_pk_col, '`)'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND CONSTRAINT_NAME = 'fk_urp_role'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'users_roles_projects' AND c1.COLUMN_NAME = 'role_id'
    AND c2.TABLE_NAME = 'roles' AND c2.COLUMN_NAME = @roles_pk_col
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @roles_pk_col IS NOT NULL AND @col_match > 0,
  CONCAT('ALTER TABLE `users_roles_projects` ADD CONSTRAINT `fk_urp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`', @roles_pk_col, '`)'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'users_roles_projects' AND CONSTRAINT_NAME = 'fk_urp_project'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'users_roles_projects' AND c1.COLUMN_NAME = 'project_id'
    AND c2.TABLE_NAME = 'projects' AND c2.COLUMN_NAME = @projects_pk_col
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @projects_pk_col IS NOT NULL AND @col_match > 0,
  CONCAT('ALTER TABLE `users_roles_projects` ADD CONSTRAINT `fk_urp_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`', @projects_pk_col, '`)'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_task_assignments' AND CONSTRAINT_NAME = 'fk_pta_project'
);
SET @fk_ref_table := (
  SELECT kcu.REFERENCED_TABLE_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'project_task_assignments'
    AND kcu.CONSTRAINT_NAME = 'fk_pta_project'
  LIMIT 1
);
SET @sql := IF(@fk_exists > 0 AND @fk_ref_table IS NOT NULL AND @fk_ref_table <> 'projects',
  'ALTER TABLE `project_task_assignments` DROP FOREIGN KEY `fk_pta_project`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_task_assignments' AND CONSTRAINT_NAME = 'fk_pta_project'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'project_task_assignments' AND c1.COLUMN_NAME = 'project_id'
    AND c2.TABLE_NAME = 'projects' AND c2.COLUMN_NAME = @projects_pk_col
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @projects_pk_col IS NOT NULL AND @col_match > 0,
  CONCAT('ALTER TABLE `project_task_assignments` ADD CONSTRAINT `fk_pta_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`', @projects_pk_col, '`)'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_task_assignments' AND CONSTRAINT_NAME = 'fk_pta_reporter'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'project_task_assignments' AND c1.COLUMN_NAME = 'reporter_id'
    AND c2.TABLE_NAME = 'users' AND c2.COLUMN_NAME = @users_pk_col
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @users_pk_col IS NOT NULL AND @col_match > 0,
  CONCAT('ALTER TABLE `project_task_assignments` ADD CONSTRAINT `fk_pta_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`', @users_pk_col, '`)'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_task_assignments' AND CONSTRAINT_NAME = 'fk_pta_accountant'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'project_task_assignments' AND c1.COLUMN_NAME = 'accountant_id'
    AND c2.TABLE_NAME = 'users' AND c2.COLUMN_NAME = @users_pk_col
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @users_pk_col IS NOT NULL AND @col_match > 0,
  CONCAT('ALTER TABLE `project_task_assignments` ADD CONSTRAINT `fk_pta_accountant` FOREIGN KEY (`accountant_id`) REFERENCES `users` (`', @users_pk_col, '`)'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_task_assignments' AND CONSTRAINT_NAME = 'fk_pta_responsible'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'project_task_assignments' AND c1.COLUMN_NAME = 'responsible_id'
    AND c2.TABLE_NAME = 'users' AND c2.COLUMN_NAME = @users_pk_col
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @users_pk_col IS NOT NULL AND @col_match > 0,
  CONCAT('ALTER TABLE `project_task_assignments` ADD CONSTRAINT `fk_pta_responsible` FOREIGN KEY (`responsible_id`) REFERENCES `users` (`', @users_pk_col, '`)'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_risks' AND CONSTRAINT_NAME = 'fk_project_risks_project'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'project_risks' AND c1.COLUMN_NAME = 'projectId'
    AND c2.TABLE_NAME = 'projects' AND c2.COLUMN_NAME = @projects_pk_col
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @projects_pk_col IS NOT NULL AND @col_match > 0,
  CONCAT('ALTER TABLE `project_risks` ADD CONSTRAINT `fk_project_risks_project` FOREIGN KEY (`projectId`) REFERENCES `projects` (`', @projects_pk_col, '`)'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_risks' AND CONSTRAINT_NAME = 'fk_project_risks_risk'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'project_risks' AND c1.COLUMN_NAME = 'riskId'
    AND c2.TABLE_NAME = 'risks' AND c2.COLUMN_NAME = 'uuid'
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @col_match > 0,
  'ALTER TABLE `project_risks` ADD CONSTRAINT `fk_project_risks_risk` FOREIGN KEY (`riskId`) REFERENCES `risks` (`uuid`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
