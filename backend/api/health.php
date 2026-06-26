<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

bootstrapApi();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed.', 405);
}

$databaseConnected = false;
$status = 'ok';

try {
    $pdo = Database::connect();
    $pdo->query('SELECT 1');
    $databaseConnected = true;
} catch (Throwable $exception) {
    $status = 'degraded';
}

jsonResponse([
    'status' => $status,
    'database' => $databaseConnected ? 'connected' : 'disconnected',
    'php_version' => PHP_VERSION,
    'app_name' => appConfig('app_name', 'Brahmanda Work OS'),
    'timestamp' => (new DateTimeImmutable())->format(DateTimeInterface::ATOM),
], $databaseConnected ? 200 : 503);
