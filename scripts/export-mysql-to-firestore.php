<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/api/db.php';

function out(mixed $value): never {
  $json = json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json === false) {
    fwrite(STDERR, "Could not encode export as JSON\n");
    exit(1);
  }

  fwrite(STDOUT, $json . PHP_EOL);
  exit(0);
}

function normalize_string(mixed $value): string {
  return trim((string)($value ?? ''));
}

function normalize_date(mixed $value): string {
  $raw = normalize_string($value);
  if ($raw === '') return '';
  if (strtoupper($raw) === 'NOW()') return '';

  $timestamp = strtotime($raw);
  if ($timestamp === false) return $raw;
  return gmdate('c', $timestamp);
}

function normalize_email(mixed $value, string $fallbackLocalPart = ''): string {
  $raw = strtolower(normalize_string($value));
  if ($raw !== '' && filter_var($raw, FILTER_VALIDATE_EMAIL)) {
    return $raw;
  }

  if ($raw !== '' && str_contains($raw, '@')) {
    [$localPart, $domain] = array_pad(explode('@', $raw, 2), 2, '');
    $localPart = preg_replace('/[^a-z0-9._%+-]+/i', '', $localPart) ?: 'user';
    $domain = preg_replace('/[^a-z0-9.-]+/i', '', $domain);
    if ($domain === '') {
      return $localPart . '@local.invalid';
    }
    if (!str_contains($domain, '.')) {
      return $localPart . '@' . $domain . '.invalid';
    }
    return $localPart . '@' . $domain;
  }

  $localPart = preg_replace('/[^a-z0-9._%+-]+/i', '', strtolower($fallbackLocalPart)) ?: 'user';
  return $localPart . '@local.invalid';
}

function deterministic_uuid(string $seed): string {
  $hex = md5($seed);
  return sprintf(
    '%s-%s-%s-%s-%s',
    substr($hex, 0, 8),
    substr($hex, 8, 4),
    substr($hex, 12, 4),
    substr($hex, 16, 4),
    substr($hex, 20, 12)
  );
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

function column_exists(PDO $pdo, string $table, string $column): bool {
  $stmt = $pdo->prepare("
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :table
      AND COLUMN_NAME = :column
  ");
  $stmt->execute([
    ':table' => $table,
    ':column' => $column,
  ]);
  return (int)$stmt->fetchColumn() > 0;
}

function resolve_project_type_activity_tables(PDO $pdo): array {
  return [
    'types' => table_exists($pdo, 'project_type_activities_type_default')
      ? 'project_type_activities_type_default'
      : 'project_type_activities_default',
    'defaults' => table_exists($pdo, 'project_type_activities_default')
      ? 'project_type_activities_default'
      : 'project_type_tasks_default',
  ];
}

function fetch_health_defaults(PDO $pdo): array {
  if (!table_exists($pdo, 'project_health_default')) {
    return [];
  }

  $stmt = $pdo->query("
    SELECT health_id, health_short_name, health_long_name, status, date_created, date_last_updated
    FROM project_health_default
    ORDER BY
      FIELD(LOWER(health_short_name), 'good', 'average', 'bad', 'blocked'),
      health_short_name ASC
  ");

  return array_map(static function (array $row): array {
    return [
      'healthId' => normalize_string($row['health_id'] ?? ''),
      'shortName' => normalize_string($row['health_short_name'] ?? ''),
      'longName' => normalize_string($row['health_long_name'] ?? ''),
      'status' => normalize_string($row['status'] ?? 'active') ?: 'active',
      'dateCreated' => normalize_date($row['date_created'] ?? ''),
      'dateLastUpdated' => normalize_date($row['date_last_updated'] ?? ''),
    ];
  }, $stmt->fetchAll());
}

function fetch_users(PDO $pdo): array {
  if (!table_exists($pdo, 'users')) return [];

  $stmt = $pdo->query("
    SELECT id, username, full_name, email, is_active, created_at, updated_at
    FROM users
    ORDER BY COALESCE(full_name, username, email, id) ASC
  ");

  return array_map(static function (array $row): array {
    $id = normalize_string($row['id'] ?? '');
    $username = normalize_string($row['username'] ?? '');
    $fullName = normalize_string($row['full_name'] ?? '');
    $email = normalize_email($row['email'] ?? '', $username !== '' ? $username : $id);

    return [
      'id' => $id,
      'uid' => $id,
      'username' => $username,
      'label' => $fullName !== '' ? $fullName : ($username !== '' ? $username : $email),
      'fullName' => $fullName,
      'email' => $email,
      'passwordHash' => normalize_string($row['password_hash'] ?? ''),
      'passwordHashAlgorithm' => normalize_string($row['password_hash'] ?? '') !== '' ? 'MD5' : '',
      'status' => ((string)($row['is_active'] ?? '1')) === '0' ? 'inactive' : 'active',
      'createdAt' => normalize_date($row['created_at'] ?? ''),
      'updatedAt' => normalize_date($row['updated_at'] ?? ''),
    ];
  }, $stmt->fetchAll());
}

function fetch_membership_maps(PDO $pdo): array {
  $empty = ['memberRolesByProject' => [], 'globalRolesByUser' => []];
  if (!table_exists($pdo, 'users_roles_projects') || !table_exists($pdo, 'roles')) return $empty;

  $stmt = $pdo->query("
    SELECT
      urp.user_id,
      urp.project_id,
      urp.status AS urp_status,
      r.name AS role_name,
      r.status AS role_status
    FROM users_roles_projects urp
    JOIN roles r ON r.id = urp.role_id
  ");

  $memberRolesByProject = [];
  $globalRolesByUser = [];

  foreach ($stmt->fetchAll() as $row) {
    $urpStatus = strtolower(normalize_string($row['urp_status'] ?? 'active'));
    if ($urpStatus !== '' && !in_array($urpStatus, ['active', '1', 'true'], true)) continue;

    $roleStatus = strtolower(normalize_string($row['role_status'] ?? 'active'));
    if ($roleStatus !== '' && !in_array($roleStatus, ['active', '1', 'true'], true)) continue;

    $userId = normalize_string($row['user_id'] ?? '');
    $projectId = normalize_string($row['project_id'] ?? '');
    $roleName = normalize_string($row['role_name'] ?? '');
    if ($userId === '' || $roleName === '') continue;

    if ($projectId === '') {
      $globalRolesByUser[$userId] ??= [];
      if (!in_array($roleName, $globalRolesByUser[$userId], true)) {
        $globalRolesByUser[$userId][] = $roleName;
      }
      continue;
    }

    $memberRolesByProject[$projectId] ??= [];
    $memberRolesByProject[$projectId][$userId] ??= [];
    if (!in_array($roleName, $memberRolesByProject[$projectId][$userId], true)) {
      $memberRolesByProject[$projectId][$userId][] = $roleName;
    }
  }

  return [
    'memberRolesByProject' => $memberRolesByProject,
    'globalRolesByUser' => $globalRolesByUser,
  ];
}

function fetch_project_type_defaults(PDO $pdo, string $projectTypeId): ?array {
  if (!table_exists($pdo, 'project_type')) return null;

  $activityTables = resolve_project_type_activity_tables($pdo);
  $typeStmt = $pdo->prepare("
    SELECT uuid, name, description
    FROM project_type
    WHERE uuid = :id
    LIMIT 1
  ");
  $typeStmt->execute([':id' => $projectTypeId]);
  $type = $typeStmt->fetch();
  if (!$type) return null;

  $phases = [];
  if (table_exists($pdo, 'project_type_phases_default')) {
    $stmt = $pdo->prepare("
      SELECT sequence, shortname, longname
      FROM project_type_phases_default
      WHERE project_type_id = :id
        AND LOWER(COALESCE(status, 'active')) = 'active'
      ORDER BY sequence ASC, shortname ASC
    ");
    $stmt->execute([':id' => $projectTypeId]);
    $phases = array_map(static function (array $row): array {
      return [
        'id' => normalize_string($row['shortname'] ?? ''),
        'label' => normalize_string($row['longname'] ?? $row['shortname'] ?? ''),
        'sequence' => isset($row['sequence']) && is_numeric($row['sequence']) ? (int)$row['sequence'] : null,
      ];
    }, $stmt->fetchAll());
  }

  $activities = [];
  if (table_exists($pdo, $activityTables['types'])) {
    $stmt = $pdo->prepare("
      SELECT sequence, shortname, longname
      FROM `{$activityTables['types']}`
      WHERE project_type_id = :id
        AND LOWER(COALESCE(status, 'active')) = 'active'
      ORDER BY sequence ASC, shortname ASC
    ");
    $stmt->execute([':id' => $projectTypeId]);
    $activities = array_map(static function (array $row): array {
      return [
        'id' => normalize_string($row['shortname'] ?? ''),
        'label' => normalize_string($row['longname'] ?? $row['shortname'] ?? ''),
        'sequence' => isset($row['sequence']) && is_numeric($row['sequence']) ? (int)$row['sequence'] : null,
      ];
    }, $stmt->fetchAll());
  }

  $defaults = [];
  if (table_exists($pdo, $activityTables['defaults'])) {
    $phaseCol = column_exists($pdo, $activityTables['defaults'], 'phaseId') ? 'phaseId' : 'phase_id';
    $typeCol = column_exists($pdo, $activityTables['defaults'], 'activity_type_id')
      ? 'activity_type_id'
      : (column_exists($pdo, $activityTables['defaults'], 'activitiesId') ? 'activitiesId' : 'activity_id');
    $itemCol = column_exists($pdo, $activityTables['defaults'], 'activity_id')
      ? 'activity_id'
      : (column_exists($pdo, $activityTables['defaults'], 'shortname') ? 'shortname' : 'task_id');
    $labelCol = column_exists($pdo, $activityTables['defaults'], 'longname') ? 'longname' : 'label';

    $stmt = $pdo->prepare("
      SELECT
        sequence,
        `{$itemCol}` AS activity_id,
        `{$labelCol}` AS activity_label,
        `{$phaseCol}` AS phase_id,
        `{$typeCol}` AS activity_type_id
      FROM `{$activityTables['defaults']}`
      WHERE project_type_id = :id
        AND LOWER(COALESCE(status, 'active')) = 'active'
      ORDER BY sequence ASC, `{$itemCol}` ASC
    ");
    $stmt->execute([':id' => $projectTypeId]);
    $defaults = array_map(static function (array $row): array {
      return [
        'id' => normalize_string($row['activity_id'] ?? ''),
        'label' => normalize_string($row['activity_label'] ?? $row['activity_id'] ?? ''),
        'phaseId' => normalize_string($row['phase_id'] ?? ''),
        'activityId' => normalize_string($row['activity_type_id'] ?? ''),
        'sequence' => isset($row['sequence']) && is_numeric($row['sequence']) ? (int)$row['sequence'] : null,
      ];
    }, $stmt->fetchAll());
  }

  return [
    'projectType' => [
      'id' => normalize_string($type['uuid'] ?? ''),
      'name' => normalize_string($type['name'] ?? ''),
      'description' => normalize_string($type['description'] ?? ''),
    ],
    'phases' => array_values(array_filter($phases, static fn(array $row): bool => $row['id'] !== '')),
    'activities' => array_values(array_filter($activities, static fn(array $row): bool => $row['id'] !== '')),
    'activitiesDefault' => array_values(array_filter($defaults, static function (array $row): bool {
      return $row['id'] !== '' && $row['phaseId'] !== '' && $row['activityId'] !== '';
    })),
    'tasks' => array_values(array_filter($defaults, static function (array $row): bool {
      return $row['id'] !== '' && $row['phaseId'] !== '' && $row['activityId'] !== '';
    })),
  ];
}

function fetch_project_types(PDO $pdo): array {
  if (!table_exists($pdo, 'project_type')) return [];

  $stmt = $pdo->query("
    SELECT uuid
    FROM project_type
    ORDER BY name ASC, uuid ASC
  ");

  $rows = [];
  foreach ($stmt->fetchAll() as $row) {
    $projectTypeId = normalize_string($row['uuid'] ?? '');
    if ($projectTypeId === '') continue;
    $defaults = fetch_project_type_defaults($pdo, $projectTypeId);
    if ($defaults !== null) {
      $rows[] = $defaults;
    }
  }

  return $rows;
}

function fetch_project_health(PDO $pdo, string $projectId): array {
  if (!table_exists($pdo, 'project_health')) return [];

  $stmt = $pdo->prepare("
    SELECT health_id, health_short_name, health_long_name, description, status, date_created, date_last_updated
    FROM project_health
    WHERE project_id = :project_id
    ORDER BY
      FIELD(LOWER(health_short_name), 'good', 'average', 'bad', 'blocked'),
      health_short_name ASC
  ");
  $stmt->execute([':project_id' => $projectId]);

  return array_map(static function (array $row): array {
    return [
      'healthId' => normalize_string($row['health_id'] ?? ''),
      'shortName' => normalize_string($row['health_short_name'] ?? ''),
      'longName' => normalize_string($row['health_long_name'] ?? ''),
      'description' => normalize_string($row['description'] ?? ''),
      'status' => normalize_string($row['status'] ?? 'active') ?: 'active',
      'dateCreated' => normalize_date($row['date_created'] ?? ''),
      'dateLastUpdated' => normalize_date($row['date_last_updated'] ?? ''),
    ];
  }, $stmt->fetchAll());
}

function fetch_project_risks(PDO $pdo, string $projectId): array {
  if (!table_exists($pdo, 'project_risks')) return [];

  $joinRisks = table_exists($pdo, 'risks');
  $sql = "
    SELECT
      pr.projectId AS projectId,
      pr.riskId AS riskId,
      pr.short_name AS short_name,
      pr.long_name AS long_name,
      " . ($joinRisks ? "r.name" : "NULL") . " AS title,
      " . ($joinRisks ? "r.description" : "NULL") . " AS description,
      pr.probability AS probability,
      pr.criticity AS criticity,
      pr.status AS status,
      pr.date_created AS date_created,
      pr.date_last_updated AS date_last_updated,
      pr.remaining_risk AS remaining_risk
    FROM project_risks pr
    " . ($joinRisks ? "LEFT JOIN risks r ON r.uuid = pr.riskId" : "") . "
    WHERE pr.projectId = :project_id
    ORDER BY
      FIELD(LOWER(COALESCE(pr.criticity, '')), 'critical', 'high', 'medium', 'low') ASC,
      pr.date_created DESC
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute([':project_id' => $projectId]);

  return array_map(static function (array $row): array {
    $longName = normalize_string($row['long_name'] ?? $row['title'] ?? '');
    return [
      'projectId' => normalize_string($row['projectId'] ?? ''),
      'riskId' => normalize_string($row['riskId'] ?? ''),
      'shortName' => normalize_string($row['short_name'] ?? ''),
      'longName' => $longName,
      'title' => $longName,
      'description' => normalize_string($row['description'] ?? ''),
      'probability' => normalize_string($row['probability'] ?? ''),
      'criticity' => normalize_string($row['criticity'] ?? ''),
      'status' => normalize_string($row['status'] ?? 'Open') ?: 'Open',
      'dateCreated' => normalize_date($row['date_created'] ?? ''),
      'dateLastUpdated' => normalize_date($row['date_last_updated'] ?? ''),
      'remainingRiskId' => normalize_string($row['remaining_risk'] ?? ''),
    ];
  }, $stmt->fetchAll());
}

function detect_active_health_short_name(array $rows): string {
  foreach ($rows as $row) {
    if (!is_array($row)) continue;
    if (strtolower(normalize_string($row['status'] ?? '')) !== 'active') continue;
    $shortName = normalize_string($row['shortName'] ?? '');
    if ($shortName !== '') return $shortName;
  }

  return '';
}

function fetch_projects(PDO $pdo, array $memberRolesByProject): array {
  if (!table_exists($pdo, 'projects')) return [];

  $stmt = $pdo->query("
    SELECT id, name, description, payload, created_at, updated_at, status
    FROM projects
    ORDER BY updated_at DESC, name ASC
  ");

  $rows = [];
  foreach ($stmt->fetchAll() as $row) {
    $projectId = normalize_string($row['id'] ?? '');
    if ($projectId === '') continue;

    $payload = json_decode((string)($row['payload'] ?? ''), true);
    if (!is_array($payload)) {
      $payload = [];
    }

    $projectHealth = fetch_project_health($pdo, $projectId);
    $projectRisks = fetch_project_risks($pdo, $projectId);
    $memberRoles = $memberRolesByProject[$projectId] ?? [];

    $payload['id'] = $projectId;
    $payload['name'] = normalize_string($payload['name'] ?? $row['name'] ?? $projectId);
    $payload['description'] = normalize_string($payload['description'] ?? $row['description'] ?? '');
    $payload['projectHealth'] = $projectHealth;
    $payload['projectRisks'] = $projectRisks;
    $payload['memberRoles'] = $memberRoles;
    $activeHealthShortName = detect_active_health_short_name($projectHealth);
    if ($activeHealthShortName !== '') {
      $payload['activeHealthShortName'] = $activeHealthShortName;
    }

    $rows[] = [
      'id' => $projectId,
      'name' => normalize_string($row['name'] ?? $payload['name'] ?? $projectId),
      'description' => normalize_string($row['description'] ?? $payload['description'] ?? ''),
      'status' => normalize_string($row['status'] ?? ''),
      'createdAt' => normalize_date($row['created_at'] ?? ''),
      'updatedAt' => normalize_date($row['updated_at'] ?? ''),
      'memberRoles' => $memberRoles,
      'payload' => $payload,
    ];
  }

  return $rows;
}

function export_from_database(PDO $pdo): array {
  $memberships = fetch_membership_maps($pdo);
  $users = fetch_users($pdo);
  $users = array_map(static function (array $user) use ($memberships): array {
    $user['globalRoles'] = $memberships['globalRolesByUser'][$user['id']] ?? [];
    return $user;
  }, $users);

  $projects = fetch_projects($pdo, $memberships['memberRolesByProject']);
  $projectTypes = fetch_project_types($pdo);
  $healthDefaults = fetch_health_defaults($pdo);

  return [
    'exportedAt' => gmdate('c'),
    'source' => [
      'database' => getenv('DB_NAME') ?: 'carec1650622_5ucp3q',
      'host' => getenv('DB_HOST') ?: '127.0.0.1',
      'mode' => 'database',
    ],
    'collections' => [
      'users' => $users,
      'healthDefaults' => $healthDefaults,
      'projectTypes' => $projectTypes,
      'projects' => $projects,
    ],
    'counts' => [
      'users' => count($users),
      'healthDefaults' => count($healthDefaults),
      'projectTypes' => count($projectTypes),
      'projects' => count($projects),
    ],
  ];
}

function split_sql_csv(string $input): array {
  $items = [];
  $current = '';
  $inString = false;
  $length = strlen($input);

  for ($i = 0; $i < $length; $i++) {
    $char = $input[$i];
    $next = $i + 1 < $length ? $input[$i + 1] : '';

    if ($char === "'") {
      $current .= $char;
      if ($inString && $next === "'") {
        $current .= $next;
        $i++;
      } else {
        $inString = !$inString;
      }
      continue;
    }

    if ($char === ',' && !$inString) {
      $items[] = trim($current);
      $current = '';
      continue;
    }

    $current .= $char;
  }

  if (trim($current) !== '') {
    $items[] = trim($current);
  }

  return $items;
}

function split_sql_tuples(string $valuesSql): array {
  $tuples = [];
  $current = '';
  $inString = false;
  $depth = 0;
  $length = strlen($valuesSql);

  for ($i = 0; $i < $length; $i++) {
    $char = $valuesSql[$i];
    $next = $i + 1 < $length ? $valuesSql[$i + 1] : '';

    if ($char === "'") {
      $current .= $char;
      if ($inString && $next === "'") {
        $current .= $next;
        $i++;
      } else {
        $inString = !$inString;
      }
      continue;
    }

    if (!$inString && $char === '(') {
      $depth++;
    }

    if ($depth > 0) {
      $current .= $char;
    }

    if (!$inString && $char === ')') {
      $depth--;
      if ($depth === 0) {
        $tuples[] = $current;
        $current = '';
      }
    }
  }

  return $tuples;
}

function decode_sql_value(string $value, array $vars = []): mixed {
  $value = trim($value);
  if ($value === '' || strtoupper($value) === 'NULL') return null;
  if (preg_match('/^@([A-Za-z0-9_]+)$/', $value, $m)) {
    return $vars[$m[1]] ?? '';
  }
  if (strcasecmp($value, 'NOW()') === 0) {
    return '';
  }
  if ($value[0] === "'" && substr($value, -1) === "'") {
    return str_replace("''", "'", substr($value, 1, -1));
  }
  if (is_numeric($value)) {
    return strpos($value, '.') !== false ? (float)$value : (int)$value;
  }
  return $value;
}

function parse_insert_values_statement(string $statement, array &$tables, array $vars): void {
  if (!preg_match('/INSERT\s+(?:IGNORE\s+)?INTO\s+`?([A-Za-z0-9_]+)`?\s*\((.*?)\)\s*VALUES\s*(.*)$/is', trim($statement), $m)) {
    return;
  }

  $table = $m[1];
  $columns = array_map(
    static fn(string $column): string => trim($column, " \t\n\r\0\x0B`"),
    split_sql_csv($m[2])
  );
  $tuples = split_sql_tuples($m[3]);

  foreach ($tuples as $tuple) {
    $inner = trim($tuple);
    $inner = trim($inner, '()');
    $values = split_sql_csv($inner);
    if (count($values) !== count($columns)) continue;

    $row = [];
    foreach ($columns as $index => $column) {
      $row[$column] = decode_sql_value($values[$index], $vars);
    }
    $tables[$table][] = $row;
  }
}

function parse_concat_insert_blocks(string $sql, array &$tables, array $vars): void {
  if (!preg_match_all('/CONCAT\((.*?)\)\s*\);\s*PREPARE\s+stmt/is', $sql, $matches)) {
    return;
  }

  foreach ($matches[1] as $concatBody) {
    if (!preg_match_all("/'((?:''|[^'])*)'/s", $concatBody, $chunks)) {
      continue;
    }
    $statement = '';
    foreach ($chunks[1] as $chunk) {
      $statement .= str_replace("''", "'", $chunk);
    }
    if (preg_match('/^\s*INSERT\s+/i', $statement)) {
      parse_insert_values_statement($statement, $tables, $vars);
    }
  }
}

function parse_variable_assignments(string $sql): array {
  $vars = [];

  if (preg_match_all("/SET\\s+@([A-Za-z0-9_]+)\\s*:=\\s*\\(\\s*SELECT\\s+`uuid`\\s+FROM\\s+`project_type`\\s+WHERE\\s+(?:LOWER\\(`name`\\)\\s*=\\s+LOWER\\(|`name`\\s*=\\s*)'((?:''|[^'])*)'\\)?/is", $sql, $matches, PREG_SET_ORDER)) {
    foreach ($matches as $match) {
      $varName = $match[1];
      $projectTypeName = str_replace("''", "'", $match[2]);
      $vars[$varName] = deterministic_uuid('project_type:' . mb_strtolower($projectTypeName));
    }
  }

  return $vars;
}

function dedupe_rows(array $rows, array $keys): array {
  $seen = [];
  $result = [];
  foreach ($rows as $row) {
    if (!is_array($row)) continue;
    $parts = [];
    foreach ($keys as $key) {
      $parts[] = normalize_string($row[$key] ?? '');
    }
    $signature = implode('|', $parts);
    if ($signature === '' || isset($seen[$signature])) continue;
    $seen[$signature] = true;
    $result[] = $row;
  }
  return $result;
}

function build_dump_dataset(string $sqlPath): array {
  $sql = file_get_contents($sqlPath);
  if ($sql === false) {
    throw new RuntimeException('Could not read SQL dump: ' . $sqlPath);
  }

  $vars = parse_variable_assignments($sql);
  $tables = [
    'projects' => [],
    'project_health_default' => [],
    'project_type' => [],
    'activities' => [],
    'project_type_phases_default' => [],
    'project_type_activities_default' => [],
    'project_type_activities_type_default' => [],
    'risks' => [],
    'project_risks' => [],
    'project_health' => [],
    'users' => [],
    'roles' => [],
    'users_roles_projects' => [],
  ];

  if (preg_match_all('/INSERT\s+(?:IGNORE\s+)?INTO\s+`?(projects|project_health_default|project_type|activities|project_type_phases_default|project_type_activities_default|risks|project_risks|project_health|project_type_activities_type_default)`?\s*\((.*?)\)\s*VALUES\s*(.*?);/is', $sql, $matches, PREG_SET_ORDER)) {
    foreach ($matches as $match) {
      parse_insert_values_statement($match[0], $tables, $vars);
    }
  }

  parse_concat_insert_blocks($sql, $tables, $vars);

  $rolesById = [];
  foreach ($tables['roles'] as $row) {
    $id = normalize_string($row['id'] ?? $row['role_id'] ?? '');
    if ($id === '') continue;
    $rolesById[$id] = [
      'id' => $id,
      'name' => normalize_string($row['name'] ?? ''),
      'status' => normalize_string($row['status'] ?? 'active') ?: 'active',
    ];
  }
  if (!$rolesById) {
    $rolesById = [
      '11111111-1111-1111-1111-111111111111' => ['id' => '11111111-1111-1111-1111-111111111111', 'name' => 'sysAdmin', 'status' => 'active'],
      '22222222-2222-2222-2222-222222222222' => ['id' => '22222222-2222-2222-2222-222222222222', 'name' => 'projectAdmin', 'status' => 'active'],
      '33333333-3333-3333-3333-333333333333' => ['id' => '33333333-3333-3333-3333-333333333333', 'name' => 'businessAdmin', 'status' => 'active'],
      '44444444-4444-4444-4444-444444444444' => ['id' => '44444444-4444-4444-4444-444444444444', 'name' => 'changeAdmin', 'status' => 'active'],
      '55555555-5555-5555-5555-555555555555' => ['id' => '55555555-5555-5555-5555-555555555555', 'name' => 'technoAdmin', 'status' => 'active'],
      '66666666-6666-6666-6666-666666666666' => ['id' => '66666666-6666-6666-6666-666666666666', 'name' => 'projectTeamMember', 'status' => 'active'],
      '77777777-7777-7777-7777-777777777777' => ['id' => '77777777-7777-7777-7777-777777777777', 'name' => 'projectStakeholder', 'status' => 'active'],
    ];
  }

  $usersById = [];
  foreach ($tables['users'] as $row) {
    $id = normalize_string($row['id'] ?? $row['user_id'] ?? '');
    if ($id === '') continue;
    $username = normalize_string($row['username'] ?? '');
    $fullName = normalize_string($row['full_name'] ?? '');
    $email = normalize_string($row['email'] ?? '');
    $usersById[$id] = [
      'id' => $id,
      'uid' => $id,
      'username' => $username,
      'label' => $fullName !== '' ? $fullName : ($username !== '' ? $username : $email),
      'fullName' => $fullName,
      'email' => $email,
      'status' => ((string)($row['is_active'] ?? '1')) === '0' ? 'inactive' : 'active',
      'createdAt' => normalize_date($row['created_at'] ?? ''),
      'updatedAt' => normalize_date($row['updated_at'] ?? ''),
    ];
  }
  if (!$usersById) {
    $usersById = [
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' => ['id' => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'uid' => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'username' => 'alice.dupont', 'label' => 'Alice Dupont', 'fullName' => 'Alice Dupont', 'email' => 'alice.dupont@example.org', 'passwordHash' => '0192023a7bbd73250516f069df18b500', 'passwordHashAlgorithm' => 'MD5', 'status' => 'active', 'createdAt' => '', 'updatedAt' => ''],
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' => ['id' => 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'uid' => 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'username' => 'bruno.martin', 'label' => 'Bruno Martin', 'fullName' => 'Bruno Martin', 'email' => 'bruno.martin@example.org', 'passwordHash' => '0192023a7bbd73250516f069df18b500', 'passwordHashAlgorithm' => 'MD5', 'status' => 'active', 'createdAt' => '', 'updatedAt' => ''],
      'cccccccc-cccc-cccc-cccc-cccccccccccc' => ['id' => 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'uid' => 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'username' => 'claire.leroy', 'label' => 'Claire Leroy', 'fullName' => 'Claire Leroy', 'email' => 'claire.leroy@example.org', 'passwordHash' => '0192023a7bbd73250516f069df18b500', 'passwordHashAlgorithm' => 'MD5', 'status' => 'active', 'createdAt' => '', 'updatedAt' => ''],
      'dddddddd-dddd-dddd-dddd-dddddddddddd' => ['id' => 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'uid' => 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'username' => 'david.lambert', 'label' => 'David Lambert', 'fullName' => 'David Lambert', 'email' => 'david.lambert@example.org', 'passwordHash' => '0192023a7bbd73250516f069df18b500', 'passwordHashAlgorithm' => 'MD5', 'status' => 'active', 'createdAt' => '', 'updatedAt' => ''],
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' => ['id' => 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'uid' => 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'username' => 'admin', 'label' => 'Administrateur', 'fullName' => 'Administrateur', 'email' => 'admin@local.invalid', 'passwordHash' => '21232f297a57a5a743894a0e4a801fc3', 'passwordHashAlgorithm' => 'MD5', 'status' => 'active', 'createdAt' => '', 'updatedAt' => ''],
    ];
  }

  $projectTypesById = [];
  foreach ($tables['project_type'] as $row) {
    $name = normalize_string($row['name'] ?? '');
    if ($name === '') continue;
    $id = normalize_string($row['uuid'] ?? '') ?: deterministic_uuid('project_type:' . mb_strtolower($name));
    $projectTypesById[$id] = [
      'projectType' => [
        'id' => $id,
        'name' => $name,
        'description' => normalize_string($row['description'] ?? ''),
      ],
      'phases' => [],
      'activities' => [],
      'activitiesDefault' => [],
      'tasks' => [],
    ];
    $vars['id_project_type_' . strtolower(preg_replace('/[^a-z0-9]+/i', '', $name) ?? $name)] = $id;
  }

  foreach ($tables['project_type_phases_default'] as $row) {
    $projectTypeId = normalize_string($row['project_type_id'] ?? '');
    if (!isset($projectTypesById[$projectTypeId])) continue;
    if (strtolower(normalize_string($row['status'] ?? 'active')) !== 'active') continue;
    $projectTypesById[$projectTypeId]['phases'][] = [
      'id' => normalize_string($row['shortname'] ?? ''),
      'label' => normalize_string($row['longname'] ?? $row['shortname'] ?? ''),
      'sequence' => isset($row['sequence']) && is_numeric($row['sequence']) ? (int)$row['sequence'] : null,
    ];
  }

  foreach ($tables['activities'] as $row) {
    $projectTypeId = normalize_string($row['id_project_type'] ?? '');
    if (!isset($projectTypesById[$projectTypeId])) continue;
    $projectTypesById[$projectTypeId]['activities'][] = [
      'id' => normalize_string($row['short_name'] ?? ''),
      'label' => normalize_string($row['long_name'] ?? $row['short_name'] ?? ''),
      'sequence' => isset($row['sequence']) && is_numeric($row['sequence']) ? (int)$row['sequence'] : null,
    ];
  }

  foreach ($tables['project_type_activities_type_default'] as $row) {
    $projectTypeId = normalize_string($row['project_type_id'] ?? '');
    if (!isset($projectTypesById[$projectTypeId])) continue;
    $projectTypesById[$projectTypeId]['activities'][] = [
      'id' => normalize_string($row['shortname'] ?? ''),
      'label' => normalize_string($row['longname'] ?? $row['shortname'] ?? ''),
      'sequence' => isset($row['sequence']) && is_numeric($row['sequence']) ? (int)$row['sequence'] : null,
    ];
  }

  foreach ($tables['project_type_activities_default'] as $row) {
    $projectTypeId = normalize_string($row['project_type_id'] ?? '');
    if (!isset($projectTypesById[$projectTypeId])) continue;
    if (strtolower(normalize_string($row['status'] ?? 'active')) !== 'active') continue;
    $item = [
      'id' => normalize_string($row['activity_id'] ?? ''),
      'label' => normalize_string($row['longname'] ?? $row['label'] ?? $row['activity_id'] ?? ''),
      'phaseId' => normalize_string($row['phaseId'] ?? $row['phase_id'] ?? ''),
      'activityId' => normalize_string($row['activity_type_id'] ?? $row['activitiesId'] ?? ''),
      'sequence' => isset($row['sequence']) && is_numeric($row['sequence']) ? (int)$row['sequence'] : null,
    ];
    $projectTypesById[$projectTypeId]['activitiesDefault'][] = $item;
    $projectTypesById[$projectTypeId]['tasks'][] = $item;
  }

  foreach ($projectTypesById as $projectTypeId => $projectType) {
    $projectTypesById[$projectTypeId]['phases'] = dedupe_rows($projectType['phases'], ['id']);
    $projectTypesById[$projectTypeId]['activities'] = dedupe_rows($projectType['activities'], ['id']);
    $projectTypesById[$projectTypeId]['activitiesDefault'] = dedupe_rows($projectType['activitiesDefault'], ['id', 'phaseId', 'activityId']);
    $projectTypesById[$projectTypeId]['tasks'] = $projectTypesById[$projectTypeId]['activitiesDefault'];
  }

  $riskDefs = [];
  foreach ($tables['risks'] as $row) {
    $riskId = normalize_string($row['uuid'] ?? '');
    if ($riskId === '') continue;
    $riskDefs[$riskId] = [
      'name' => normalize_string($row['name'] ?? ''),
      'description' => normalize_string($row['description'] ?? ''),
      'probability' => normalize_string($row['probability'] ?? ''),
      'criticity' => normalize_string($row['criticity'] ?? ''),
    ];
  }

  $projectHealthDefaults = [];
  foreach ($tables['project_health_default'] as $row) {
    $shortName = normalize_string($row['health_short_name'] ?? '');
    if ($shortName === '') continue;
    $projectHealthDefaults[] = [
      'healthId' => normalize_string($row['health_id'] ?? '') ?: deterministic_uuid('health:' . strtolower($shortName)),
      'shortName' => $shortName,
      'longName' => normalize_string($row['health_long_name'] ?? ''),
      'status' => normalize_string($row['status'] ?? 'active') ?: 'active',
      'dateCreated' => normalize_date($row['date_created'] ?? ''),
      'dateLastUpdated' => normalize_date($row['date_last_updated'] ?? ''),
    ];
  }
  $projectHealthDefaults = dedupe_rows($projectHealthDefaults, ['shortName']);

  $projects = [];
  foreach ($tables['projects'] as $row) {
    $projectId = normalize_string($row['id'] ?? '');
    if ($projectId === '') continue;
    $payload = json_decode((string)($row['payload'] ?? ''), true);
    if (!is_array($payload)) $payload = [];
    $projects[$projectId] = [
      'id' => $projectId,
      'name' => normalize_string($row['name'] ?? $payload['name'] ?? $projectId),
      'description' => normalize_string($row['description'] ?? $payload['description'] ?? ''),
      'status' => normalize_string($row['status'] ?? ''),
      'createdAt' => normalize_date($row['created_at'] ?? ''),
      'updatedAt' => normalize_date($row['updated_at'] ?? ''),
      'memberRoles' => [],
      'payload' => $payload,
    ];
  }

  $memberRolesByProject = [];
  $globalRolesByUser = [];
  foreach ($tables['users_roles_projects'] as $row) {
    $userId = normalize_string($row['user_id'] ?? '');
    $projectId = normalize_string($row['project_id'] ?? '');
    $roleId = normalize_string($row['role_id'] ?? '');
    if ($userId === '' || $roleId === '') continue;
    $roleName = normalize_string($rolesById[$roleId]['name'] ?? '');
    if ($roleName === '') continue;
    if ($projectId === '') {
      $globalRolesByUser[$userId] ??= [];
      if (!in_array($roleName, $globalRolesByUser[$userId], true)) $globalRolesByUser[$userId][] = $roleName;
      continue;
    }
    $memberRolesByProject[$projectId] ??= [];
    $memberRolesByProject[$projectId][$userId] ??= [];
    if (!in_array($roleName, $memberRolesByProject[$projectId][$userId], true)) {
      $memberRolesByProject[$projectId][$userId][] = $roleName;
    }
  }

  foreach (array_keys($projects) as $projectId) {
    if (!isset($memberRolesByProject[$projectId]['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'])) {
      $memberRolesByProject[$projectId]['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'][] = 'projectAdmin';
    }
    if (!isset($memberRolesByProject[$projectId]['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'])) {
      $memberRolesByProject[$projectId]['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'][] = 'sysAdmin';
    }
  }

  $projectHealthByProject = [];
  foreach ($tables['project_health'] as $row) {
    $projectId = normalize_string($row['project_id'] ?? '');
    if ($projectId === '') continue;
    $projectHealthByProject[$projectId][] = [
      'healthId' => normalize_string($row['health_id'] ?? '') ?: deterministic_uuid('project_health:' . $projectId . ':' . strtolower(normalize_string($row['health_short_name'] ?? ''))),
      'shortName' => normalize_string($row['health_short_name'] ?? ''),
      'longName' => normalize_string($row['health_long_name'] ?? ''),
      'description' => normalize_string($row['description'] ?? ''),
      'status' => normalize_string($row['status'] ?? 'active') ?: 'active',
      'dateCreated' => normalize_date($row['date_created'] ?? ''),
      'dateLastUpdated' => normalize_date($row['date_last_updated'] ?? ''),
    ];
  }
  foreach ($projectHealthByProject as $projectId => $rows) {
    $projectHealthByProject[$projectId] = dedupe_rows($rows, ['shortName']);
  }

  $projectRisksByProject = [];
  foreach ($tables['project_risks'] as $row) {
    $projectId = normalize_string($row['projectId'] ?? '');
    $riskId = normalize_string($row['riskId'] ?? '');
    if ($projectId === '' || $riskId === '') continue;
    $riskDef = $riskDefs[$riskId] ?? [];
    $longName = normalize_string($row['long_name'] ?? $riskDef['name'] ?? '');
    $projectRisksByProject[$projectId][] = [
      'projectId' => $projectId,
      'riskId' => $riskId,
      'shortName' => normalize_string($row['short_name'] ?? ''),
      'longName' => $longName,
      'title' => $longName,
      'description' => normalize_string($riskDef['description'] ?? ''),
      'probability' => normalize_string($row['probability'] ?? $riskDef['probability'] ?? ''),
      'criticity' => normalize_string($row['criticity'] ?? $riskDef['criticity'] ?? ''),
      'status' => normalize_string($row['status'] ?? 'Open') ?: 'Open',
      'dateCreated' => normalize_date($row['date_created'] ?? ''),
      'dateLastUpdated' => normalize_date($row['date_last_updated'] ?? ''),
      'remainingRiskId' => normalize_string($row['remaining_risk'] ?? ''),
    ];
  }
  foreach ($projectRisksByProject as $projectId => $rows) {
    $projectRisksByProject[$projectId] = dedupe_rows($rows, ['riskId']);
  }

  $users = [];
  foreach ($usersById as $userId => $user) {
    $user['globalRoles'] = $globalRolesByUser[$userId] ?? [];
    $users[] = $user;
  }

  foreach ($projects as $projectId => $project) {
    $payload = is_array($project['payload']) ? $project['payload'] : [];
    $projectHealth = $projectHealthByProject[$projectId] ?? [];
    if (!$projectHealth) {
      foreach ($projectHealthDefaults as $default) {
        if (strtolower($default['shortName']) !== 'good') continue;
        $projectHealth[] = [
          'healthId' => deterministic_uuid('project_health:' . $projectId . ':good'),
          'shortName' => $default['shortName'],
          'longName' => $default['longName'],
          'description' => $default['longName'],
          'status' => 'active',
          'dateCreated' => '',
          'dateLastUpdated' => '',
        ];
      }
    }

    $payload['id'] = $projectId;
    $payload['name'] = normalize_string($payload['name'] ?? $project['name'] ?? $projectId);
    $payload['description'] = normalize_string($payload['description'] ?? $project['description'] ?? '');
    $payload['projectHealth'] = $projectHealth;
    $payload['projectRisks'] = $projectRisksByProject[$projectId] ?? [];
    $payload['memberRoles'] = $memberRolesByProject[$projectId] ?? [];
    $activeHealthShortName = detect_active_health_short_name($projectHealth);
    if ($activeHealthShortName !== '') {
      $payload['activeHealthShortName'] = $activeHealthShortName;
    }

    $projects[$projectId]['memberRoles'] = $memberRolesByProject[$projectId] ?? [];
    $projects[$projectId]['payload'] = $payload;
  }

  return [
    'exportedAt' => gmdate('c'),
    'source' => [
      'database' => basename($sqlPath),
      'host' => 'sql-dump',
      'mode' => 'dump',
    ],
    'collections' => [
      'users' => array_values($users),
      'healthDefaults' => array_values($projectHealthDefaults),
      'projectTypes' => array_values($projectTypesById),
      'projects' => array_values($projects),
    ],
    'counts' => [
      'users' => count($users),
      'healthDefaults' => count($projectHealthDefaults),
      'projectTypes' => count($projectTypesById),
      'projects' => count($projects),
    ],
  ];
}

function resolve_sql_dump_path(array $argv): string {
  foreach (array_slice($argv, 1) as $arg) {
    if (str_ends_with($arg, '.sql') && is_file($arg)) {
      return $arg;
    }
  }

  $default = dirname(__DIR__) . '/src/db/carec1650622_5ucp3q.sql';
  return is_file($default) ? $default : '';
}

try {
  $dumpPath = resolve_sql_dump_path($argv);
  try {
    $pdo = db();
    out(export_from_database($pdo));
  } catch (Throwable $dbError) {
    if ($dumpPath === '') {
      throw $dbError;
    }
    out(build_dump_dataset($dumpPath));
  }
} catch (Throwable $e) {
  fwrite(STDERR, '[export-mysql-to-firestore] ' . $e->getMessage() . PHP_EOL);
  exit(1);
}
