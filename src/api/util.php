<?php
declare(strict_types=1);

function send_json($data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function read_json_body(): array {
  $raw = file_get_contents('php://input') ?: '';
  if ($raw === '') return [];
  $decoded = json_decode($raw, true);
  if (!is_array($decoded)) {
    send_json(['error' => 'Invalid JSON body'], 400);
  }
  return $decoded;
}

function normalize_id(?string $id): string {
  $id = $id ?? '';
  $id = trim($id);
  // optionnel : tu peux forcer en minuscules si tu veux
  // $id = strtolower($id);
  return $id;
}

function cors(): void {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');

  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}

/**
 * Déduit le path demandé en tenant compte du basePath.
 * Ex: basePath="/projectgrid/api"
 * URI: "/projectgrid/api/projects/proj-a" => "./projects/proj-a"
 */
function request_path(string $basePath): string {
  $uri = $_SERVER['REQUEST_URI'] ?? '/';
  $path = parse_url($uri, PHP_URL_PATH) ?: '/';
  if ($basePath !== '' && str_starts_with($path, $basePath)) {
    $path = substr($path, strlen($basePath));
  }
  $path = $path === '' ? '/' : $path;
  if ($path !== '/') {
    $path = rtrim($path, '/');
    if ($path === '') $path = '/';
  }
  return $path;
}
