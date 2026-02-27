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
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Projet A – Plateforme opérationnelle', 'Mise en place d’une nouvelle plateforme de suivi opérationnel pour les équipes métiers et IT.', '{\r\n   \"id\":\"6c4a8c7c-95ca-4b5d-8667-7e8242f73596\",\r\n   \"name\":\"Projet A – Plateforme opérationnelle\",\r\n   \"description\":\"Mise en place d’une nouvelle plateforme de suivi opérationnel pour les équipes métiers et IT.\",\r\n   \"phases\":[\r\n      \"Phase1\",\r\n      \"Phase2\",\r\n      \"Phase3\",\r\n      \"Phase4\",\r\n      \"Phase5\",\r\n      \"Phase6\"\r\n   ],\r\n   \"activities\":{\r\n      \"projet\":{\r\n         \"id\":\"projet\",\r\n         \"label\":\"Gestion du projet\",\r\n         \"owner\":\"Alice Dupont\"\r\n      },\r\n      \"metier\":{\r\n         \"id\":\"metier\",\r\n         \"label\":\"Gestion du métier\",\r\n         \"owner\":\"Claire Leroy\"\r\n      },\r\n      \"changement\":{\r\n         \"id\":\"changement\",\r\n         \"label\":\"Gestion du changement\",\r\n         \"owner\":\"Bruno Martin\"\r\n      },\r\n      \"technologie\":{\r\n         \"id\":\"technologie\",\r\n         \"label\":\"Gestion de la technologie\",\r\n         \"owner\":\"David Lambert\"\r\n      }\r\n   },\r\n   \"activityMatrix\":{\r\n      \"projet\":{\r\n         \"Phase1\":[\r\n            {\r\n               \"id\":\"p1-1\",\r\n               \"label\":\"Charte projet\",\r\n               \"status\":\"done\"\r\n            },\r\n            {\r\n               \"id\":\"p1-2\",\r\n               \"label\":\"Nomination gouvernance\",\r\n               \"status\":\"done\"\r\n            }\r\n         ],\r\n         \"Phase2\":[\r\n            {\r\n               \"id\":\"p2-1\",\r\n               \"label\":\"Plan de projet détaillé\",\r\n               \"status\":\"inprogress\"\r\n            },\r\n            {\r\n               \"id\":\"p2-2\",\r\n               \"label\":\"Plan de communication\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase3\":[\r\n            {\r\n               \"id\":\"p3-1\",\r\n               \"label\":\"Suivi risques\",\r\n               \"status\":\"inprogress\"\r\n            }\r\n         ],\r\n         \"Phase4\":[\r\n            {\r\n               \"id\":\"p4-1\",\r\n               \"label\":\"Comités de pilotage\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase5\":[\r\n            {\r\n               \"id\":\"p5-1\",\r\n               \"label\":\"Préparation clôture\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase6\":[\r\n            {\r\n               \"id\":\"p6-1\",\r\n               \"label\":\"Clôture administrative\",\r\n               \"status\":\"notdone\"\r\n            }\r\n         ]\r\n      },\r\n      \"metier\":{\r\n         \"Phase1\":[\r\n            {\r\n               \"id\":\"m1-1\",\r\n               \"label\":\"Clarification besoins\",\r\n               \"status\":\"done\"\r\n            }\r\n         ],\r\n         \"Phase2\":[\r\n            {\r\n               \"id\":\"m2-1\",\r\n               \"label\":\"Priorisation fonctionnalités\",\r\n               \"status\":\"inprogress\"\r\n            },\r\n            {\r\n               \"id\":\"m2-2\",\r\n               \"label\":\"Scénarios métier\",\r\n               \"status\":\"todo\"\r\n            },\r\n            {\r\n               \"id\":\"m2-3\",\r\n               \"label\":\"Priorisation fonctionnalités\",\r\n               \"status\":\"inprogress\"\r\n            },\r\n            {\r\n               \"id\":\"m2-4\",\r\n               \"label\":\"Scénarios métier\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase3\":[\r\n            {\r\n               \"id\":\"m3-1\",\r\n               \"label\":\"Validation maquettes\",\r\n               \"status\":\"inprogress\"\r\n            }\r\n         ],\r\n         \"Phase4\":[\r\n            {\r\n               \"id\":\"m4-1\",\r\n               \"label\":\"Recette métier\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase5\":[\r\n            {\r\n               \"id\":\"m5-1\",\r\n               \"label\":\"Validation Go / No-Go\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase6\":[\r\n            {\r\n               \"id\":\"m6-1\",\r\n               \"label\":\"Retour d’expérience métier\",\r\n               \"status\":\"notdone\"\r\n            }\r\n         ]\r\n      },\r\n      \"changement\":{\r\n         \"Phase1\":[\r\n            {\r\n               \"id\":\"c1-1\",\r\n               \"label\":\"Analyse des impacts\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase2\":[\r\n            {\r\n               \"id\":\"c2-1\",\r\n               \"label\":\"Plan de formation\",\r\n               \"status\":\"todo\"\r\n            },\r\n            {\r\n               \"id\":\"c2-2\",\r\n               \"label\":\"Carte des parties prenantes\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase3\":[\r\n            {\r\n               \"id\":\"c3-1\",\r\n               \"label\":\"Sessions d’info\",\r\n               \"status\":\"inprogress\"\r\n            }\r\n         ],\r\n         \"Phase4\":[\r\n            {\r\n               \"id\":\"c4-1\",\r\n               \"label\":\"Accompagnement terrain\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase5\":[\r\n            {\r\n               \"id\":\"c5-1\",\r\n               \"label\":\"Mesure de l’adoption\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase6\":[\r\n            {\r\n               \"id\":\"c6-1\",\r\n               \"label\":\"Stabilisation\",\r\n               \"status\":\"notdone\"\r\n            }\r\n         ]\r\n      },\r\n      \"technologie\":{\r\n         \"Phase1\":[\r\n            {\r\n               \"id\":\"t1-1\",\r\n               \"label\":\"Architecture cible\",\r\n               \"status\":\"done\"\r\n            }\r\n         ],\r\n         \"Phase2\":[\r\n            {\r\n               \"id\":\"t2-1\",\r\n               \"label\":\"Spécifications techniques\",\r\n               \"status\":\"inprogress\"\r\n            },\r\n            {\r\n               \"id\":\"t2-2\",\r\n               \"label\":\"Plan d’intégration\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase3\":[\r\n            {\r\n               \"id\":\"t3-1\",\r\n               \"label\":\"Développement\",\r\n               \"status\":\"inprogress\"\r\n            },\r\n            {\r\n               \"id\":\"t3-2\",\r\n               \"label\":\"Tests techniques\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase4\":[\r\n            {\r\n               \"id\":\"t4-1\",\r\n               \"label\":\"Tests de performance\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase5\":[\r\n            {\r\n               \"id\":\"t5-1\",\r\n               \"label\":\"Déploiement\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ],\r\n         \"Phase6\":[\r\n            {\r\n               \"id\":\"t6-1\",\r\n               \"label\":\"Support post-déploiement\",\r\n               \"status\":\"todo\"\r\n            }\r\n         ]\r\n      }\r\n   }\r\n}', '2026-02-11 19:36:22', '2026-01-04 02:50:16', '');

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
-- Structure de la table `project_activities_assignments`
--

CREATE TABLE IF NOT EXISTS `project_activities_assignments` (
  `project_id` uuid NOT NULL,
  `activity_type_id` varchar(64) NOT NULL,
  `phase_id` varchar(32) NOT NULL,
  `activity_id` varchar(128) NOT NULL,
  `reporter_id` uuid DEFAULT NULL,
  `accountant_id` uuid DEFAULT NULL,
  `responsible_id` uuid DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`project_id`,`activity_type_id`,`phase_id`,`activity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_phases`
--

CREATE TABLE IF NOT EXISTS `project_phases` (
  `project_id` uuid NOT NULL,
  `shortname` varchar(32) NOT NULL,
  `longName` varchar(255) DEFAULT NULL,
  `phase_order` int NOT NULL,
  PRIMARY KEY (`project_id`,`shortname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_activitie_types`
--

CREATE TABLE IF NOT EXISTS `project_activitie_types` (
  `project_id` uuid NOT NULL,
  `activity_type_id` varchar(64) NOT NULL,
  `label` varchar(255) NOT NULL,
  `owner_name` varchar(180) DEFAULT NULL,
  `sequence` int DEFAULT NULL,
  PRIMARY KEY (`project_id`,`activity_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_activitie_types`
--

CREATE TABLE IF NOT EXISTS `project_activities` (
  `project_id` uuid NOT NULL,
  `activity_type_id` varchar(64) NOT NULL,
  `phase_id` varchar(32) NOT NULL,
  `activity_id` varchar(128) NOT NULL,
  `label` varchar(255) NOT NULL,
  `startdate` timestamp NOT NULL DEFAULT current_timestamp(),
  `enddate` timestamp NOT NULL DEFAULT (current_timestamp() + interval 5 day),
  `status` varchar(32) NOT NULL,
  PRIMARY KEY (`project_id`,`activity_type_id`,`phase_id`,`activity_id`)
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

-- Structure de la table `project_type_phases_default`
--

CREATE TABLE IF NOT EXISTS `project_type_phases_default` (
  `uuid` uuid NOT NULL DEFAULT uuid(),
  `project_type_id` uuid NOT NULL,
  `sequence` int NOT NULL,
  `shortname` varchar(64) NOT NULL,
  `longname` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'Active',
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_type_activities_type_default`
--

CREATE TABLE IF NOT EXISTS `project_type_activities_type_default` (
  `uuid` uuid NOT NULL DEFAULT uuid(),
  `project_type_id` uuid NOT NULL,
  `sequence` int NOT NULL,
  `shortname` varchar(64) NOT NULL,
  `longname` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'Active',
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_type_activities_default`
--

CREATE TABLE IF NOT EXISTS `project_type_activities_default` (
  `uuid` uuid NOT NULL DEFAULT uuid(),
  `project_type_id` uuid NOT NULL,
  `phaseId` varchar(64) NOT NULL,
  `activity_type_id` varchar(64) NOT NULL,
  `sequence` int NOT NULL,
  `activity_id` varchar(64) NOT NULL,
  `longname` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'Active',
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_activities_links`
--

CREATE TABLE IF NOT EXISTS `project_activities_links` (
  `project_id` uuid NOT NULL,
  `IdActivityFrom` varchar(128) NOT NULL,
  `IdActivityTo` varchar(128) NOT NULL,
  `dependency_type` varchar(32) NOT NULL DEFAULT 'finish-to-start',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`project_id`,`IdActivityFrom`,`IdActivityTo`)
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
  `riskId` uuid NOT NULL DEFAULT uuid(),
  `short_name` varchar(16) DEFAULT NULL,
  `long_name` varchar(255) DEFAULT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'Open',
  `criticity` varchar(32) DEFAULT NULL,
  `probability` varchar(32) DEFAULT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `remaining_risk` uuid DEFAULT NULL,
  PRIMARY KEY (`projectId`, `riskId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_health_default`
--

CREATE TABLE IF NOT EXISTS `project_health_default` (
  `health_id` uuid NOT NULL DEFAULT uuid(),
  `health_short_name` varchar(64) NOT NULL,
  `health_long_name` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`health_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Structure de la table `project_health`
--

CREATE TABLE IF NOT EXISTS `project_health` (
  `health_id` uuid NOT NULL DEFAULT uuid(),
  `project_id` uuid NOT NULL,
  `health_short_name` varchar(64) NOT NULL,
  `health_long_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`health_id`)
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
-- Index pour la table `project_activities_assignments`
--
ALTER TABLE `project_activities_assignments`
  ADD COLUMN IF NOT EXISTS `reporter_id` uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `accountant_id` uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `responsible_id` uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp();
ALTER TABLE `project_activities`
  ADD COLUMN IF NOT EXISTS `status` varchar(32) NOT NULL DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS `startdate` timestamp NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `enddate` timestamp NOT NULL DEFAULT (current_timestamp() + interval 5 day);

-- Nettoyage des doublons de labels dans project_activities
-- (même projet / type d'activité / phase / label), on conserve la 1ère occurrence.
SET @has_pa_dedup_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_activities' AND COLUMN_NAME = '__dedup_row'
);
SET @sql := IF(@has_pa_dedup_col = 0,
  'ALTER TABLE `project_activities` ADD COLUMN `__dedup_row` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

DELETE pa1 FROM `project_activities` pa1
JOIN `project_activities` pa2
  ON pa1.`project_id` <=> pa2.`project_id`
 AND pa1.`activity_type_id` <=> pa2.`activity_type_id`
 AND pa1.`phase_id` <=> pa2.`phase_id`
 AND TRIM(COALESCE(pa1.`label`, '')) = TRIM(COALESCE(pa2.`label`, ''))
 AND pa1.`__dedup_row` > pa2.`__dedup_row`;

SET @has_pa_dedup_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_activities' AND COLUMN_NAME = '__dedup_row'
);
SET @sql := IF(@has_pa_dedup_col > 0,
  'ALTER TABLE `project_activities` DROP COLUMN `__dedup_row`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE `project_type_activities_default`
  ADD COLUMN IF NOT EXISTS `phaseId` varchar(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `activity_type_id` varchar(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `activity_id` varchar(64) DEFAULT NULL;
ALTER TABLE `project_health`
  ADD COLUMN IF NOT EXISTS `description` text DEFAULT NULL;
ALTER TABLE `project_activities_links`
  ADD COLUMN IF NOT EXISTS `project_id` uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS `IdActivityFrom` varchar(128) NOT NULL,
  ADD COLUMN IF NOT EXISTS `IdActivityTo` varchar(128) NOT NULL,
  ADD COLUMN IF NOT EXISTS `dependency_type` varchar(32) NOT NULL DEFAULT 'finish-to-start',
  ADD COLUMN IF NOT EXISTS `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp();
CREATE INDEX IF NOT EXISTS `idx_pta_reporter` ON `project_activities_assignments` (`reporter_id`);
CREATE INDEX IF NOT EXISTS `idx_pta_accountant` ON `project_activities_assignments` (`accountant_id`);
CREATE INDEX IF NOT EXISTS `idx_pta_responsible` ON `project_activities_assignments` (`responsible_id`);
CREATE INDEX IF NOT EXISTS `idx_project_phases_order` ON `project_phases` (`project_id`,`phase_order`);
ALTER TABLE `project_phases`
  ADD COLUMN IF NOT EXISTS `shortname` varchar(32) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `longName` varchar(255) DEFAULT NULL;
SET @has_project_phases_phase_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_phases' AND COLUMN_NAME = 'phase_id'
);
SET @has_project_phases_shortname := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_phases' AND COLUMN_NAME = 'shortname'
);
SET @sql := IF(@has_project_phases_phase_id > 0 AND @has_project_phases_shortname > 0,
  'UPDATE `project_phases` SET `shortname` = COALESCE(NULLIF(`shortname`, ''''), `phase_id`) WHERE `phase_id` IS NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @pk_has_phase_id := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_phases'
    AND INDEX_NAME = 'PRIMARY'
    AND COLUMN_NAME = 'phase_id'
);
SET @pk_has_shortname := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_phases'
    AND INDEX_NAME = 'PRIMARY'
    AND COLUMN_NAME = 'shortname'
);
SET @sql := IF(@pk_has_phase_id > 0 AND @pk_has_shortname = 0,
  'ALTER TABLE `project_phases` DROP PRIMARY KEY, ADD PRIMARY KEY (`project_id`, `shortname`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_project_phases_phase_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_phases' AND COLUMN_NAME = 'phase_id'
);
SET @sql := IF(@has_project_phases_phase_id > 0,
  'ALTER TABLE `project_phases` DROP COLUMN `phase_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `project_phases` p
LEFT JOIN (
  SELECT `shortname`, MIN(`longname`) AS `longname`
  FROM `project_type_phases_default`
  GROUP BY `shortname`
) d
  ON d.`shortname` = p.`shortname`
SET p.`longName` = COALESCE(NULLIF(p.`longName`, ''), d.`longname`, p.`shortname`)
WHERE p.`shortname` IS NOT NULL;
CREATE INDEX IF NOT EXISTS `idx_project_activities_owner` ON `project_activitie_types` (`owner_name`);
CREATE INDEX IF NOT EXISTS `idx_project_activities_status` ON `project_activities` (`status`);
CREATE INDEX IF NOT EXISTS `idx_project_type_activities_default_phase` ON `project_type_activities_default` (`project_type_id`, `phaseId`);
CREATE INDEX IF NOT EXISTS `idx_project_type_activities_default_activity_type` ON `project_type_activities_default` (`project_type_id`, `activity_type_id`);
CREATE INDEX IF NOT EXISTS `idx_project_activities_links_to` ON `project_activities_links` (`project_id`, `IdActivityTo`);
CREATE INDEX IF NOT EXISTS `idx_project_activities_links_type` ON `project_activities_links` (`dependency_type`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_project_type_name` ON `project_type` (`name`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_activities_type_short` ON `activities` (`id_project_type`, `short_name`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_project_type_phases_default_type_short` ON `project_type_phases_default` (`project_type_id`, `shortname`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_project_type_activities_default_type_short` ON `project_type_activities_type_default` (`project_type_id`, `shortname`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_project_type_activities_default_type_activity` ON `project_type_activities_default` (`project_type_id`, `activity_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_project_health_default_short_name` ON `project_health_default` (`health_short_name`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_project_health_project_short` ON `project_health` (`project_id`, `health_short_name`);
CREATE INDEX IF NOT EXISTS `idx_project_health_project` ON `project_health` (`project_id`);
CREATE INDEX IF NOT EXISTS `idx_project_health_status` ON `project_health` (`status`);
CREATE UNIQUE INDEX IF NOT EXISTS `uidx_risks_name` ON `risks` (`name`);
CREATE INDEX IF NOT EXISTS `idx_risks_name` ON `risks` (`name`);
CREATE INDEX IF NOT EXISTS `idx_risks_probability` ON `risks` (`probability`);
ALTER TABLE `project_risks`
  ADD COLUMN IF NOT EXISTS `short_name` varchar(16) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `long_name` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `status` varchar(16) NOT NULL DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS `criticity` varchar(32) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `probability` varchar(32) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `date_last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `remaining_risk` uuid DEFAULT NULL;
CREATE INDEX IF NOT EXISTS `idx_project_risks_status` ON `project_risks` (`status`);
CREATE INDEX IF NOT EXISTS `idx_project_risks_risk` ON `project_risks` (`riskId`);
CREATE INDEX IF NOT EXISTS `idx_project_risks_remaining` ON `project_risks` (`remaining_risk`);
CREATE INDEX IF NOT EXISTS `idx_project_changes_project_created` ON `project_changes` (`project_id`, `created_at`);

-- Correction précoce de FK legacy: fk_paa_project peut pointer vers `projects_`
-- et faire échouer les INSERT de project_activities_assignments.
SET @fk_paa_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_activities_assignments'
    AND CONSTRAINT_NAME = 'fk_paa_project'
);
SET @fk_paa_ref_table := (
  SELECT kcu.REFERENCED_TABLE_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'project_activities_assignments'
    AND kcu.CONSTRAINT_NAME = 'fk_paa_project'
  LIMIT 1
);
SET @sql := IF(@fk_paa_exists > 0 AND @fk_paa_ref_table <> 'projects',
  'ALTER TABLE `project_activities_assignments` DROP FOREIGN KEY `fk_paa_project`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @fk_paa_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_activities_assignments'
    AND CONSTRAINT_NAME = 'fk_paa_project'
);
SET @sql := IF(@fk_paa_exists = 0,
  'ALTER TABLE `project_activities_assignments` ADD CONSTRAINT `fk_paa_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

--
-- Données d'exemple supplémentaires (tolérant aux schémas legacy)
--

-- Purge complète des enregistrements avant réinjection des données de référence
-- (évite toute redondance lors des ré-exécutions du script)
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `project_activities_assignments`;
DELETE FROM `project_activitie_types`;
DELETE FROM `project_activities_links`;
DELETE FROM `project_activitie_types`;
DELETE FROM `project_phases`;
DELETE FROM `users_roles_projects`;
DELETE FROM `project_risks`;
DELETE FROM `project_health`;
DELETE FROM `project_changes`;
DELETE FROM `risks`;
DELETE FROM `project_health_default`;
DELETE FROM `activities`;
DELETE FROM `project_type_phases_default`;
DELETE FROM `project_type_activities_type_default`;
DELETE FROM `project_type_activities_default`;
DELETE FROM `project_type`;
DELETE FROM `users`;
DELETE FROM `roles`;
DELETE FROM `projects`;
SET FOREIGN_KEY_CHECKS = 1;
DROP TABLE IF EXISTS `phases`;

-- Réinjection explicite du projet de référence (requis avant activities/assignments/risks)
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

INSERT IGNORE INTO `project_health_default`
(`health_short_name`, `health_long_name`, `status`) VALUES
('Good', 'No known issues', 'active'),
('Average', 'Non blocking issues to manage', 'active'),
('Bad', 'Severe issues requiring action', 'active'),
('Blocked', 'Blocking issues requiring immediate action', 'active');

INSERT IGNORE INTO `project_type` (`name`, `description`, `date_created`)
VALUES
('PMBOK', '6 phases', NOW()),
('AgilePM', 'Lifecycle AgilePM (DSDM): Pre-Project, Feasibility, Foundations, Exploration, Engineering, Deployment, Post-Project', NOW()),
('Prince2', 'PRINCE2 process model: SU, IP, CS, MP, SB, DP, CP', NOW());

SET @id_project_type_pmbok := (
  SELECT `uuid`
  FROM `project_type`
  WHERE `name` = 'PMBOK'
  ORDER BY `date_created` ASC
  LIMIT 1
);
SET @id_project_type_agilepm := (
  SELECT `uuid`
  FROM `project_type`
  WHERE `name` = 'AgilePM'
  ORDER BY `date_created` ASC
  LIMIT 1
);
SET @id_project_type_prince2 := (
  SELECT `uuid`
  FROM `project_type`
  WHERE `name` = 'Prince2'
  ORDER BY `date_created` ASC
  LIMIT 1
);

INSERT IGNORE INTO `activities` (`sequence`, `short_name`, `long_name`, `id_project_type`, `date_created`) VALUES
(1, 'projet', 'Gestion du projet', @id_project_type_pmbok, NOW()),
(2, 'metier', 'Gestion du métier', @id_project_type_pmbok, NOW()),
(3, 'changement', 'Gestion du changement', @id_project_type_pmbok, NOW()),
(4, 'technologie', 'Gestion de la technologie', @id_project_type_pmbok, NOW()),
(1, 'projet', 'Gestion du projet', @id_project_type_agilepm, NOW()),
(2, 'metier', 'Gestion du métier', @id_project_type_agilepm, NOW()),
(3, 'changement', 'Gestion du changement', @id_project_type_agilepm, NOW()),
(4, 'technologie', 'Gestion de la technologie', @id_project_type_agilepm, NOW()),
(1, 'projet', 'Gestion du projet', @id_project_type_prince2, NOW()),
(2, 'metier', 'Gestion du métier', @id_project_type_prince2, NOW()),
(3, 'changement', 'Gestion du changement', @id_project_type_prince2, NOW()),
(4, 'technologie', 'Gestion de la technologie', @id_project_type_prince2, NOW());

-- Données par défaut: activités et phases d'un projet type
INSERT IGNORE INTO `project_type_activities_type_default`
(`project_type_id`, `sequence`, `shortname`, `longname`, `status`, `date_created`)
SELECT
  a.`id_project_type`,
  a.`sequence`,
  a.`short_name`,
  a.`long_name`,
  'Active',
  NOW()
FROM `activities` a;

INSERT IGNORE INTO `project_type_phases_default`
(`project_type_id`, `sequence`, `shortname`, `longname`, `status`, `date_created`) VALUES
(@id_project_type_pmbok, 1, 'Phase1', 'Phase 1', 'Active', NOW()),
(@id_project_type_pmbok, 2, 'Phase2', 'Phase 2', 'Active', NOW()),
(@id_project_type_pmbok, 3, 'Phase3', 'Phase 3', 'Active', NOW()),
(@id_project_type_pmbok, 4, 'Phase4', 'Phase 4', 'Active', NOW()),
(@id_project_type_pmbok, 5, 'Phase5', 'Phase 5', 'Active', NOW()),
(@id_project_type_pmbok, 6, 'Phase6', 'Phase 6', 'Active', NOW()),
(@id_project_type_agilepm, 1, 'pre_project', 'Pre-Project', 'Active', NOW()),
(@id_project_type_agilepm, 2, 'feasibility', 'Feasibility', 'Active', NOW()),
(@id_project_type_agilepm, 3, 'foundations', 'Foundations', 'Active', NOW()),
(@id_project_type_agilepm, 4, 'exploration', 'Exploration', 'Active', NOW()),
(@id_project_type_agilepm, 5, 'engineering', 'Engineering', 'Active', NOW()),
(@id_project_type_agilepm, 6, 'deployment', 'Deployment', 'Active', NOW()),
(@id_project_type_agilepm, 7, 'post_project', 'Post-Project', 'Active', NOW()),
(@id_project_type_prince2, 1, 'su', 'Starting up a Project (SU)', 'Active', NOW()),
(@id_project_type_prince2, 2, 'ip', 'Initiating a Project (IP)', 'Active', NOW()),
(@id_project_type_prince2, 3, 'cs', 'Controlling a Stage (CS)', 'Active', NOW()),
(@id_project_type_prince2, 4, 'mp', 'Managing Product Delivery (MP)', 'Active', NOW()),
(@id_project_type_prince2, 5, 'sb', 'Managing a Stage Boundary (SB)', 'Active', NOW()),
(@id_project_type_prince2, 6, 'dp', 'Directing a Project (DP)', 'Active', NOW()),
(@id_project_type_prince2, 7, 'cp', 'Closing a Project (CP)', 'Active', NOW());

INSERT IGNORE INTO `risks` (`uuid`, `name`, `description`, `probability`, `criticity`, `date_created`) VALUES
('10000000-0000-0000-0000-000000000001', 'Indisponibilité d''un sponsor métier', 'Disponibilité clé métier', 'Moyenne', 'high', NOW()),
('10000000-0000-0000-0000-000000000002', 'Retard de livraison IT critique', 'Retard de livraison IT', 'Élevée', 'critical', NOW()),
('10000000-0000-0000-0000-000000000003', 'Sous-estimation des charges projet', 'Sous-estimation charge', 'Élevée', 'high', NOW()),
('10000000-0000-0000-0000-000000000004', 'Turn-over dans l''équipe projet', 'Turn-over équipe', 'Moyenne', 'medium', NOW()),
('10000000-0000-0000-0000-000000000005', 'Risque de faille de sécurité', 'Faille de sécurité majeure', 'Faible', 'critical', NOW());

INSERT IGNORE INTO `project_risks`
(`projectId`, `riskId`, `short_name`, `long_name`, `status`, `criticity`, `probability`, `date_created`, `date_last_updated`, `remaining_risk`) VALUES
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', '10000000-0000-0000-0000-000000000001', 'IDS', 'Indisponibilité d''un sponsor métier', 'Open', 'high', 'Moyenne', NOW(), NOW(), NULL),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', '10000000-0000-0000-0000-000000000002', 'RLI', 'Retard de livraison IT critique', 'Open', 'critical', 'Élevée', NOW(), NOW(), NULL),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', '10000000-0000-0000-0000-000000000003', 'SDC', 'Sous-estimation des charges projet', 'Open', 'high', 'Élevée', NOW(), NOW(), NULL),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', '10000000-0000-0000-0000-000000000004', 'TDE', 'Turn-over dans l''équipe projet', 'Open', 'medium', 'Moyenne', NOW(), NOW(), NULL),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', '10000000-0000-0000-0000-000000000005', 'RDF', 'Risque de faille de sécurité', 'Open', 'critical', 'Faible', NOW(), NOW(), NULL);

-- Lien automatique du projet existant avec tous les risks existants
INSERT IGNORE INTO `project_risks`
(`projectId`, `riskId`, `short_name`, `long_name`, `status`, `criticity`, `probability`, `date_created`, `date_last_updated`, `remaining_risk`)
SELECT
  p.`id` AS `projectId`,
  r.`uuid` AS `riskId`,
  UPPER(LEFT(REPLACE(REPLACE(r.`name`, ' ', ''), '-', ''), 3)) AS `short_name`,
  r.`name` AS `long_name`,
  'Open' AS `status`,
  r.`criticity` AS `criticity`,
  r.`probability` AS `probability`,
  NOW() AS `date_created`,
  NOW() AS `date_last_updated`,
  NULL AS `remaining_risk`
FROM `projects` p
JOIN `risks` r
WHERE p.`id` = '6c4a8c7c-95ca-4b5d-8667-7e8242f73596';

INSERT IGNORE INTO `project_health`
(`project_id`, `health_short_name`, `health_long_name`, `description`, `status`)
SELECT
  '6c4a8c7c-95ca-4b5d-8667-7e8242f73596' AS `project_id`,
  d.`health_short_name`,
  d.`health_long_name`,
  d.`health_long_name` AS `description`,
  'active' AS `status`
FROM `project_health_default` d
WHERE LOWER(d.`health_short_name`) = 'good';

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

INSERT IGNORE INTO `project_phases` (`project_id`, `shortname`, `longName`, `phase_order`) VALUES
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Phase1', 'Phase 1', 1),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Phase2', 'Phase 2', 2),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Phase3', 'Phase 3', 3),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Phase4', 'Phase 4', 4),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Phase5', 'Phase 5', 5),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'Phase6', 'Phase 6', 6);

INSERT IGNORE INTO `project_activitie_types` (`project_id`, `activity_type_id`, `label`, `owner_name`, `sequence`) VALUES
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'projet', 'Gestion du projet', 'Alice Dupont', 1),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'metier', 'Gestion du métier', 'Claire Leroy', 2),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'changement', 'Gestion du changement', 'Bruno Martin', 3),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'technologie', 'Gestion de la technologie', 'David Lambert', 4);

INSERT INTO `project_activities` (`project_id`, `activity_type_id`, `phase_id`, `activity_id`, `label`, `status`) VALUES
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

INSERT INTO `project_activities_assignments`
(`project_id`, `activity_type_id`, `phase_id`, `activity_id`, `reporter_id`, `accountant_id`, `responsible_id`) VALUES
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'projet', 'Phase1', 'p1-1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'metier', 'Phase2', 'm2-1', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'changement', 'Phase3', 'c3-1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
('6c4a8c7c-95ca-4b5d-8667-7e8242f73596', 'technologie', 'Phase2', 't2-1', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd')
ON DUPLICATE KEY UPDATE
  `reporter_id` = VALUES(`reporter_id`),
  `accountant_id` = VALUES(`accountant_id`),
  `responsible_id` = VALUES(`responsible_id`);

-- Données par défaut: tâches d'un projet type
-- Source: premier projet "Projet A – Plateforme opérationnelle"
SET @seed_project_id := (
  SELECT `id`
  FROM `projects`
  WHERE `name` = 'Projet A – Plateforme opérationnelle'
  ORDER BY `created_at` ASC, `id` ASC
  LIMIT 1
);

SET @activity_seq := 0;
INSERT IGNORE INTO `project_type_activities_default`
(`project_type_id`, `phaseId`, `activity_type_id`, `sequence`, `activity_id`, `longname`, `status`, `date_created`)
SELECT
  @id_project_type_pmbok AS `project_type_id`,
  t.`phase_id` AS `phaseId`,
  t.`activity_type_id` AS `activity_type_id`,
  (@activity_seq := @activity_seq + 1) AS `sequence`,
  t.`activity_id` AS `activity_id`,
  t.`label` AS `longname`,
  'Active' AS `status`,
  NOW() AS `date_created`
FROM `project_activities` t
LEFT JOIN `project_activitie_types` a
  ON a.`project_id` = t.`project_id`
 AND a.`activity_type_id` = t.`activity_type_id`
LEFT JOIN `project_phases` p
  ON p.`project_id` = t.`project_id`
 AND p.`shortname` = t.`phase_id`
WHERE t.`project_id` = @seed_project_id
ORDER BY
  COALESCE(a.`sequence`, 999),
  COALESCE(p.`phase_order`, 999),
  t.`activity_id` ASC;

-- Données par défaut AgilePM
INSERT IGNORE INTO `project_type_activities_default`
(`project_type_id`, `phaseId`, `activity_type_id`, `sequence`, `activity_id`, `longname`, `status`, `date_created`) VALUES
(@id_project_type_agilepm, 'pre_project', 'projet', 1, 'agp-001', 'Nommer Executive et Business Sponsor', 'Active', NOW()),
(@id_project_type_agilepm, 'pre_project', 'metier', 2, 'agp-002', 'Clarifier besoin métier initial', 'Active', NOW()),
(@id_project_type_agilepm, 'feasibility', 'projet', 3, 'agp-003', 'Conduire l''étude de faisabilité', 'Active', NOW()),
(@id_project_type_agilepm, 'feasibility', 'technologie', 4, 'agp-004', 'Valider faisabilité technique de haut niveau', 'Active', NOW()),
(@id_project_type_agilepm, 'foundations', 'metier', 5, 'agp-005', 'Établir Prioritised Requirements List (PRL)', 'Active', NOW()),
(@id_project_type_agilepm, 'foundations', 'projet', 6, 'agp-006', 'Produire Foundations Summary', 'Active', NOW()),
(@id_project_type_agilepm, 'foundations', 'projet', 7, 'agp-007', 'Construire Delivery Plan et Timeboxes', 'Active', NOW()),
(@id_project_type_agilepm, 'exploration', 'metier', 8, 'agp-008', 'Animer ateliers de clarification des exigences', 'Active', NOW()),
(@id_project_type_agilepm, 'exploration', 'technologie', 9, 'agp-009', 'Réaliser prototypage fonctionnel', 'Active', NOW()),
(@id_project_type_agilepm, 'exploration', 'changement', 10, 'agp-010', 'Préparer conduite du changement incrémentale', 'Active', NOW()),
(@id_project_type_agilepm, 'engineering', 'technologie', 11, 'agp-011', 'Développer solution en timebox', 'Active', NOW()),
(@id_project_type_agilepm, 'engineering', 'technologie', 12, 'agp-012', 'Exécuter tests techniques et qualité', 'Active', NOW()),
(@id_project_type_agilepm, 'engineering', 'metier', 13, 'agp-013', 'Valider fonctionnalités avec Business Ambassador', 'Active', NOW()),
(@id_project_type_agilepm, 'deployment', 'projet', 14, 'agp-014', 'Préparer déploiement incrémental', 'Active', NOW()),
(@id_project_type_agilepm, 'deployment', 'changement', 15, 'agp-015', 'Former utilisateurs et support', 'Active', NOW()),
(@id_project_type_agilepm, 'deployment', 'metier', 16, 'agp-016', 'Confirmer bénéfices attendus de l''incrément', 'Active', NOW()),
(@id_project_type_agilepm, 'post_project', 'projet', 17, 'agp-017', 'Mesurer bénéfices et retour d''expérience', 'Active', NOW()),
(@id_project_type_agilepm, 'post_project', 'changement', 18, 'agp-018', 'Consolider adoption et amélioration continue', 'Active', NOW());

-- Données par défaut PRINCE2
INSERT IGNORE INTO `project_type_activities_default`
(`project_type_id`, `phaseId`, `activity_type_id`, `sequence`, `activity_id`, `longname`, `status`, `date_created`) VALUES
(@id_project_type_prince2, 'su', 'projet', 1, 'pr2-001', 'Désigner Executive et Project Manager', 'Active', NOW()),
(@id_project_type_prince2, 'su', 'projet', 2, 'pr2-002', 'Capturer le Project Mandate', 'Active', NOW()),
(@id_project_type_prince2, 'su', 'projet', 3, 'pr2-003', 'Assembler l''équipe de management projet', 'Active', NOW()),
(@id_project_type_prince2, 'ip', 'projet', 4, 'pr2-004', 'Élaborer Project Initiation Documentation (PID)', 'Active', NOW()),
(@id_project_type_prince2, 'ip', 'metier', 5, 'pr2-005', 'Définir Business Case détaillé', 'Active', NOW()),
(@id_project_type_prince2, 'ip', 'projet', 6, 'pr2-006', 'Mettre en place registres (risks, issues, quality)', 'Active', NOW()),
(@id_project_type_prince2, 'dp', 'projet', 7, 'pr2-007', 'Soumettre stage plan au Project Board', 'Active', NOW()),
(@id_project_type_prince2, 'dp', 'projet', 8, 'pr2-008', 'Obtenir autorisation de démarrage de stage', 'Active', NOW()),
(@id_project_type_prince2, 'cs', 'projet', 9, 'pr2-009', 'Suivre avancement et écarts du stage', 'Active', NOW()),
(@id_project_type_prince2, 'cs', 'projet', 10, 'pr2-010', 'Gérer risques et issues du stage', 'Active', NOW()),
(@id_project_type_prince2, 'mp', 'technologie', 11, 'pr2-011', 'Accepter work package', 'Active', NOW()),
(@id_project_type_prince2, 'mp', 'technologie', 12, 'pr2-012', 'Produire et vérifier produits', 'Active', NOW()),
(@id_project_type_prince2, 'mp', 'metier', 13, 'pr2-013', 'Livrer produits complétés au Project Manager', 'Active', NOW()),
(@id_project_type_prince2, 'sb', 'projet', 14, 'pr2-014', 'Préparer End Stage Report', 'Active', NOW()),
(@id_project_type_prince2, 'sb', 'projet', 15, 'pr2-015', 'Préparer plan du stage suivant', 'Active', NOW()),
(@id_project_type_prince2, 'sb', 'metier', 16, 'pr2-016', 'Mettre à jour Business Case pour décision', 'Active', NOW()),
(@id_project_type_prince2, 'cp', 'projet', 17, 'pr2-017', 'Préparer End Project Report', 'Active', NOW()),
(@id_project_type_prince2, 'cp', 'changement', 18, 'pr2-018', 'Planifier revue post-projet et transfert en BAU', 'Active', NOW());

-- Enrichissement "Gestion du changement" inspiré Prosci (ADKAR)
-- PMBOK (Phase1..Phase6)
INSERT IGNORE INTO `project_type_activities_default`
(`project_type_id`, `phaseId`, `activity_type_id`, `sequence`, `activity_id`, `longname`, `status`, `date_created`) VALUES
(@id_project_type_pmbok, 'Phase1', 'changement', 101, 'pmc-101', 'Évaluer la maturité changement et le contexte organisationnel', 'Active', NOW()),
(@id_project_type_pmbok, 'Phase1', 'changement', 102, 'pmc-102', 'Identifier sponsors clés et parties prenantes impactées', 'Active', NOW()),
(@id_project_type_pmbok, 'Phase2', 'changement', 103, 'pmc-103', 'Construire la stratégie changement et le plan de sponsorisation', 'Active', NOW()),
(@id_project_type_pmbok, 'Phase2', 'changement', 104, 'pmc-104', 'Élaborer le plan de communication orienté ADKAR (Awareness/Desire)', 'Active', NOW()),
(@id_project_type_pmbok, 'Phase3', 'changement', 105, 'pmc-105', 'Déployer le plan de coaching managers de proximité', 'Active', NOW()),
(@id_project_type_pmbok, 'Phase3', 'changement', 106, 'pmc-106', 'Préparer et piloter le plan de formation (Knowledge/Ability)', 'Active', NOW()),
(@id_project_type_pmbok, 'Phase4', 'changement', 107, 'pmc-107', 'Mesurer l''adoption et traiter les résistances prioritaires', 'Active', NOW()),
(@id_project_type_pmbok, 'Phase5', 'changement', 108, 'pmc-108', 'Renforcer les comportements cibles (quick wins, reconnaissance)', 'Active', NOW()),
(@id_project_type_pmbok, 'Phase6', 'changement', 109, 'pmc-109', 'Réaliser le bilan ADKAR et transférer en mode BAU', 'Active', NOW());

-- AgilePM (pre_project..post_project)
INSERT IGNORE INTO `project_type_activities_default`
(`project_type_id`, `phaseId`, `activity_type_id`, `sequence`, `activity_id`, `longname`, `status`, `date_created`) VALUES
(@id_project_type_agilepm, 'pre_project', 'changement', 101, 'agc-101', 'Qualifier les impacts humains et la capacité de changement', 'Active', NOW()),
(@id_project_type_agilepm, 'feasibility', 'changement', 102, 'agc-102', 'Définir la stratégie de conduite du changement et les rôles sponsor', 'Active', NOW()),
(@id_project_type_agilepm, 'foundations', 'changement', 103, 'agc-103', 'Construire le plan de communication et de coaching (itératif)', 'Active', NOW()),
(@id_project_type_agilepm, 'exploration', 'changement', 104, 'agc-104', 'Animer des boucles de feedback utilisateurs et ajuster messages', 'Active', NOW()),
(@id_project_type_agilepm, 'engineering', 'changement', 105, 'agc-105', 'Préparer contenus de formation et support au fil des incréments', 'Active', NOW()),
(@id_project_type_agilepm, 'deployment', 'changement', 106, 'agc-106', 'Piloter le readiness go-live et le plan de gestion des résistances', 'Active', NOW()),
(@id_project_type_agilepm, 'post_project', 'changement', 107, 'agc-107', 'Mesurer adoption durable et planifier le renforcement', 'Active', NOW());

-- PRINCE2 (su, ip, cs, mp, sb, dp, cp)
INSERT IGNORE INTO `project_type_activities_default`
(`project_type_id`, `phaseId`, `activity_type_id`, `sequence`, `activity_id`, `longname`, `status`, `date_created`) VALUES
(@id_project_type_prince2, 'su', 'changement', 101, 'prc-101', 'Évaluer les impacts organisationnels et les parties prenantes', 'Active', NOW()),
(@id_project_type_prince2, 'ip', 'changement', 102, 'prc-102', 'Intégrer la stratégie changement dans le PID', 'Active', NOW()),
(@id_project_type_prince2, 'cs', 'changement', 103, 'prc-103', 'Suivre l''adoption, escalader résistances et actions correctives', 'Active', NOW()),
(@id_project_type_prince2, 'mp', 'changement', 104, 'prc-104', 'Accompagner les équipes de livraison sur les impacts utilisateurs', 'Active', NOW()),
(@id_project_type_prince2, 'sb', 'changement', 105, 'prc-105', 'Actualiser le plan changement pour le stage suivant', 'Active', NOW()),
(@id_project_type_prince2, 'dp', 'changement', 106, 'prc-106', 'Présenter au Project Board les indicateurs d''adoption', 'Active', NOW()),
(@id_project_type_prince2, 'cp', 'changement', 107, 'prc-107', 'Consolider le plan de renforcement et transfert aux opérations', 'Active', NOW());

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
UPDATE `project_risks`
SET `status` = CASE
  WHEN LOWER(TRIM(COALESCE(`status`, ''))) IN ('open', 'active') THEN 'Open'
  WHEN LOWER(TRIM(COALESCE(`status`, ''))) IN ('in progress', 'in_progress', 'inprogress') THEN 'In Progress'
  WHEN LOWER(TRIM(COALESCE(`status`, ''))) IN ('closed', 'resolved') THEN 'Closed'
  ELSE 'Open'
END;
UPDATE `project_risks` pr
LEFT JOIN `risks` r ON r.`uuid` = pr.`riskId`
SET
  pr.`probability` = COALESCE(NULLIF(pr.`probability`, ''), r.`probability`),
  pr.`criticity` = COALESCE(NULLIF(pr.`criticity`, ''), r.`criticity`),
  pr.`long_name` = COALESCE(NULLIF(pr.`long_name`, ''), r.`name`),
  pr.`short_name` = COALESCE(NULLIF(pr.`short_name`, ''), UPPER(LEFT(REPLACE(REPLACE(COALESCE(NULLIF(pr.`long_name`, ''), r.`name`), ' ', ''), '-', ''), 3)));
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
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_activities_assignments' AND CONSTRAINT_NAME = 'fk_paa_project'
);
SET @fk_ref_table := (
  SELECT kcu.REFERENCED_TABLE_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'project_activities_assignments'
    AND kcu.CONSTRAINT_NAME = 'fk_paa_project'
  LIMIT 1
);
SET @sql := IF(@fk_exists > 0 AND @fk_ref_table IS NOT NULL AND @fk_ref_table <> 'projects',
  'ALTER TABLE `project_activities_assignments` DROP FOREIGN KEY `fk_paa_project`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_activities_assignments' AND CONSTRAINT_NAME = 'fk_paa_project'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'project_activities_assignments' AND c1.COLUMN_NAME = 'project_id'
    AND c2.TABLE_NAME = 'projects' AND c2.COLUMN_NAME = @projects_pk_col
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @projects_pk_col IS NOT NULL AND @col_match > 0,
  CONCAT('ALTER TABLE `project_activities_assignments` ADD CONSTRAINT `fk_paa_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`', @projects_pk_col, '`)'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_activities_assignments' AND CONSTRAINT_NAME = 'fk_paa_reporter'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'project_activities_assignments' AND c1.COLUMN_NAME = 'reporter_id'
    AND c2.TABLE_NAME = 'users' AND c2.COLUMN_NAME = @users_pk_col
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @users_pk_col IS NOT NULL AND @col_match > 0,
  CONCAT('ALTER TABLE `project_activities_assignments` ADD CONSTRAINT `fk_paa_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`', @users_pk_col, '`)'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_activities_assignments' AND CONSTRAINT_NAME = 'fk_paa_accountant'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'project_activities_assignments' AND c1.COLUMN_NAME = 'accountant_id'
    AND c2.TABLE_NAME = 'users' AND c2.COLUMN_NAME = @users_pk_col
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @users_pk_col IS NOT NULL AND @col_match > 0,
  CONCAT('ALTER TABLE `project_activities_assignments` ADD CONSTRAINT `fk_paa_accountant` FOREIGN KEY (`accountant_id`) REFERENCES `users` (`', @users_pk_col, '`)'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_activities_assignments' AND CONSTRAINT_NAME = 'fk_paa_responsible'
);
SET @col_match := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS c1
  JOIN information_schema.COLUMNS c2 ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
  WHERE c1.TABLE_SCHEMA = DATABASE()
    AND c1.TABLE_NAME = 'project_activities_assignments' AND c1.COLUMN_NAME = 'responsible_id'
    AND c2.TABLE_NAME = 'users' AND c2.COLUMN_NAME = @users_pk_col
    AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
);
SET @sql := IF(@fk_exists = 0 AND @users_pk_col IS NOT NULL AND @col_match > 0,
  CONCAT('ALTER TABLE `project_activities_assignments` ADD CONSTRAINT `fk_paa_responsible` FOREIGN KEY (`responsible_id`) REFERENCES `users` (`', @users_pk_col, '`)'),
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

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_type_activities_default'
    AND CONSTRAINT_NAME = 'fk_ptad_phase'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `project_type_activities_default` ADD CONSTRAINT `fk_ptad_phase` FOREIGN KEY (`project_type_id`, `phaseId`) REFERENCES `project_type_phases_default` (`project_type_id`, `shortname`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_type_activities_default'
    AND CONSTRAINT_NAME = 'fk_ptad_activity_type'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `project_type_activities_default` ADD CONSTRAINT `fk_ptad_activity_type` FOREIGN KEY (`project_type_id`, `activity_type_id`) REFERENCES `project_type_activities_type_default` (`project_type_id`, `shortname`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_type_activities_default'
    AND CONSTRAINT_NAME = 'fk_ptad_project_type'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `project_type_activities_default` ADD CONSTRAINT `fk_ptad_project_type` FOREIGN KEY (`project_type_id`) REFERENCES `project_type` (`uuid`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
