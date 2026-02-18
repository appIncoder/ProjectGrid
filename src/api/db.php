<?php
declare(strict_types=1);

function db(): PDO {
  $host = getenv('DB_HOST') ?: '127.0.0.1';
  $port = getenv('DB_PORT') ?: '3306';
  $name = getenv('DB_NAME') ?: 'carec1650622_5ucp3q';
  $user = getenv('DB_USER') ?: 'carec1650622';
  $pass = getenv('DB_PASS') ?: 'n1s2w7u4ht';
  $charset = 'utf8mb4';

  $dsn = "mysql:host={$host};port={$port};dbname={$name};charset={$charset}";

  $options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
  ];

  return new PDO($dsn, $user, $pass, $options);
}
