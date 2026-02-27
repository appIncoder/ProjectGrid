<?php
declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/util.php';

cors();

$basePath = '/projectgrid/api'; // adapte si nécessaire
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = request_path($basePath);

// Petit route-hint utile en debug
$routesHint = [
  'GET /health',
  'GET /db-check',
  'GET /users',
  'GET /project-types',
  'GET /project-health-defaults',
  'GET /project-types/{id}/defaults',
  'POST /auth/login',
  'POST /projects/{id}/health',
  'POST /projects/{id}/risks',
  'PUT /projects/{id}/risks/{riskId}',
  'POST /projects/{id}/procedure',
  'POST /projects/{id}/rebuild-payload',
  'GET /projects',
  'GET /projects/{id}/risks',
  'GET /projects/{id}',
  'DELETE /projects/{id}',
  'POST /projects',
];

function normalize_project_payload(array $payload): array {
  $matrix = $payload['activityMatrix'] ?? null;
  if (!is_array($matrix)) {
    $legacy = $payload['taskMatrix'] ?? null;
    if (is_array($legacy)) {
      $matrix = $legacy;
    }
  }
  if (!is_array($matrix)) {
    return $payload;
  }

  foreach ($matrix as $activityId => $phaseMap) {
    if (!is_array($phaseMap)) continue;
    foreach ($phaseMap as $phaseId => $activities) {
      if (!is_array($activities)) continue;
      foreach ($activities as $idx => $activity) {
        if (!is_array($activity)) continue;
        foreach (['reporterId', 'accountantId', 'responsibleId'] as $k) {
          if (!array_key_exists($k, $activity)) continue;
          $v = trim((string)($activity[$k] ?? ''));
          if ($v === '') {
            unset($activity[$k]);
          } else {
            $activity[$k] = $v;
          }
        }
        $matrix[$activityId][$phaseId][$idx] = $activity;
      }
    }
  }

  $payload['activityMatrix'] = $matrix;
  unset($payload['taskMatrix']);

  return $payload;
}

function project_default_phases(): array { 
  return ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'];
}

function project_default_activities(): array {
  return [
    'projet' => ['id' => 'projet', 'label' => 'Gestion du projet', 'owner' => '—', 'sequence' => 1],
    'metier' => ['id' => 'metier', 'label' => 'Gestion du métier', 'owner' => '—', 'sequence' => 2],
    'changement' => ['id' => 'changement', 'label' => 'Gestion du changement', 'owner' => '—', 'sequence' => 3],
    'technologie' => ['id' => 'technologie', 'label' => 'Gestion de la technologie', 'owner' => '—', 'sequence' => 4],
  ];
} 

function build_payload_activity_lookup(array $payload): array {
  $lookup = [];
  $tm = $payload['activityMatrix'] ?? ($payload['taskMatrix'] ?? null);
  if (!is_array($tm)) return $lookup;

  foreach ($tm as $activityId => $phaseMap) {
    $aid = trim((string)$activityId);
    if ($aid === '' || !is_array($phaseMap)) continue;
    foreach ($phaseMap as $phaseId => $tasks) {
      $pid = trim((string)$phaseId);
      if ($pid === '' || !is_array($tasks)) continue;
      foreach ($tasks as $task) {
        if (!is_array($task)) continue;
        $taskId = trim((string)($task['id'] ?? ''));
        if ($taskId === '') continue;
        $lookup[$aid][$pid][$taskId] = $task;
      }
    }
  }

  return $lookup;
}

function default_phase_long_name(string $phaseId): string {
  if (preg_match('/^Phase\s*([0-9]+)$/i', trim($phaseId), $m)) {
    return 'Phase ' . $m[1];
  }
  return $phaseId;
}

function resolve_project_phases_schema(PDO $pdo): array {
  static $schema = null;
  if (is_array($schema)) return $schema;

  $columnsStmt = $pdo->query('SHOW COLUMNS FROM project_phases');
  $columns = array_map(
    static fn(array $row): string => (string)($row['Field'] ?? ''),
    $columnsStmt->fetchAll()
  );

  $shortColumn = in_array('shortname', $columns, true) ? 'shortname' : 'phase_id';
  $hasLongName = in_array('longName', $columns, true);
  $schema = [
    'shortColumn' => $shortColumn,
    'hasLongName' => $hasLongName,
  ];

  return $schema;
}

function task_date_to_db_value(?string $input, bool $isEndDate): ?string {
  if ($input === null) return null;
  $raw = trim($input);
  if ($raw === '') return null;

  $ts = strtotime($raw);
  if ($ts === false) return null;

  // If the client sends a date-only end date, normalize it to end-of-day.
  if ($isEndDate && preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) {
    $ts += 86399;
  }

  return date('Y-m-d H:i:s', $ts);
}

function dependency_type_to_db(string $type): string {
  $norm = strtoupper(trim($type));
  if ($norm === 'F2F' || $norm === 'FINISH-TO-FINISH') return 'finish-to-finish';
  if ($norm === 'S2S' || $norm === 'START-TO-START') return 'start-to-start';
  return 'finish-to-start';
}

function dependency_type_from_db(string $type): string {
  $norm = strtolower(trim($type));
  if ($norm === 'finish-to-finish' || $norm === 'f2f') return 'F2F';
  if ($norm === 'start-to-start' || $norm === 's2s') return 'S2S';
  return 'F2S';
}

function table_exists(PDO $pdo, string $table): bool {
  $stmt = $pdo->prepare("
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :table
  ");
  $stmt->execute([':table' => $table]);
  return (int)$stmt->fetchColumn() > 0;
}

function table_columns(PDO $pdo, string $table): array {
  $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}`");
  return array_map(
    static fn(array $row): string => trim((string)($row['Field'] ?? '')),
    $stmt->fetchAll()
  );
}

function resolve_project_data_schema(PDO $pdo): array {
  static $schema = null;
  if (is_array($schema)) return $schema;

  $activityTypesTable = table_exists($pdo, 'project_activitie_types') ? 'project_activitie_types' : 'project_activities';
  $activitiesTable = table_exists($pdo, 'project_activities') ? 'project_activities' : 'project_tasks';
  $assignmentsTable = table_exists($pdo, 'project_activities_assignments') ? 'project_activities_assignments' : 'project_task_assignments';
  $linksTable = table_exists($pdo, 'project_activities_links') ? 'project_activities_links' : 'project_tasks_links';

  $activityTypesCols = table_columns($pdo, $activityTypesTable);
  $activitiesCols = table_columns($pdo, $activitiesTable);
  $assignmentsCols = table_columns($pdo, $assignmentsTable);
  $linksCols = table_columns($pdo, $linksTable);

  $projectTypeActivityTypesDefaultTable = table_exists($pdo, 'project_type_activities_type_default')
    ? 'project_type_activities_type_default'
    : 'project_type_activities_default';
  $projectTypeActivitiesDefaultTable = table_exists($pdo, 'project_type_activities_default')
    ? 'project_type_activities_default'
    : 'project_type_tasks_default';
  $projectTypeActivitiesDefaultCols = table_columns($pdo, $projectTypeActivitiesDefaultTable);

  $schema = [
    'activityTypesTable' => $activityTypesTable,
    'activitiesTable' => $activitiesTable,
    'assignmentsTable' => $assignmentsTable,
    'linksTable' => $linksTable,
    'projectTypeActivityTypesDefaultTable' => $projectTypeActivityTypesDefaultTable,
    'projectTypeActivitiesDefaultTable' => $projectTypeActivitiesDefaultTable,
    'activityTypeIdCol' => in_array('activity_type_id', $activityTypesCols, true) ? 'activity_type_id' : 'activity_id',
    'activityItemTypeIdCol' => in_array('activity_type_id', $activitiesCols, true) ? 'activity_type_id' : 'activity_id',
    'activityItemIdCol' => in_array('activity_id', $activitiesCols, true) ? 'activity_id' : 'task_id',
    'assignTypeIdCol' => in_array('activity_type_id', $assignmentsCols, true) ? 'activity_type_id' : 'activity_id',
    'assignItemIdCol' => in_array('activity_id', $assignmentsCols, true) ? 'activity_id' : 'task_id',
    'depFromCol' => in_array('IdActivityFrom', $linksCols, true) ? 'IdActivityFrom' : 'idTasksFrom',
    'depToCol' => in_array('IdActivityTo', $linksCols, true) ? 'IdActivityTo' : 'idTaskTo',
    'ptadPhaseCol' => in_array('phaseId', $projectTypeActivitiesDefaultCols, true) ? 'phaseId' : 'phase_id',
    'ptadTypeCol' => in_array('activity_type_id', $projectTypeActivitiesDefaultCols, true)
      ? 'activity_type_id'
      : (in_array('activitiesId', $projectTypeActivitiesDefaultCols, true) ? 'activitiesId' : 'activity_id'),
    'ptadItemCol' => in_array('activity_id', $projectTypeActivitiesDefaultCols, true)
      ? 'activity_id'
      : (in_array('shortname', $projectTypeActivitiesDefaultCols, true) ? 'shortname' : 'task_id'),
    'ptadLabelCol' => in_array('longname', $projectTypeActivitiesDefaultCols, true) ? 'longname' : 'label',
  ];

  return $schema;
}

function ensure_project_activity_links_table(PDO $pdo): void {
  static $ready = false;
  if ($ready) return;

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS `project_activities_links` (
      `project_id` uuid NOT NULL,
      `IdActivityFrom` varchar(128) NOT NULL,
      `IdActivityTo` varchar(128) NOT NULL,
      `dependency_type` varchar(32) NOT NULL DEFAULT 'finish-to-start',
      `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
      `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (`project_id`, `IdActivityFrom`, `IdActivityTo`),
      KEY `idx_project_activities_links_to` (`project_id`, `IdActivityTo`),
      KEY `idx_project_activities_links_type` (`dependency_type`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  ");

  $ready = true;
}

function ensure_project_task_links_table(PDO $pdo): void {
  // Compat interne temporaire
  ensure_project_activity_links_table($pdo);
}

function ensure_project_health_default_table(PDO $pdo): void {
  static $ready = false;
  if ($ready) return;

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS `project_health_default` (
      `health_id` uuid NOT NULL DEFAULT uuid(),
      `health_short_name` varchar(64) NOT NULL,
      `health_long_name` varchar(255) NOT NULL,
      `status` varchar(32) NOT NULL DEFAULT 'active',
      `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
      `date_last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (`health_id`),
      UNIQUE KEY `uidx_project_health_default_short_name` (`health_short_name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  ");

  $ready = true;
}

function ensure_project_health_table(PDO $pdo): void {
  static $ready = false;
  if ($ready) return;

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS `project_health` (
      `health_id` uuid NOT NULL DEFAULT uuid(),
      `project_id` uuid NOT NULL,
      `health_short_name` varchar(64) NOT NULL,
      `health_long_name` varchar(255) NOT NULL,
      `description` text DEFAULT NULL,
      `status` varchar(32) NOT NULL DEFAULT 'active',
      `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
      `date_last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (`health_id`),
      UNIQUE KEY `uidx_project_health_project_short` (`project_id`, `health_short_name`),
      KEY `idx_project_health_project` (`project_id`),
      KEY `idx_project_health_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  ");
  $pdo->exec("ALTER TABLE `project_health` ADD COLUMN IF NOT EXISTS `description` text DEFAULT NULL");

  $ready = true;
}

function ensure_project_health_seed_defaults(PDO $pdo): void {
  ensure_project_health_default_table($pdo);
  $pdo->exec("
    INSERT IGNORE INTO `project_health_default` (`health_short_name`, `health_long_name`, `status`) VALUES
    ('Good', 'No known issues', 'active'),
    ('Average', 'Non blocking issues to manage', 'active'),
    ('Bad', 'Severe issues requiring action', 'active'),
    ('Blocked', 'Blocking issues requiring immediate action', 'active')
  ");
}

function ensure_project_health_infra(PDO $pdo): void {
  ensure_project_health_default_table($pdo);
  ensure_project_health_table($pdo);
  ensure_project_health_seed_defaults($pdo);
}

function ensure_project_health_for_project(PDO $pdo, string $projectId): void {
  ensure_project_health_infra($pdo);

  $stmt = $pdo->prepare("
    INSERT IGNORE INTO `project_health` (`project_id`, `health_short_name`, `health_long_name`, `description`, `status`)
    SELECT :project_id, `health_short_name`, `health_long_name`, `health_long_name`, 'active'
    FROM `project_health_default`
    WHERE LOWER(`health_short_name`) = 'good'
  ");
  $stmt->execute([':project_id' => $projectId]);
}

function fetch_project_health_defaults(PDO $pdo): array {
  ensure_project_health_infra($pdo);

  $stmt = $pdo->query("
    SELECT health_id, health_short_name, health_long_name, status, date_created, date_last_updated
    FROM project_health_default
    ORDER BY
      FIELD(LOWER(health_short_name), 'good', 'average', 'bad', 'blocked'),
      health_short_name ASC
  ");

  return array_map(static function (array $r): array {
    return [
      'healthId' => trim((string)($r['health_id'] ?? '')),
      'shortName' => trim((string)($r['health_short_name'] ?? '')),
      'longName' => trim((string)($r['health_long_name'] ?? '')),
      'status' => trim((string)($r['status'] ?? 'active')),
      'dateCreated' => trim((string)($r['date_created'] ?? '')),
      'dateLastUpdated' => trim((string)($r['date_last_updated'] ?? '')),
    ];
  }, $stmt->fetchAll());
}

function set_project_health_active(PDO $pdo, string $projectId, string $healthShortName, ?string $description = null): array {
  ensure_project_health_infra($pdo);
  ensure_project_health_for_project($pdo, $projectId);

  $healthShortName = trim($healthShortName);
  if ($healthShortName === '') {
    throw new InvalidArgumentException('Missing healthShortName');
  }

  $defaultStmt = $pdo->prepare("
    SELECT health_short_name, health_long_name
    FROM project_health_default
    WHERE LOWER(health_short_name) = LOWER(:short_name)
    LIMIT 1
  ");
  $defaultStmt->execute([':short_name' => $healthShortName]);
  $defaultRow = $defaultStmt->fetch();
  if (!$defaultRow) {
    throw new InvalidArgumentException('Unknown health status: ' . $healthShortName);
  }

  $resolvedShortName = trim((string)($defaultRow['health_short_name'] ?? $healthShortName));
  $resolvedLongName = trim((string)($defaultRow['health_long_name'] ?? $resolvedShortName));
  $resolvedDescription = $description !== null && trim($description) !== ''
    ? trim($description)
    : $resolvedLongName;

  $ownsTransaction = !$pdo->inTransaction();
  if ($ownsTransaction) $pdo->beginTransaction();
  try {
    $upsert = $pdo->prepare("
      INSERT INTO project_health (project_id, health_short_name, health_long_name, description, status)
      VALUES (:project_id, :short_name, :long_name, :description, 'active')
      ON DUPLICATE KEY UPDATE
        health_long_name = VALUES(health_long_name),
        description = VALUES(description),
        status = 'active',
        date_last_updated = CURRENT_TIMESTAMP
    ");
    $upsert->execute([
      ':project_id' => $projectId,
      ':short_name' => $resolvedShortName,
      ':long_name' => $resolvedLongName,
      ':description' => $resolvedDescription,
    ]);

    $deactivate = $pdo->prepare("
      UPDATE project_health
      SET status = 'inactive', date_last_updated = CURRENT_TIMESTAMP
      WHERE project_id = :project_id
        AND LOWER(health_short_name) <> LOWER(:short_name)
        AND LOWER(COALESCE(status, 'active')) = 'active'
    ");
    $deactivate->execute([
      ':project_id' => $projectId,
      ':short_name' => $resolvedShortName,
    ]);

    if ($ownsTransaction) $pdo->commit();
  } catch (Throwable $inner) {
    if ($ownsTransaction && $pdo->inTransaction()) $pdo->rollBack();
    throw $inner;
  }

  return fetch_project_health($pdo, $projectId);
}

function detect_active_health_short_name(array $project): ?string {
  $rows = $project['projectHealth'] ?? null;
  if (!is_array($rows)) return null;

  foreach ($rows as $row) {
    if (!is_array($row)) continue;
    $status = strtolower(trim((string)($row['status'] ?? '')));
    if ($status !== 'active') continue;
    $short = trim((string)($row['shortName'] ?? ''));
    if ($short !== '') return $short;
  }

  return null;
}

function fetch_project_health(PDO $pdo, string $projectId): array {
  ensure_project_health_for_project($pdo, $projectId);

  $stmt = $pdo->prepare("
    SELECT health_id, health_short_name, health_long_name, description, status, date_created, date_last_updated
    FROM project_health
    WHERE project_id = :id
    ORDER BY
      FIELD(LOWER(health_short_name), 'good', 'average', 'bad', 'blocked'),
      health_short_name ASC
  ");
  $stmt->execute([':id' => $projectId]);

  return array_map(static function (array $r): array {
    return [
      'healthId' => trim((string)($r['health_id'] ?? '')),
      'shortName' => trim((string)($r['health_short_name'] ?? '')),
      'longName' => trim((string)($r['health_long_name'] ?? '')),
      'description' => trim((string)($r['description'] ?? '')),
      'status' => trim((string)($r['status'] ?? 'active')),
      'dateCreated' => trim((string)($r['date_created'] ?? '')),
      'dateLastUpdated' => trim((string)($r['date_last_updated'] ?? '')),
    ];
  }, $stmt->fetchAll());
}

function generate_uuid_v4(): string {
  $bytes = random_bytes(16);
  $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
  $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
  $hex = bin2hex($bytes);
  return sprintf(
    '%s-%s-%s-%s-%s',
    substr($hex, 0, 8),
    substr($hex, 8, 4),
    substr($hex, 12, 4),
    substr($hex, 16, 4),
    substr($hex, 20, 12)
  );
}

function normalize_project_risk_status(string $raw): string {
  $norm = strtoupper(trim($raw));
  if ($norm === 'OPEN') return 'Open';
  if ($norm === 'IN_PROGRESS' || $norm === 'IN PROGRESS') return 'In Progress';
  if ($norm === 'ON_HOLD' || $norm === 'ON HOLD') return 'On Hold';
  if ($norm === 'RESOLVED') return 'Resolved';
  if ($norm === 'CLOSED') return 'Closed';
  return 'Open';
}

function project_risk_short_name(string $longName): string {
  $clean = trim(preg_replace('/[^[:alnum:]\s]+/u', ' ', $longName) ?? '');
  if ($clean === '') return 'RSK';

  $parts = preg_split('/\s+/u', $clean, -1, PREG_SPLIT_NO_EMPTY) ?: [];
  $short = '';
  foreach ($parts as $part) {
    $short .= strtoupper(substr($part, 0, 1));
    if (strlen($short) >= 3) break;
  }

  if (strlen($short) < 3) {
    $fallback = strtoupper(preg_replace('/[^[:alnum:]]+/u', '', $clean) ?? '');
    $need = 3 - strlen($short);
    $short .= substr($fallback, 0, $need);
  }

  if (strlen($short) < 3) {
    $short = str_pad($short, 3, 'X');
  }

  return substr($short, 0, 3);
}

function ensure_project_risks_table(PDO $pdo): void {
  static $ready = false;
  if ($ready) return;

  $pdo->exec("
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
      PRIMARY KEY (`projectId`, `riskId`),
      KEY `idx_project_risks_status` (`status`),
      KEY `idx_project_risks_risk` (`riskId`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  ");

  $pdo->exec("
    ALTER TABLE `project_risks`
      ADD COLUMN IF NOT EXISTS `short_name` varchar(16) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS `long_name` varchar(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS `status` varchar(16) NOT NULL DEFAULT 'Open',
      ADD COLUMN IF NOT EXISTS `criticity` varchar(32) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS `probability` varchar(32) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
      ADD COLUMN IF NOT EXISTS `date_last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      ADD COLUMN IF NOT EXISTS `remaining_risk` uuid DEFAULT NULL
  ");
  $pdo->exec("CREATE INDEX IF NOT EXISTS `idx_project_risks_status` ON `project_risks` (`status`)");
  $pdo->exec("CREATE INDEX IF NOT EXISTS `idx_project_risks_risk` ON `project_risks` (`riskId`)");
  $pdo->exec("CREATE INDEX IF NOT EXISTS `idx_project_risks_remaining` ON `project_risks` (`remaining_risk`)");

  $pdo->exec("
    UPDATE `project_risks` pr
    LEFT JOIN `risks` r ON r.`uuid` = pr.`riskId`
    SET
      pr.`status` = CASE
        WHEN LOWER(TRIM(COALESCE(pr.`status`, ''))) IN ('open', 'active') THEN 'Open'
        WHEN LOWER(TRIM(COALESCE(pr.`status`, ''))) IN ('in progress', 'in_progress', 'inprogress') THEN 'In Progress'
        WHEN LOWER(TRIM(COALESCE(pr.`status`, ''))) IN ('closed', 'resolved') THEN 'Closed'
        ELSE 'Open'
      END,
      pr.`probability` = COALESCE(NULLIF(pr.`probability`, ''), r.`probability`),
      pr.`criticity` = COALESCE(NULLIF(pr.`criticity`, ''), r.`criticity`),
      pr.`long_name` = COALESCE(NULLIF(pr.`long_name`, ''), r.`name`),
      pr.`short_name` = COALESCE(
        NULLIF(pr.`short_name`, ''),
        UPPER(LEFT(REPLACE(REPLACE(COALESCE(NULLIF(pr.`long_name`, ''), r.`name`), ' ', ''), '-', ''), 3))
      )
  ");

  // Correction FK legacy: fk_project_risks_project peut pointer vers `projects_`.
  $fkProjectExistsStmt = $pdo->query("
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'project_risks'
      AND CONSTRAINT_NAME = 'fk_project_risks_project'
  ");
  $fkProjectExists = (int)$fkProjectExistsStmt->fetchColumn();

  if ($fkProjectExists > 0) {
    $fkProjectRefStmt = $pdo->query("
      SELECT kcu.REFERENCED_TABLE_NAME
      FROM information_schema.KEY_COLUMN_USAGE kcu
      WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
        AND kcu.TABLE_NAME = 'project_risks'
        AND kcu.CONSTRAINT_NAME = 'fk_project_risks_project'
      LIMIT 1
    ");
    $fkProjectRefTable = trim((string)$fkProjectRefStmt->fetchColumn());
    if ($fkProjectRefTable !== '' && $fkProjectRefTable !== 'projects') {
      $pdo->exec("ALTER TABLE `project_risks` DROP FOREIGN KEY `fk_project_risks_project`");
      $fkProjectExists = 0;
    }
  }

  if ($fkProjectExists === 0) {
    $fkProjectColMatchStmt = $pdo->query("
      SELECT COUNT(*)
      FROM information_schema.COLUMNS c1
      JOIN information_schema.COLUMNS c2
        ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
      WHERE c1.TABLE_SCHEMA = DATABASE()
        AND c1.TABLE_NAME = 'project_risks'
        AND c1.COLUMN_NAME = 'projectId'
        AND c2.TABLE_NAME = 'projects'
        AND c2.COLUMN_NAME = 'id'
        AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
    ");
    $fkProjectColMatch = (int)$fkProjectColMatchStmt->fetchColumn();
    if ($fkProjectColMatch > 0) {
      $pdo->exec("
        ALTER TABLE `project_risks`
        ADD CONSTRAINT `fk_project_risks_project`
        FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`)
      ");
    }
  }

  // Correction FK legacy: fk_project_risks_risk peut pointer vers une mauvaise table/colonne.
  $fkRiskExistsStmt = $pdo->query("
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'project_risks'
      AND CONSTRAINT_NAME = 'fk_project_risks_risk'
  ");
  $fkRiskExists = (int)$fkRiskExistsStmt->fetchColumn();

  if ($fkRiskExists > 0) {
    $fkRiskRefStmt = $pdo->query("
      SELECT kcu.REFERENCED_TABLE_NAME
      FROM information_schema.KEY_COLUMN_USAGE kcu
      WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
        AND kcu.TABLE_NAME = 'project_risks'
        AND kcu.CONSTRAINT_NAME = 'fk_project_risks_risk'
      LIMIT 1
    ");
    $fkRiskRefTable = trim((string)$fkRiskRefStmt->fetchColumn());
    if ($fkRiskRefTable !== '' && $fkRiskRefTable !== 'risks') {
      $pdo->exec("ALTER TABLE `project_risks` DROP FOREIGN KEY `fk_project_risks_risk`");
      $fkRiskExists = 0;
    }
  }

  if ($fkRiskExists === 0) {
    $fkRiskColMatchStmt = $pdo->query("
      SELECT COUNT(*)
      FROM information_schema.COLUMNS c1
      JOIN information_schema.COLUMNS c2
        ON c2.TABLE_SCHEMA = c1.TABLE_SCHEMA
      WHERE c1.TABLE_SCHEMA = DATABASE()
        AND c1.TABLE_NAME = 'project_risks'
        AND c1.COLUMN_NAME = 'riskId'
        AND c2.TABLE_NAME = 'risks'
        AND c2.COLUMN_NAME = 'uuid'
        AND c1.COLUMN_TYPE = c2.COLUMN_TYPE
    ");
    $fkRiskColMatch = (int)$fkRiskColMatchStmt->fetchColumn();
    if ($fkRiskColMatch > 0) {
      $pdo->exec("
        ALTER TABLE `project_risks`
        ADD CONSTRAINT `fk_project_risks_risk`
        FOREIGN KEY (`riskId`) REFERENCES `risks` (`uuid`)
      ");
    }
  }

  $ready = true;
}

function create_project_risk(PDO $pdo, string $projectId, array $body): array {
  ensure_project_risks_table($pdo);

  $projectId = trim($projectId);
  if ($projectId === '') throw new InvalidArgumentException('Missing project id');
  $existsStmt = $pdo->prepare('SELECT COUNT(*) FROM `projects` WHERE `id` = :id');
  $existsStmt->execute([':id' => $projectId]);
  if ((int)$existsStmt->fetchColumn() === 0) {
    throw new InvalidArgumentException('Project not found');
  }

  $title = trim((string)($body['title'] ?? $body['name'] ?? ''));
  $description = trim((string)($body['description'] ?? ''));
  $probability = trim((string)($body['probability'] ?? ''));
  $criticity = trim((string)($body['criticity'] ?? $body['frequency'] ?? ''));
  $status = normalize_project_risk_status((string)($body['status'] ?? 'Open'));
  $remainingRisk = normalize_id((string)($body['remainingRiskId'] ?? ''));
  if ($remainingRisk === '') $remainingRisk = null;
  $longName = $title;
  $shortName = project_risk_short_name($longName);

  if ($title === '') throw new InvalidArgumentException('Missing risk title');
  if ($probability === '') throw new InvalidArgumentException('Missing risk probability');
  if ($criticity === '') throw new InvalidArgumentException('Missing risk criticity');

  $riskId = generate_uuid_v4();
  $ownsTransaction = !$pdo->inTransaction();
  if ($ownsTransaction) $pdo->beginTransaction();
  try {
    $insertRisk = $pdo->prepare("
      INSERT INTO `risks` (`uuid`, `name`, `description`, `probability`, `criticity`, `date_created`)
      VALUES (:uuid, :name, :description, :probability, :criticity, CURRENT_TIMESTAMP)
    ");
    $insertRisk->execute([
      ':uuid' => $riskId,
      ':name' => $title,
      ':description' => $description !== '' ? $description : null,
      ':probability' => $probability,
      ':criticity' => $criticity,
    ]);

    $insertProjectRisk = $pdo->prepare("
      INSERT INTO `project_risks`
      (`projectId`, `riskId`, `short_name`, `long_name`, `status`, `criticity`, `probability`, `remaining_risk`, `date_created`, `date_last_updated`)
      VALUES (:projectId, :riskId, :shortName, :longName, :status, :criticity, :probability, :remainingRisk, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ");
    $insertProjectRisk->execute([
      ':projectId' => $projectId,
      ':riskId' => $riskId,
      ':shortName' => $shortName,
      ':longName' => $longName,
      ':status' => $status,
      ':criticity' => $criticity,
      ':probability' => $probability,
      ':remainingRisk' => $remainingRisk,
    ]);

    if ($ownsTransaction) $pdo->commit();
  } catch (Throwable $inner) {
    if ($ownsTransaction && $pdo->inTransaction()) $pdo->rollBack();
    throw $inner;
  }

  return [
    'projectId' => $projectId,
    'riskId' => $riskId,
    'shortName' => $shortName,
    'longName' => $longName,
    'title' => $title,
    'description' => $description,
    'probability' => $probability,
    'criticity' => $criticity,
    'status' => $status,
    'dateCreated' => date('Y-m-d H:i:s'),
    'dateLastUpdated' => date('Y-m-d H:i:s'),
    'remainingRiskId' => $remainingRisk ?? '',
  ];
}

function update_project_risk(PDO $pdo, string $projectId, string $riskId, array $body): array {
  ensure_project_risks_table($pdo);

  $projectId = trim($projectId);
  $riskId = trim($riskId);
  if ($projectId === '') throw new InvalidArgumentException('Missing project id');
  if ($riskId === '') throw new InvalidArgumentException('Missing risk id');

  $currentStmt = $pdo->prepare("
    SELECT
      pr.`projectId` AS `projectId`,
      pr.`riskId` AS `riskId`,
      pr.`short_name` AS `short_name`,
      pr.`long_name` AS `long_name`,
      pr.`status` AS `status`,
      pr.`probability` AS `probability`,
      pr.`criticity` AS `criticity`,
      pr.`remaining_risk` AS `remaining_risk`,
      r.`name` AS `risk_name`,
      r.`description` AS `risk_description`
    FROM `project_risks` pr
    LEFT JOIN `risks` r
      ON r.`uuid` = pr.`riskId`
    WHERE pr.`projectId` = :projectId
      AND pr.`riskId` = :riskId
    LIMIT 1
  ");
  $currentStmt->execute([
    ':projectId' => $projectId,
    ':riskId' => $riskId,
  ]);
  $current = $currentStmt->fetch();
  if (!$current) {
    throw new InvalidArgumentException('Project risk not found');
  }

  $hasLongName = array_key_exists('longName', $body) || array_key_exists('title', $body);
  $hasDescription = array_key_exists('description', $body);
  $hasProbability = array_key_exists('probability', $body);
  $hasCriticity = array_key_exists('criticity', $body) || array_key_exists('frequency', $body);
  $hasStatus = array_key_exists('status', $body);
  $hasRemainingRisk = array_key_exists('remainingRiskId', $body);

  $longName = trim((string)($current['long_name'] ?? $current['risk_name'] ?? ''));
  if ($hasLongName) {
    $longName = trim((string)($body['longName'] ?? $body['title'] ?? ''));
  }
  if ($longName === '') {
    throw new InvalidArgumentException('Missing longName');
  }

  $description = trim((string)($current['risk_description'] ?? ''));
  if ($hasDescription) {
    $description = trim((string)($body['description'] ?? ''));
  }

  $probability = trim((string)($current['probability'] ?? ''));
  if ($hasProbability) {
    $probability = trim((string)($body['probability'] ?? ''));
  }
  if ($probability === '') {
    throw new InvalidArgumentException('Missing risk probability');
  }

  $criticity = trim((string)($current['criticity'] ?? ''));
  if ($hasCriticity) {
    $criticity = trim((string)($body['criticity'] ?? $body['frequency'] ?? ''));
  }
  if ($criticity === '') {
    throw new InvalidArgumentException('Missing risk criticity');
  }

  $status = trim((string)($current['status'] ?? 'Open'));
  if ($hasStatus) {
    $status = normalize_project_risk_status((string)($body['status'] ?? 'Open'));
  } else {
    $status = normalize_project_risk_status($status);
  }

  $remainingRisk = normalize_id((string)($current['remaining_risk'] ?? ''));
  if ($hasRemainingRisk) {
    $remainingRisk = normalize_id((string)($body['remainingRiskId'] ?? ''));
  }
  if ($remainingRisk === '') $remainingRisk = null;

  $shortName = project_risk_short_name($longName);

  $ownsTransaction = !$pdo->inTransaction();
  if ($ownsTransaction) $pdo->beginTransaction();
  try {
    $updateRisk = $pdo->prepare("
      UPDATE `risks`
      SET
        `name` = :name,
        `description` = :description,
        `probability` = :probability,
        `criticity` = :criticity
      WHERE `uuid` = :riskId
    ");
    $updateRisk->execute([
      ':name' => $longName,
      ':description' => $description !== '' ? $description : null,
      ':probability' => $probability,
      ':criticity' => $criticity,
      ':riskId' => $riskId,
    ]);

    $updateProjectRisk = $pdo->prepare("
      UPDATE `project_risks`
      SET
        `short_name` = :shortName,
        `long_name` = :longName,
        `status` = :status,
        `criticity` = :criticity,
        `probability` = :probability,
        `remaining_risk` = :remainingRisk,
        `date_last_updated` = CURRENT_TIMESTAMP
      WHERE `projectId` = :projectId
        AND `riskId` = :riskId
    ");
    $updateProjectRisk->execute([
      ':shortName' => $shortName,
      ':longName' => $longName,
      ':status' => $status,
      ':criticity' => $criticity,
      ':probability' => $probability,
      ':remainingRisk' => $remainingRisk,
      ':projectId' => $projectId,
      ':riskId' => $riskId,
    ]);

    if ($ownsTransaction) $pdo->commit();
  } catch (Throwable $inner) {
    if ($ownsTransaction && $pdo->inTransaction()) $pdo->rollBack();
    throw $inner;
  }

  $rows = fetch_project_risks($pdo, $projectId);
  foreach ($rows as $row) {
    if (trim((string)($row['riskId'] ?? '')) !== $riskId) continue;
    return $row;
  }

  throw new InvalidArgumentException('Project risk not found');
}

function fetch_project_risks(PDO $pdo, string $projectId): array {
  ensure_project_risks_table($pdo);

  $stmt = $pdo->prepare("
    SELECT
      pr.`projectId` AS `projectId`,
      pr.`riskId` AS `riskId`,
      pr.`short_name` AS `short_name`,
      pr.`long_name` AS `long_name`,
      r.`name` AS `title`,
      r.`description` AS `description`,
      pr.`probability` AS `probability`,
      pr.`criticity` AS `criticity`,
      pr.`status` AS `status`,
      pr.`date_created` AS `date_created`,
      pr.`date_last_updated` AS `date_last_updated`,
      pr.`remaining_risk` AS `remaining_risk`
    FROM `project_risks` pr
    LEFT JOIN `risks` r
      ON r.`uuid` = pr.`riskId`
    WHERE pr.`projectId` = :projectId
    ORDER BY
      FIELD(LOWER(COALESCE(pr.`criticity`, '')), 'critical', 'high', 'medium', 'low') ASC,
      pr.`date_created` DESC
  ");
  $stmt->execute([':projectId' => $projectId]);

  return array_map(static function (array $r): array {
    return [
      'projectId' => trim((string)($r['projectId'] ?? '')),
      'riskId' => trim((string)($r['riskId'] ?? '')),
      'shortName' => trim((string)($r['short_name'] ?? '')),
      'longName' => trim((string)($r['long_name'] ?? $r['title'] ?? '')),
      'title' => trim((string)($r['long_name'] ?? $r['title'] ?? '')),
      'description' => trim((string)($r['description'] ?? '')),
      'probability' => trim((string)($r['probability'] ?? '')),
      'criticity' => trim((string)($r['criticity'] ?? '')),
      'status' => trim((string)($r['status'] ?? 'Open')),
      'dateCreated' => trim((string)($r['date_created'] ?? '')),
      'dateLastUpdated' => trim((string)($r['date_last_updated'] ?? '')),
      'remainingRiskId' => trim((string)($r['remaining_risk'] ?? '')),
    ];
  }, $stmt->fetchAll());
}

function fetch_project_dependencies(PDO $pdo, string $projectId): array {
  ensure_project_activity_links_table($pdo);
  $schema = resolve_project_data_schema($pdo);
  $linksTable = $schema['linksTable'];
  $depFromCol = $schema['depFromCol'];
  $depToCol = $schema['depToCol'];

  $stmt = $pdo->prepare("
    SELECT `{$depFromCol}` AS dep_from, `{$depToCol}` AS dep_to, dependency_type
    FROM `{$linksTable}`
    WHERE project_id = :id
    ORDER BY `{$depFromCol}` ASC, `{$depToCol}` ASC
  ");
  $stmt->execute([':id' => $projectId]);

  return array_map(static function (array $r): array {
    return [
      'fromId' => trim((string)($r['dep_from'] ?? '')),
      'toId' => trim((string)($r['dep_to'] ?? '')),
      'type' => dependency_type_from_db((string)($r['dependency_type'] ?? 'finish-to-start')),
    ];
  }, $stmt->fetchAll());
}

function fetch_project_from_tables(PDO $pdo, string $projectId): ?array {
  $stmt = $pdo->prepare('SELECT id, name, description, payload FROM projects WHERE id = :id LIMIT 1');
  $stmt->execute([':id' => $projectId]);
  $row = $stmt->fetch();
  if (!$row) return null;

  $payloadData = [];
  $payloadRaw = (string)($row['payload'] ?? '');
  if ($payloadRaw !== '') {
    $decoded = json_decode($payloadRaw, true);
    if (is_array($decoded)) $payloadData = $decoded;
  }
  $payloadTaskLookup = build_payload_activity_lookup($payloadData);
  $schema = resolve_project_data_schema($pdo);
  $activityTypesTable = $schema['activityTypesTable'];
  $activitiesTable = $schema['activitiesTable'];
  $assignmentsTable = $schema['assignmentsTable'];
  $activityTypeIdCol = $schema['activityTypeIdCol'];
  $activityItemTypeIdCol = $schema['activityItemTypeIdCol'];
  $activityItemIdCol = $schema['activityItemIdCol'];
  $assignTypeIdCol = $schema['assignTypeIdCol'];
  $assignItemIdCol = $schema['assignItemIdCol'];

  $detail = [
    'id' => (string)$row['id'],
    'name' => (string)($row['name'] ?? ''),
    'description' => (string)($row['description'] ?? ''),
    'phases' => [],
    'phaseDefinitions' => [],
    'activities' => [],
    'activityMatrix' => [],
    'projectHealth' => [],
    'projectRisks' => [],
  ];

  $phaseSchema = resolve_project_phases_schema($pdo);
  $phaseShortColumn = $phaseSchema['shortColumn'];
  $phaseLongExpr = $phaseSchema['hasLongName'] ? '`longName`' : 'NULL';
  $phaseStmt = $pdo->prepare("
    SELECT `{$phaseShortColumn}` AS `shortname`, {$phaseLongExpr} AS `longname`
    FROM project_phases
    WHERE project_id = :id
    ORDER BY phase_order ASC, `{$phaseShortColumn}` ASC
  ");
  $phaseStmt->execute([':id' => $projectId]);
  foreach ($phaseStmt->fetchAll() as $p) {
    $phaseId = trim((string)($p['shortname'] ?? ''));
    if ($phaseId === '') continue;
    $phaseLabel = trim((string)($p['longname'] ?? ''));
    if ($phaseLabel === '') $phaseLabel = default_phase_long_name($phaseId);
    $detail['phases'][] = $phaseId;
    $detail['phaseDefinitions'][$phaseId] = [
      'id' => $phaseId,
      'label' => $phaseLabel,
    ];
  }
  if (!$detail['phases']) {
    $detail['phases'] = project_default_phases();
    foreach ($detail['phases'] as $phaseId) {
      $detail['phaseDefinitions'][$phaseId] = [
        'id' => $phaseId,
        'label' => default_phase_long_name($phaseId),
      ];
    }
  }

  $actStmt = $pdo->prepare("
    SELECT `{$activityTypeIdCol}` AS activity_type_id, label, owner_name, sequence
    FROM `{$activityTypesTable}`
    WHERE project_id = :id
    ORDER BY (sequence IS NULL) ASC, sequence ASC, `{$activityTypeIdCol}` ASC
  ");
  $actStmt->execute([':id' => $projectId]);
  foreach ($actStmt->fetchAll() as $a) {
    $activityId = trim((string)($a['activity_type_id'] ?? ''));
    if ($activityId === '') continue;
    $sequenceRaw = $a['sequence'] ?? null;
    $sequence = is_numeric($sequenceRaw) ? (int)$sequenceRaw : null;
    $detail['activities'][$activityId] = [
      'id' => $activityId,
      'label' => trim((string)($a['label'] ?? $activityId)),
      'owner' => trim((string)($a['owner_name'] ?? '—')),
      'sequence' => $sequence,
    ];
  }
  if (!$detail['activities']) {
    $detail['activities'] = project_default_activities();
  }

  foreach ($detail['activities'] as $activityId => $_a) {
    $detail['activityMatrix'][$activityId] = [];
    foreach ($detail['phases'] as $phaseId) {
      $detail['activityMatrix'][$activityId][$phaseId] = [];
    }
  }

  $taskSql = "
    SELECT
      t.`{$activityItemTypeIdCol}` AS activity_type_id,
      t.phase_id,
      t.`{$activityItemIdCol}` AS activity_id,
      t.label, t.startdate, t.enddate, t.status,
      a.reporter_id, a.accountant_id, a.responsible_id
    FROM `{$activitiesTable}` t
    LEFT JOIN `{$assignmentsTable}` a
      ON a.project_id = t.project_id
     AND a.`{$assignTypeIdCol}` = t.`{$activityItemTypeIdCol}`
     AND a.phase_id = t.phase_id
     AND a.`{$assignItemIdCol}` = t.`{$activityItemIdCol}`
    WHERE t.project_id = :id
    ORDER BY t.`{$activityItemTypeIdCol}` ASC, t.phase_id ASC, t.`{$activityItemIdCol}` ASC
  ";
  $taskStmt = $pdo->prepare($taskSql);
  $taskStmt->execute([':id' => $projectId]);

  foreach ($taskStmt->fetchAll() as $t) {
    $activityId = trim((string)($t['activity_type_id'] ?? ''));
    $phaseId = trim((string)($t['phase_id'] ?? ''));
    $taskId = trim((string)($t['activity_id'] ?? ''));
    if ($activityId === '' || $phaseId === '' || $taskId === '') continue;

    if (!isset($detail['activities'][$activityId])) {
      $detail['activities'][$activityId] = ['id' => $activityId, 'label' => $activityId, 'owner' => '—', 'sequence' => null];
      $detail['activityMatrix'][$activityId] = [];
    }
    if (!in_array($phaseId, $detail['phases'], true)) {
      $detail['phases'][] = $phaseId;
    }
    if (!isset($detail['phaseDefinitions'][$phaseId])) {
      $detail['phaseDefinitions'][$phaseId] = [
        'id' => $phaseId,
        'label' => default_phase_long_name($phaseId),
      ];
    }
    if (!isset($detail['activityMatrix'][$activityId][$phaseId])) {
      $detail['activityMatrix'][$activityId][$phaseId] = [];
    }

    $task = [
      'id' => $taskId,
      'label' => (string)($t['label'] ?? $taskId),
      'status' => (string)($t['status'] ?? 'todo'),
    ];
    $startDate = trim((string)($t['startdate'] ?? ''));
    $endDate = trim((string)($t['enddate'] ?? ''));
    if ($startDate !== '') {
      $startTs = strtotime($startDate);
      if ($startTs !== false) $task['startDate'] = date('Y-m-d', $startTs);
    }
    if ($endDate !== '') {
      $endTs = strtotime($endDate);
      if ($endTs !== false) $task['endDate'] = date('Y-m-d', $endTs);
    }

    $reporter = trim((string)($t['reporter_id'] ?? ''));
    $accountant = trim((string)($t['accountant_id'] ?? ''));
    $responsible = trim((string)($t['responsible_id'] ?? ''));
    if ($reporter !== '') $task['reporterId'] = $reporter;
    if ($accountant !== '') $task['accountantId'] = $accountant;
    if ($responsible !== '') $task['responsibleId'] = $responsible;

    $overlay = $payloadTaskLookup[$activityId][$phaseId][$taskId] ?? null;
    if (is_array($overlay)) {
      foreach (['category', 'phase'] as $k) {
        if (!array_key_exists($k, $overlay)) continue;
        $v = trim((string)($overlay[$k] ?? ''));
        if ($v !== '') $task[$k] = $v;
      }
      if (isset($overlay['constraints']) && is_array($overlay['constraints'])) {
        $task['constraints'] = $overlay['constraints'];
      }
    }

    $detail['activityMatrix'][$activityId][$phaseId][] = $task;
  }

  foreach (array_keys($detail['activities']) as $activityId) {
    if (!isset($detail['activityMatrix'][$activityId])) $detail['activityMatrix'][$activityId] = [];
    foreach ($detail['phases'] as $phaseId) {
      if (!isset($detail['activityMatrix'][$activityId][$phaseId])) {
        $detail['activityMatrix'][$activityId][$phaseId] = [];
      }
    }
  }

  $detail['ganttDependencies'] = fetch_project_dependencies($pdo, $projectId);
  $detail['projectHealth'] = fetch_project_health($pdo, $projectId);
  $detail['projectRisks'] = fetch_project_risks($pdo, $projectId);

  // Compat legacy consumers
  $detail['taskMatrix'] = $detail['activityMatrix'];
  return $detail;
}

function persist_project_tables(PDO $pdo, array $body, string $projectId): void {
  $phases = [];
  if (isset($body['phases']) && is_array($body['phases'])) {
    foreach ($body['phases'] as $p) {
      $phaseId = trim((string)$p);
      if ($phaseId !== '' && !in_array($phaseId, $phases, true)) $phases[] = $phaseId;
    }
  }
  if (!$phases) $phases = project_default_phases();
  $rawPhaseDefinitions = (isset($body['phaseDefinitions']) && is_array($body['phaseDefinitions']))
    ? $body['phaseDefinitions']
    : [];

  $activities = [];
  if (isset($body['activities']) && is_array($body['activities'])) {
    foreach ($body['activities'] as $activityId => $def) {
      $aid = trim((string)$activityId);
      if ($aid === '') continue;
      $activities[$aid] = [
        'id' => $aid,
        'label' => trim((string)($def['label'] ?? $aid)),
        'owner' => trim((string)($def['owner'] ?? '—')),
        'sequence' => isset($def['sequence']) && is_numeric($def['sequence']) ? (int)$def['sequence'] : null,
      ];
    }
  }
  if (!$activities) $activities = project_default_activities();

  $activityMatrix = (isset($body['activityMatrix']) && is_array($body['activityMatrix']))
    ? $body['activityMatrix']
    : ((isset($body['taskMatrix']) && is_array($body['taskMatrix'])) ? $body['taskMatrix'] : []);
  $rawDependencies = (isset($body['ganttDependencies']) && is_array($body['ganttDependencies']))
    ? $body['ganttDependencies']
    : [];
  $schema = resolve_project_data_schema($pdo);
  $activityTypesTable = $schema['activityTypesTable'];
  $activitiesTable = $schema['activitiesTable'];
  $assignmentsTable = $schema['assignmentsTable'];
  $linksTable = $schema['linksTable'];
  $activityTypeIdCol = $schema['activityTypeIdCol'];
  $activityItemTypeIdCol = $schema['activityItemTypeIdCol'];
  $activityItemIdCol = $schema['activityItemIdCol'];
  $assignTypeIdCol = $schema['assignTypeIdCol'];
  $assignItemIdCol = $schema['assignItemIdCol'];
  $depFromCol = $schema['depFromCol'];
  $depToCol = $schema['depToCol'];

  ensure_project_activity_links_table($pdo);
  $pdo->prepare("DELETE FROM `{$linksTable}` WHERE project_id = :id")->execute([':id' => $projectId]);
  $pdo->prepare("DELETE FROM `{$assignmentsTable}` WHERE project_id = :id")->execute([':id' => $projectId]);
  $pdo->prepare("DELETE FROM `{$activitiesTable}` WHERE project_id = :id")->execute([':id' => $projectId]);
  $pdo->prepare("DELETE FROM `{$activityTypesTable}` WHERE project_id = :id")->execute([':id' => $projectId]);
  $pdo->prepare('DELETE FROM project_phases WHERE project_id = :id')->execute([':id' => $projectId]);

  $phaseSchema = resolve_project_phases_schema($pdo);
  $phaseShortColumn = $phaseSchema['shortColumn'];
  $phaseInsertSql = $phaseSchema['hasLongName']
    ? "INSERT INTO project_phases (project_id, `{$phaseShortColumn}`, longName, phase_order) VALUES (:project_id, :phase_id, :long_name, :phase_order)"
    : "INSERT INTO project_phases (project_id, `{$phaseShortColumn}`, phase_order) VALUES (:project_id, :phase_id, :phase_order)";
  $phaseInsert = $pdo->prepare($phaseInsertSql);
  foreach ($phases as $idx => $phaseId) {
    $phaseLabel = trim((string)($rawPhaseDefinitions[$phaseId]['label'] ?? ''));
    if ($phaseLabel === '') $phaseLabel = default_phase_long_name($phaseId);
    $params = [
      ':project_id' => $projectId,
      ':phase_id' => $phaseId,
      ':phase_order' => $idx + 1,
    ];
    if ($phaseSchema['hasLongName']) {
      $params[':long_name'] = $phaseLabel;
    }
    $phaseInsert->execute($params);
  }

  $activityInsert = $pdo->prepare("
    INSERT INTO `{$activityTypesTable}` (project_id, `{$activityTypeIdCol}`, label, owner_name, sequence)
    VALUES (:project_id, :activity_type_id, :label, :owner, :sequence)
  ");
  foreach ($activities as $activity) {
    $activityInsert->execute([
      ':project_id' => $projectId,
      ':activity_type_id' => $activity['id'],
      ':label' => $activity['label'],
      ':owner' => $activity['owner'],
      ':sequence' => $activity['sequence'] ?? null,
    ]);
  }

  $taskInsert = $pdo->prepare("
    INSERT INTO `{$activitiesTable}` (project_id, `{$activityItemTypeIdCol}`, phase_id, `{$activityItemIdCol}`, label, startdate, enddate, status)
    VALUES (:project_id, :activity_type_id, :phase_id, :activity_id, :label, COALESCE(:startdate, CURRENT_TIMESTAMP), COALESCE(:enddate, CURRENT_TIMESTAMP + INTERVAL 5 DAY), :status)
  ");
  $assignInsert = $pdo->prepare("
    INSERT INTO `{$assignmentsTable}` (project_id, `{$assignTypeIdCol}`, phase_id, `{$assignItemIdCol}`, reporter_id, accountant_id, responsible_id)
    VALUES (:project_id, :activity_type_id, :phase_id, :activity_id, :reporter_id, :accountant_id, :responsible_id)
  ");
  $linkInsert = $pdo->prepare("
    INSERT INTO `{$linksTable}` (project_id, `{$depFromCol}`, `{$depToCol}`, dependency_type)
    VALUES (:project_id, :from_id, :to_id, :dependency_type)
    ON DUPLICATE KEY UPDATE
      dependency_type = VALUES(dependency_type),
      updated_at = CURRENT_TIMESTAMP
  ");

  $existingTaskIds = [];

  foreach ($activityMatrix as $activityId => $phaseMap) {
    $aid = trim((string)$activityId);
    if ($aid === '' || !is_array($phaseMap)) continue;

    foreach ($phaseMap as $phaseId => $tasks) {
      $pid = trim((string)$phaseId);
      if ($pid === '' || !is_array($tasks)) continue;

      foreach ($tasks as $task) {
        if (!is_array($task)) continue;
        $taskId = trim((string)($task['id'] ?? ''));
        if ($taskId === '') continue;

        $taskInsert->execute([
          ':project_id' => $projectId,
          ':activity_type_id' => $aid,
          ':phase_id' => $pid,
          ':activity_id' => $taskId,
          ':label' => trim((string)($task['label'] ?? $taskId)),
          ':startdate' => task_date_to_db_value(isset($task['startDate']) ? (string)$task['startDate'] : null, false),
          ':enddate' => task_date_to_db_value(isset($task['endDate']) ? (string)$task['endDate'] : null, true),
          ':status' => trim((string)($task['status'] ?? 'todo')),
        ]);
        $existingTaskIds[$taskId] = true;

        $reporter = trim((string)($task['reporterId'] ?? ''));
        $accountant = trim((string)($task['accountantId'] ?? ''));
        $responsible = trim((string)($task['responsibleId'] ?? ''));
        if ($reporter !== '' || $accountant !== '' || $responsible !== '') {
          $assignInsert->execute([
            ':project_id' => $projectId,
            ':activity_type_id' => $aid,
            ':phase_id' => $pid,
            ':activity_id' => $taskId,
            ':reporter_id' => $reporter !== '' ? $reporter : null,
            ':accountant_id' => $accountant !== '' ? $accountant : null,
            ':responsible_id' => $responsible !== '' ? $responsible : null,
          ]);
        }
      }
    }
  }

  foreach ($rawDependencies as $dep) {
    if (!is_array($dep)) continue;
    $fromId = trim((string)($dep['fromId'] ?? ''));
    $toId = trim((string)($dep['toId'] ?? ''));
    if ($fromId === '' || $toId === '' || $fromId === $toId) continue;
    if (!isset($existingTaskIds[$fromId]) || !isset($existingTaskIds[$toId])) continue;

    $linkInsert->execute([
      ':project_id' => $projectId,
      ':from_id' => $fromId,
      ':to_id' => $toId,
      ':dependency_type' => dependency_type_to_db((string)($dep['type'] ?? 'F2S')),
    ]);
  }
}

function ensure_project_changes_table(PDO $pdo): void {
  static $ready = false;
  if ($ready) return;

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS `project_changes` (
      `id` uuid NOT NULL DEFAULT uuid(),
      `project_id` uuid NOT NULL,
      `change_type` varchar(64) NOT NULL,
      `source` varchar(64) NOT NULL,
      `payload` longtext NOT NULL,
      `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
      PRIMARY KEY (`id`),
      KEY `idx_project_changes_project_created` (`project_id`, `created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  ");

  $ready = true;
}

function insert_project_change(PDO $pdo, string $projectId, string $changeType, string $source, string $payloadStr): void {
  $stmt = $pdo->prepare("
    INSERT INTO project_changes (project_id, change_type, source, payload)
    VALUES (:project_id, :change_type, :source, :payload)
  ");
  $stmt->execute([
    ':project_id' => $projectId,
    ':change_type' => $changeType,
    ':source' => $source,
    ':payload' => $payloadStr,
  ]);
}

function save_project_detail(PDO $pdo, string $projectId, array $project, string $source = 'api'): void {
  // IMPORTANT: ne pas exécuter de DDL pendant une transaction MariaDB,
  // sinon commit implicite et "There is no active transaction".
  ensure_project_changes_table($pdo);
  ensure_project_activity_links_table($pdo);
  ensure_project_health_infra($pdo);

  $project['id'] = $projectId;
  $project = normalize_project_payload($project);
  $activeHealthShortName = detect_active_health_short_name($project);

  $name = trim((string)($project['name'] ?? ''));
  if ($name === '') {
    throw new InvalidArgumentException('Missing required field: project.name');
  }

  $payloadStr = json_encode($project, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($payloadStr === false) {
    throw new InvalidArgumentException('Could not encode project payload as JSON');
  }

  $pdo->beginTransaction();
  try {
    $sql = "
      INSERT INTO projects (id, name, description, payload)
      VALUES (:id, :name, :description, :payload)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        payload = VALUES(payload),
        updated_at = CURRENT_TIMESTAMP
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
      ':id' => $projectId,
      ':name' => $name,
      ':description' => trim((string)($project['description'] ?? '')),
      ':payload' => $payloadStr,
    ]);

    persist_project_tables($pdo, $project, $projectId);
    ensure_project_health_for_project($pdo, $projectId);
    if ($activeHealthShortName !== null) {
      set_project_health_active($pdo, $projectId, $activeHealthShortName);
    }
    insert_project_change($pdo, $projectId, 'save_project', $source, $payloadStr);
    $pdo->commit();
  } catch (Throwable $inner) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $inner;
  }
}

function run_project_procedure(PDO $pdo, string $projectId, string $procedure, array $payload): array {
  if ($procedure === 'save_project') {
    $project = (isset($payload['project']) && is_array($payload['project'])) ? $payload['project'] : [];
    if (!$project) {
      throw new InvalidArgumentException('Missing payload.project for save_project');
    }
    save_project_detail($pdo, $projectId, $project, 'procedure.save_project');

    return ['ok' => true, 'procedure' => 'save_project', 'id' => $projectId];
  }

  throw new InvalidArgumentException('Unknown procedure: ' . $procedure);
}

function rebuild_project_payload(PDO $pdo, string $projectId): array {
  $detail = fetch_project_from_tables($pdo, $projectId);
  if ($detail === null) {
    throw new InvalidArgumentException('Project not found');
  }

  $detail = normalize_project_payload($detail);
  $payloadStr = json_encode($detail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($payloadStr === false) {
    throw new InvalidArgumentException('Could not encode rebuilt payload as JSON');
  }

  $stmt = $pdo->prepare('UPDATE projects SET payload = :payload, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
  $stmt->execute([
    ':id' => $projectId,
    ':payload' => $payloadStr,
  ]);

  return $detail;
}

function delete_project_everywhere(PDO $pdo, string $projectId): bool {
  ensure_project_health_infra($pdo);
  $schema = resolve_project_data_schema($pdo);
  $activityTypesTable = $schema['activityTypesTable'];
  $activitiesTable = $schema['activitiesTable'];
  $assignmentsTable = $schema['assignmentsTable'];
  $linksTable = $schema['linksTable'];

  $existsStmt = $pdo->prepare('SELECT COUNT(*) FROM projects WHERE id = :id');
  $existsStmt->execute([':id' => $projectId]);
  $exists = (int)$existsStmt->fetchColumn() > 0;
  if (!$exists) return false;

  $pdo->beginTransaction();
  try {
    // Enfants -> parent pour respecter les FKs éventuelles.
    $pdo->prepare("DELETE FROM `{$linksTable}` WHERE project_id = :id")->execute([':id' => $projectId]);
    $pdo->prepare("DELETE FROM `{$assignmentsTable}` WHERE project_id = :id")->execute([':id' => $projectId]);
    $pdo->prepare("DELETE FROM `{$activitiesTable}` WHERE project_id = :id")->execute([':id' => $projectId]);
    $pdo->prepare("DELETE FROM `{$activityTypesTable}` WHERE project_id = :id")->execute([':id' => $projectId]);
    $pdo->prepare('DELETE FROM project_phases WHERE project_id = :id')->execute([':id' => $projectId]);
    $pdo->prepare('DELETE FROM users_roles_projects WHERE project_id = :id')->execute([':id' => $projectId]);
    $pdo->prepare('DELETE FROM project_risks WHERE projectId = :id')->execute([':id' => $projectId]);
    $pdo->prepare('DELETE FROM project_changes WHERE project_id = :id')->execute([':id' => $projectId]);
    $pdo->prepare('DELETE FROM project_health WHERE project_id = :id')->execute([':id' => $projectId]);

    $pdo->prepare('DELETE FROM projects WHERE id = :id')->execute([':id' => $projectId]);
    $pdo->commit();
  } catch (Throwable $inner) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $inner;
  }

  return true;
}

function fetch_users(PDO $pdo): array {
  $columnsStmt = $pdo->query('SHOW COLUMNS FROM users');
  $columns = array_map(
    static fn(array $row): string => (string)($row['Field'] ?? ''),
    $columnsStmt->fetchAll()
  );

  $idCandidates = ['id', 'user_id', 'uuid', 'user_uuid'];
  $idColumn = null;
  foreach ($idCandidates as $c) {
    if (in_array($c, $columns, true)) {
      $idColumn = $c;
      break;
    }
  }

  $fallbackIdCandidates = ['username', 'user', 'login', 'email'];
  $fallbackIdColumn = null;
  foreach ($fallbackIdCandidates as $c) {
    if (in_array($c, $columns, true)) {
      $fallbackIdColumn = $c;
      break;
    }
  }

  $labelCandidates = ['display_name', 'full_name', 'name', 'username', 'email'];
  $labelColumn = null;
  foreach ($labelCandidates as $c) {
    if (in_array($c, $columns, true)) {
      $labelColumn = $c;
      break;
    }
  }
  if ($labelColumn === null) {
    $labelColumn = $idColumn ?? $fallbackIdColumn ?? 'NULL';
  }

  $idExpr = $idColumn ?? $fallbackIdColumn ?? "''";
  $sql = "SELECT {$idExpr} AS id, {$labelColumn} AS label FROM users ORDER BY {$labelColumn} ASC";
  $rows = $pdo->query($sql)->fetchAll();

  return array_map(static function (array $r): array {
    return [
      'id' => trim((string)($r['id'] ?? '')),
      'label' => trim((string)($r['label'] ?? $r['id'] ?? '')),
    ];
  }, $rows);
}

function fetch_project_types(PDO $pdo): array {
  $sql = '
    SELECT uuid, name, description
    FROM project_type
    ORDER BY name ASC, uuid ASC
  ';
  $rows = $pdo->query($sql)->fetchAll();

  return array_map(static function (array $r): array {
    return [
      'id' => trim((string)($r['uuid'] ?? '')),
      'name' => trim((string)($r['name'] ?? '')),
      'description' => trim((string)($r['description'] ?? '')),
    ];
  }, $rows);
}

function fetch_project_type_defaults(PDO $pdo, string $projectTypeId): ?array {
  $schema = resolve_project_data_schema($pdo);
  $projectTypeActivityTypesDefaultTable = $schema['projectTypeActivityTypesDefaultTable'];
  $projectTypeActivitiesDefaultTable = $schema['projectTypeActivitiesDefaultTable'];
  $ptadPhaseCol = $schema['ptadPhaseCol'];
  $ptadTypeCol = $schema['ptadTypeCol'];
  $ptadItemCol = $schema['ptadItemCol'];
  $ptadLabelCol = $schema['ptadLabelCol'];

  $typeStmt = $pdo->prepare('
    SELECT uuid, name, description
    FROM project_type
    WHERE uuid = :id
    LIMIT 1
  ');
  $typeStmt->execute([':id' => $projectTypeId]);
  $type = $typeStmt->fetch();
  if (!$type) return null;

  $phasesStmt = $pdo->prepare('
    SELECT sequence, shortname, longname
    FROM project_type_phases_default
    WHERE project_type_id = :id AND status = "Active"
    ORDER BY sequence ASC, shortname ASC
  ');
  $phasesStmt->execute([':id' => $projectTypeId]);
  $phases = array_map(static function (array $r): array {
    return [
      'id' => trim((string)($r['shortname'] ?? '')),
      'label' => trim((string)($r['longname'] ?? $r['shortname'] ?? '')),
      'sequence' => is_numeric($r['sequence'] ?? null) ? (int)$r['sequence'] : null,
    ];
  }, $phasesStmt->fetchAll());

  $activitiesStmt = $pdo->prepare("
    SELECT sequence, shortname, longname
    FROM `{$projectTypeActivityTypesDefaultTable}`
    WHERE project_type_id = :id AND status = 'Active'
    ORDER BY sequence ASC, shortname ASC
  ");
  $activitiesStmt->execute([':id' => $projectTypeId]);
  $activities = array_map(static function (array $r): array {
    return [
      'id' => trim((string)($r['shortname'] ?? '')),
      'label' => trim((string)($r['longname'] ?? $r['shortname'] ?? '')),
      'sequence' => is_numeric($r['sequence'] ?? null) ? (int)$r['sequence'] : null,
    ];
  }, $activitiesStmt->fetchAll());

  $activitiesDefaultStmt = $pdo->prepare("
    SELECT
      sequence,
      `{$ptadItemCol}` AS activity_id,
      `{$ptadLabelCol}` AS activity_label,
      `{$ptadPhaseCol}` AS phase_id,
      `{$ptadTypeCol}` AS activity_type_id
    FROM `{$projectTypeActivitiesDefaultTable}`
    WHERE project_type_id = :id AND status = 'Active'
    ORDER BY sequence ASC, `{$ptadItemCol}` ASC
  ");
  $activitiesDefaultStmt->execute([':id' => $projectTypeId]);
  $activitiesDefault = array_map(static function (array $r): array {
    return [
      'id' => trim((string)($r['activity_id'] ?? '')),
      'label' => trim((string)($r['activity_label'] ?? $r['activity_id'] ?? '')),
      'phaseId' => trim((string)($r['phase_id'] ?? '')),
      'activityId' => trim((string)($r['activity_type_id'] ?? '')),
      'sequence' => is_numeric($r['sequence'] ?? null) ? (int)$r['sequence'] : null,
    ];
  }, $activitiesDefaultStmt->fetchAll());

  return [
    'projectType' => [
      'id' => trim((string)($type['uuid'] ?? '')),
      'name' => trim((string)($type['name'] ?? '')),
      'description' => trim((string)($type['description'] ?? '')),
    ],
    'phases' => $phases,
    'activities' => $activities,
    'activitiesDefault' => $activitiesDefault,
    'tasks' => $activitiesDefault,
  ];
}

function find_first_existing_column(array $columns, array $candidates): ?string {
  foreach ($candidates as $c) {
    if (in_array($c, $columns, true)) return $c;
  }
  return null;
}

function verify_login(PDO $pdo, string $username, string $password, ?string &$authError = null): ?array {
  $columnsStmt = $pdo->query('SHOW COLUMNS FROM users');
  $columns = array_map(
    static fn(array $row): string => (string)($row['Field'] ?? ''),
    $columnsStmt->fetchAll()
  );

  $idCol = find_first_existing_column($columns, ['id', 'user_id', 'uuid', 'user_uuid']);
  $loginCols = array_values(array_filter(
    ['username', 'user', 'login', 'email'],
    static fn(string $c): bool => in_array($c, $columns, true)
  ));
  if (in_array('full_name', $columns, true)) {
    $loginCols[] = 'full_name';
  }
  if (in_array('display_name', $columns, true)) {
    $loginCols[] = 'display_name';
  }
  if (in_array('name', $columns, true)) {
    $loginCols[] = 'name';
  }
  $loginCols = array_values(array_unique($loginCols));
  $userCol = $loginCols[0] ?? null;
  $passCol = find_first_existing_column($columns, ['password_hash', 'password', 'passwd', 'pass', 'pwd']);
  $labelCol = find_first_existing_column($columns, ['display_name', 'full_name', 'name', 'username', 'email']);
  $isActiveCol = find_first_existing_column($columns, ['is_active', 'active', 'enabled']);

  if ($userCol === null || $passCol === null) {
    $missing = [];
    if ($userCol === null) $missing[] = 'username|user|login|email';
    if ($passCol === null) $missing[] = 'password_hash|password|passwd|pass|pwd';
    $authError = 'Users table auth columns are missing: ' . implode(', ', $missing);
    return null;
  }
  if ($labelCol === null) $labelCol = $userCol;

  $idExpr = $idCol ?? $userCol;
  $sql = "SELECT {$idExpr} AS id, {$userCol} AS username, {$labelCol} AS label, {$passCol} AS pass";
  if ($isActiveCol !== null) $sql .= ", {$isActiveCol} AS is_active";
  $whereParts = [];
  $params = [];
  foreach ($loginCols as $c) {
    // Tolérance aux espaces/casse pour limiter les 401 "faux négatifs".
    $whereParts[] = "{$c} = ?";
    $params[] = $username;
    $whereParts[] = "TRIM({$c}) = TRIM(?)";
    $params[] = $username;
    $whereParts[] = "LOWER(TRIM({$c})) = LOWER(TRIM(?))";
    $params[] = $username;
  }
  $where = implode(' OR ', $whereParts);
  $sql .= " FROM users WHERE ({$where}) LIMIT 1";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $row = $stmt->fetch();
  if (!$row) return null;

  if ($isActiveCol !== null && isset($row['is_active']) && (string)$row['is_active'] === '0') {
    return null;
  }

  $stored = trim((string)($row['pass'] ?? ''));
  if ($stored === '') return null;

  $valid = false;
  if (
    str_starts_with($stored, '$2y$') ||
    str_starts_with($stored, '$2a$') ||
    str_starts_with($stored, '$argon2i$') ||
    str_starts_with($stored, '$argon2id$')
  ) {
    $valid = password_verify($password, $stored);
  } else {
    $valid = hash_equals($stored, $password) || hash_equals($stored, md5($password));
  }

  if (!$valid) return null;

  return [
    'id' => trim((string)($row['id'] ?? '')),
    'username' => trim((string)($row['username'] ?? '')),
    'label' => trim((string)($row['label'] ?? $row['username'] ?? '')),
  ];
}

try {
  // -----------------------------
  // GET /health
  // -----------------------------
  if ($method === 'GET' && $path === '/health') {
    send_json(['ok' => true, 'ts' => date('c')]);
  }

  // -----------------------------
  // GET /db-check
  // -----------------------------
  if ($method === 'GET' && $path === '/db-check') {
    $pdo = db();
    $pdo->query('SELECT 1')->fetch();
    send_json(['ok' => true]);
  }

  // -----------------------------
  // GET /users
  // -----------------------------
  if ($method === 'GET' && $path === '/users') {
    $pdo = db();
    $rows = fetch_users($pdo);
    send_json($rows);
  }

  // -----------------------------
  // GET /project-types
  // -----------------------------
  if ($method === 'GET' && $path === '/project-types') {
    $pdo = db();
    $rows = fetch_project_types($pdo);
    send_json($rows);
  }

  // -----------------------------
  // GET /project-health-defaults
  // -----------------------------
  if ($method === 'GET' && $path === '/project-health-defaults') {
    $pdo = db();
    $rows = fetch_project_health_defaults($pdo);
    send_json($rows);
  }

  // -----------------------------
  // GET /project-types/{id}/defaults
  // -----------------------------
  if ($method === 'GET' && preg_match('#^/project-types/([^/]+)/defaults$#', $path, $m)) {
    $projectTypeId = normalize_id(urldecode($m[1]));
    if ($projectTypeId === '') send_json(['error' => 'Missing project type id'], 400);

    $pdo = db();
    $defaults = fetch_project_type_defaults($pdo, $projectTypeId);
    if ($defaults === null) {
      send_json(['error' => 'Project type not found', 'requestedId' => $projectTypeId], 404);
    }
    send_json($defaults);
  }

  // -----------------------------
  // POST /auth/login
  // -----------------------------
  if ($path === '/auth/login' && $method !== 'POST') {
    send_json([
      'error' => 'Method not allowed',
      'uri' => $path,
      'method' => $method,
      'allowed' => ['POST'],
    ], 405);
  }

  if ($method === 'POST' && $path === '/auth/login') {
    $body = read_json_body();
    $username = trim((string)($body['username'] ?? ''));
    $password = (string)($body['password'] ?? '');

    if ($username === '' || $password === '') {
      send_json(['error' => 'Username and password are required'], 400);
    }

    $pdo = db();
    $authError = null;
    $user = verify_login($pdo, $username, $password, $authError);
    if ($authError !== null) {
      send_json(['error' => 'Authentication is not configured on this database', 'detail' => $authError], 500);
    }
    if ($user === null) {
      send_json(['error' => 'Invalid credentials'], 401);
    }

    send_json(['ok' => true, 'user' => $user]);
  }

  // -----------------------------
  // POST /projects/{id}/health
  // Body: { healthShortName: "Good"|"Average"|"Bad"|"Blocked", description?: string }
  // -----------------------------
  if ($method !== 'POST' && preg_match('#^/projects/([^/]+)/health$#', $path)) {
    send_json([
      'error' => 'Method not allowed',
      'uri' => $path,
      'method' => $method,
      'allowed' => ['POST'],
    ], 405);
  }

  if ($method === 'POST' && preg_match('#^/projects/([^/]+)/health$#', $path, $m)) {
    $projectId = normalize_id(urldecode($m[1]));
    if ($projectId === '') send_json(['error' => 'Missing project id in route'], 400);

    $body = read_json_body();
    $healthShortName = trim((string)($body['healthShortName'] ?? ''));
    $description = array_key_exists('description', $body) ? (string)$body['description'] : null;

    if ($healthShortName === '') {
      send_json(['error' => 'Missing healthShortName'], 400);
    }

    $pdo = db();
    try {
      $projectHealth = set_project_health_active($pdo, $projectId, $healthShortName, $description);
      send_json([
        'ok' => true,
        'id' => $projectId,
        'projectHealth' => $projectHealth,
      ]);
    } catch (InvalidArgumentException $e) {
      send_json(['error' => $e->getMessage()], 400);
    }
  }

  // -----------------------------
  // POST /projects/{id}/risks
  // PUT /projects/{id}/risks/{riskId}
  // Body: { title|longName, description?, probability, criticity|frequency, status?, remainingRiskId? }
  // -----------------------------
  if (!in_array($method, ['GET', 'POST'], true) && preg_match('#^/projects/([^/]+)/risks$#', $path)) {
    send_json([
      'error' => 'Method not allowed',
      'uri' => $path,
      'method' => $method,
      'allowed' => ['GET', 'POST'],
    ], 405);
  }

  if (!in_array($method, ['PUT', 'PATCH'], true) && preg_match('#^/projects/([^/]+)/risks/([^/]+)$#', $path)) {
    send_json([
      'error' => 'Method not allowed',
      'uri' => $path,
      'method' => $method,
      'allowed' => ['PUT', 'PATCH'],
    ], 405);
  }

  if ($method === 'POST' && preg_match('#^/projects/([^/]+)/risks$#', $path, $m)) {
    $projectId = normalize_id(urldecode($m[1]));
    if ($projectId === '') send_json(['error' => 'Missing project id in route'], 400);

    $body = read_json_body();
    $pdo = db();
    try {
      $risk = create_project_risk($pdo, $projectId, $body);
      send_json([
        'ok' => true,
        'id' => $projectId,
        'risk' => $risk,
      ]);
    } catch (InvalidArgumentException $e) {
      send_json(['error' => $e->getMessage()], 400);
    }
  }

  if (in_array($method, ['PUT', 'PATCH'], true) && preg_match('#^/projects/([^/]+)/risks/([^/]+)$#', $path, $m)) {
    $projectId = normalize_id(urldecode($m[1]));
    $riskId = normalize_id(urldecode($m[2]));
    if ($projectId === '') send_json(['error' => 'Missing project id in route'], 400);
    if ($riskId === '') send_json(['error' => 'Missing risk id in route'], 400);

    $body = read_json_body();
    $pdo = db();
    try {
      $risk = update_project_risk($pdo, $projectId, $riskId, $body);
      send_json([
        'ok' => true,
        'id' => $projectId,
        'risk' => $risk,
      ]);
    } catch (InvalidArgumentException $e) {
      $status = $e->getMessage() === 'Project risk not found' ? 404 : 400;
      send_json(['error' => $e->getMessage()], $status);
    }
  }

  // -----------------------------
  // POST /projects/{id}/procedure
  // Body: { procedure: "save_project", payload: { project: ProjectDetail } }
  // -----------------------------
  if ($method !== 'POST' && preg_match('#^/projects/([^/]+)/procedure$#', $path)) {
    send_json([
      'error' => 'Method not allowed',
      'uri' => $path,
      'method' => $method,
      'allowed' => ['POST'],
    ], 405);
  }

  if ($method === 'POST' && preg_match('#^/projects/([^/]+)/procedure$#', $path, $m)) {
    $projectId = normalize_id(urldecode($m[1]));
    if ($projectId === '') send_json(['error' => 'Missing project id in route'], 400);

    $body = read_json_body();
    $procedure = trim((string)($body['procedure'] ?? $body['name'] ?? ''));
    if ($procedure === '') {
      send_json(['error' => 'Missing procedure name'], 400);
    }

    $payload = (isset($body['payload']) && is_array($body['payload'])) ? $body['payload'] : [];

    $pdo = db();
    try {
      $result = run_project_procedure($pdo, $projectId, $procedure, $payload);
      send_json($result);
    } catch (InvalidArgumentException $e) {
      send_json(['error' => 'Invalid procedure payload', 'detail' => $e->getMessage()], 400);
    }
  }

  // -----------------------------
  // POST /projects/{id}/rebuild-payload
  // Reconstitue le payload depuis les tables et le stocke dans projects.payload
  // -----------------------------
  if ($method !== 'POST' && preg_match('#^/projects/([^/]+)/rebuild-payload$#', $path)) {
    send_json([
      'error' => 'Method not allowed',
      'uri' => $path,
      'method' => $method,
      'allowed' => ['POST'],
    ], 405);
  }

  if ($method === 'POST' && preg_match('#^/projects/([^/]+)/rebuild-payload$#', $path, $m)) {
    $projectId = normalize_id(urldecode($m[1]));
    if ($projectId === '') send_json(['error' => 'Missing project id in route'], 400);

    $pdo = db();
    try {
      $rebuilt = rebuild_project_payload($pdo, $projectId);
      send_json([
        'ok' => true,
        'id' => $projectId,
        'payload' => $rebuilt,
      ]);
    } catch (InvalidArgumentException $e) {
      $status = $e->getMessage() === 'Project not found' ? 404 : 400;
      send_json(['error' => $e->getMessage()], $status);
    }
  }

  // -----------------------------
  // GET /projects
  // -----------------------------
  if ($method === 'GET' && $path === '/projects') {
    $pdo = db();
    $stmt = $pdo->query('SELECT id, name FROM projects ORDER BY updated_at DESC, name ASC');
    $rows = $stmt->fetchAll();
    send_json($rows);
  }

  // -----------------------------
  // GET /projects/{id}/risks
  // -----------------------------
  if ($method === 'GET' && preg_match('#^/projects/([^/]+)/risks$#', $path, $m)) {
    $id = normalize_id(urldecode($m[1]));
    if ($id === '') send_json(['error' => 'Missing id'], 400);

    $pdo = db();
    $rows = fetch_project_risks($pdo, $id);
    send_json($rows);
  }

  // -----------------------------
  // GET /projects/{id}  (retourne le ProjectDetail JSON)
  // -----------------------------
  if ($method === 'GET' && preg_match('#^/projects/([^/]+)$#', $path, $m)) {
    $id = normalize_id(urldecode($m[1]));
    if ($id === '') send_json(['error' => 'Missing id'], 400);

    $pdo = db();
    $detail = fetch_project_from_tables($pdo, $id);
    if ($detail === null) {
      send_json(['error' => 'Project not found', 'requestedId' => $id], 404);
    }
    send_json($detail);
  }

  // -----------------------------
  // DELETE /projects/{id}
  // Supprime définitivement le projet et toutes ses données liées.
  // -----------------------------
  if ($method === 'DELETE' && preg_match('#^/projects/([^/]+)$#', $path, $m)) {
    $id = normalize_id(urldecode($m[1]));
    if ($id === '') send_json(['error' => 'Missing id'], 400);

    $pdo = db();
    $deleted = delete_project_everywhere($pdo, $id);
    if (!$deleted) {
      send_json(['error' => 'Project not found', 'requestedId' => $id], 404);
    }
    send_json(['ok' => true, 'id' => $id, 'deleted' => true]);
  }

  // -----------------------------
  // POST /projects (upsert)
  // Body: ProjectDetail JSON
  // -----------------------------
  if ($method === 'POST' && $path === '/projects') {
    $body = read_json_body();

    $id = normalize_id($body['id'] ?? null);
    if ($id === '') {
      send_json(['error' => 'Missing required fields: id, name'], 400);
    }

    $pdo = db();
    try {
      save_project_detail($pdo, $id, $body, 'route.projects');
    } catch (InvalidArgumentException $e) {
      send_json(['error' => $e->getMessage()], 400);
    }

    send_json(['ok' => true, 'id' => $id]);
  }

  // -----------------------------
  // 404
  // -----------------------------
  send_json([
    'error' => 'Route not found',
    'uri' => $path,
    'method' => $method,
    'basePath' => $basePath,
    'routesHint' => $routesHint,
  ], 404);

} catch (Throwable $e) {
  send_json([
    'error' => 'Server error',
    'detail' => $e->getMessage(),
  ], 500);
}
