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
  'POST /auth/login',
  'POST /projects/{id}/procedure',
  'POST /projects/{id}/rebuild-payload',
  'GET /projects',
  'GET /projects/{id}',
  'POST /projects',
];

function normalize_project_payload(array $payload): array {
  if (!isset($payload['taskMatrix']) || !is_array($payload['taskMatrix'])) {
    return $payload;
  }

  foreach ($payload['taskMatrix'] as $activityId => $phaseMap) {
    if (!is_array($phaseMap)) continue;
    foreach ($phaseMap as $phaseId => $tasks) {
      if (!is_array($tasks)) continue;
      foreach ($tasks as $idx => $task) {
        if (!is_array($task)) continue;
        foreach (['reporterId', 'accountantId', 'responsibleId'] as $k) {
          if (!array_key_exists($k, $task)) continue;
          $v = trim((string)($task[$k] ?? ''));
          if ($v === '') {
            unset($task[$k]);
          } else {
            $task[$k] = $v;
          }
        }
        $payload['taskMatrix'][$activityId][$phaseId][$idx] = $task;
      }
    }
  }

  return $payload;
}

function project_default_phases(): array { 
  return ['Phase1', 'Phase2', 'Phase3', 'Phase4', 'Phase5', 'Phase6'];
}

function project_default_activities(): array {
  return [
    'projet' => ['id' => 'projet', 'label' => 'Gestion du projet', 'owner' => '—'],
    'metier' => ['id' => 'metier', 'label' => 'Gestion du métier', 'owner' => '—'],
    'changement' => ['id' => 'changement', 'label' => 'Gestion du changement', 'owner' => '—'],
    'technologie' => ['id' => 'technologie', 'label' => 'Gestion de la technologie', 'owner' => '—'],
  ];
} 

function build_payload_task_lookup(array $payload): array {
  $lookup = [];
  $tm = $payload['taskMatrix'] ?? null;
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
  $payloadTaskLookup = build_payload_task_lookup($payloadData);

  $detail = [
    'id' => (string)$row['id'],
    'name' => (string)($row['name'] ?? ''),
    'description' => (string)($row['description'] ?? ''),
    'phases' => [],
    'activities' => [],
    'taskMatrix' => [],
  ];

  $phaseStmt = $pdo->prepare('SELECT phase_id FROM project_phases WHERE project_id = :id ORDER BY phase_order ASC, phase_id ASC');
  $phaseStmt->execute([':id' => $projectId]);
  foreach ($phaseStmt->fetchAll() as $p) {
    $phaseId = trim((string)($p['phase_id'] ?? ''));
    if ($phaseId !== '') $detail['phases'][] = $phaseId;
  }
  if (!$detail['phases']) {
    $detail['phases'] = project_default_phases();
  }

  $actStmt = $pdo->prepare('SELECT activity_id, label, owner_name FROM project_activities WHERE project_id = :id ORDER BY activity_id ASC');
  $actStmt->execute([':id' => $projectId]);
  foreach ($actStmt->fetchAll() as $a) {
    $activityId = trim((string)($a['activity_id'] ?? ''));
    if ($activityId === '') continue;
    $detail['activities'][$activityId] = [
      'id' => $activityId,
      'label' => trim((string)($a['label'] ?? $activityId)),
      'owner' => trim((string)($a['owner_name'] ?? '—')),
    ];
  }
  if (!$detail['activities']) {
    $detail['activities'] = project_default_activities();
  }

  foreach ($detail['activities'] as $activityId => $_a) {
    $detail['taskMatrix'][$activityId] = [];
    foreach ($detail['phases'] as $phaseId) {
      $detail['taskMatrix'][$activityId][$phaseId] = [];
    }
  }

  $taskSql = '
    SELECT
      t.activity_id, t.phase_id, t.task_id, t.label, t.status,
      a.reporter_id, a.accountant_id, a.responsible_id
    FROM project_tasks t
    LEFT JOIN project_task_assignments a
      ON a.project_id = t.project_id
     AND a.activity_id = t.activity_id
     AND a.phase_id = t.phase_id
     AND a.task_id = t.task_id
    WHERE t.project_id = :id
    ORDER BY t.activity_id ASC, t.phase_id ASC, t.task_id ASC
  ';
  $taskStmt = $pdo->prepare($taskSql);
  $taskStmt->execute([':id' => $projectId]);

  foreach ($taskStmt->fetchAll() as $t) {
    $activityId = trim((string)($t['activity_id'] ?? ''));
    $phaseId = trim((string)($t['phase_id'] ?? ''));
    $taskId = trim((string)($t['task_id'] ?? ''));
    if ($activityId === '' || $phaseId === '' || $taskId === '') continue;

    if (!isset($detail['activities'][$activityId])) {
      $detail['activities'][$activityId] = ['id' => $activityId, 'label' => $activityId, 'owner' => '—'];
      $detail['taskMatrix'][$activityId] = [];
    }
    if (!in_array($phaseId, $detail['phases'], true)) {
      $detail['phases'][] = $phaseId;
    }
    if (!isset($detail['taskMatrix'][$activityId][$phaseId])) {
      $detail['taskMatrix'][$activityId][$phaseId] = [];
    }

    $task = [
      'id' => $taskId,
      'label' => (string)($t['label'] ?? $taskId),
      'status' => (string)($t['status'] ?? 'todo'),
    ];

    $reporter = trim((string)($t['reporter_id'] ?? ''));
    $accountant = trim((string)($t['accountant_id'] ?? ''));
    $responsible = trim((string)($t['responsible_id'] ?? ''));
    if ($reporter !== '') $task['reporterId'] = $reporter;
    if ($accountant !== '') $task['accountantId'] = $accountant;
    if ($responsible !== '') $task['responsibleId'] = $responsible;

    $overlay = $payloadTaskLookup[$activityId][$phaseId][$taskId] ?? null;
    if (is_array($overlay)) {
      foreach (['startDate', 'endDate', 'category', 'phase'] as $k) {
        if (!array_key_exists($k, $overlay)) continue;
        $v = trim((string)($overlay[$k] ?? ''));
        if ($v !== '') $task[$k] = $v;
      }
      if (isset($overlay['constraints']) && is_array($overlay['constraints'])) {
        $task['constraints'] = $overlay['constraints'];
      }
    }

    $detail['taskMatrix'][$activityId][$phaseId][] = $task;
  }

  foreach (array_keys($detail['activities']) as $activityId) {
    if (!isset($detail['taskMatrix'][$activityId])) $detail['taskMatrix'][$activityId] = [];
    foreach ($detail['phases'] as $phaseId) {
      if (!isset($detail['taskMatrix'][$activityId][$phaseId])) {
        $detail['taskMatrix'][$activityId][$phaseId] = [];
      }
    }
  }

  if (isset($payloadData['ganttDependencies']) && is_array($payloadData['ganttDependencies'])) {
    $detail['ganttDependencies'] = $payloadData['ganttDependencies'];
  }

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

  $activities = [];
  if (isset($body['activities']) && is_array($body['activities'])) {
    foreach ($body['activities'] as $activityId => $def) {
      $aid = trim((string)$activityId);
      if ($aid === '') continue;
      $activities[$aid] = [
        'id' => $aid,
        'label' => trim((string)($def['label'] ?? $aid)),
        'owner' => trim((string)($def['owner'] ?? '—')),
      ];
    }
  }
  if (!$activities) $activities = project_default_activities();

  $taskMatrix = (isset($body['taskMatrix']) && is_array($body['taskMatrix'])) ? $body['taskMatrix'] : [];

  $pdo->prepare('DELETE FROM project_task_assignments WHERE project_id = :id')->execute([':id' => $projectId]);
  $pdo->prepare('DELETE FROM project_tasks WHERE project_id = :id')->execute([':id' => $projectId]);
  $pdo->prepare('DELETE FROM project_activities WHERE project_id = :id')->execute([':id' => $projectId]);
  $pdo->prepare('DELETE FROM project_phases WHERE project_id = :id')->execute([':id' => $projectId]);

  $phaseInsert = $pdo->prepare('INSERT INTO project_phases (project_id, phase_id, phase_order) VALUES (:project_id, :phase_id, :phase_order)');
  foreach ($phases as $idx => $phaseId) {
    $phaseInsert->execute([
      ':project_id' => $projectId,
      ':phase_id' => $phaseId,
      ':phase_order' => $idx + 1,
    ]);
  }

  $activityInsert = $pdo->prepare('INSERT INTO project_activities (project_id, activity_id, label, owner_name) VALUES (:project_id, :activity_id, :label, :owner)');
  foreach ($activities as $activity) {
    $activityInsert->execute([
      ':project_id' => $projectId,
      ':activity_id' => $activity['id'],
      ':label' => $activity['label'],
      ':owner' => $activity['owner'],
    ]);
  }

  $taskInsert = $pdo->prepare('
    INSERT INTO project_tasks (project_id, activity_id, phase_id, task_id, label, status)
    VALUES (:project_id, :activity_id, :phase_id, :task_id, :label, :status)
  ');
  $assignInsert = $pdo->prepare('
    INSERT INTO project_task_assignments (project_id, activity_id, phase_id, task_id, reporter_id, accountant_id, responsible_id)
    VALUES (:project_id, :activity_id, :phase_id, :task_id, :reporter_id, :accountant_id, :responsible_id)
  ');

  foreach ($taskMatrix as $activityId => $phaseMap) {
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
          ':activity_id' => $aid,
          ':phase_id' => $pid,
          ':task_id' => $taskId,
          ':label' => trim((string)($task['label'] ?? $taskId)),
          ':status' => trim((string)($task['status'] ?? 'todo')),
        ]);

        $reporter = trim((string)($task['reporterId'] ?? ''));
        $accountant = trim((string)($task['accountantId'] ?? ''));
        $responsible = trim((string)($task['responsibleId'] ?? ''));
        if ($reporter !== '' || $accountant !== '' || $responsible !== '') {
          $assignInsert->execute([
            ':project_id' => $projectId,
            ':activity_id' => $aid,
            ':phase_id' => $pid,
            ':task_id' => $taskId,
            ':reporter_id' => $reporter !== '' ? $reporter : null,
            ':accountant_id' => $accountant !== '' ? $accountant : null,
            ':responsible_id' => $responsible !== '' ? $responsible : null,
          ]);
        }
      }
    }
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

  $project['id'] = $projectId;
  $project = normalize_project_payload($project);

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
