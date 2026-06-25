<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';

bootstrapApi();

try {
    $pdo = Database::connect();
    requireAuth($pdo);

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        errorResponse('Method not allowed.', 405);
    }

    $where = [];
    $parameters = [];
    $filters = [
        'user_id' => 'user_id',
        'client_id' => 'client_id',
        'module' => 'module',
        'action_type' => 'action_type',
    ];
    foreach ($filters as $query => $column) {
        if (isset($_GET[$query]) && $_GET[$query] !== '') {
            $where[] = $column . ' = :' . $query;
            $parameters[':' . $query] = in_array($query, ['user_id', 'client_id'], true)
                ? (int) $_GET[$query]
                : trim((string) $_GET[$query]);
        }
    }
    if (!empty($_GET['date_from'])) {
        $where[] = 'created_at >= :date_from';
        $parameters[':date_from'] = $_GET['date_from'] . ' 00:00:00';
    }
    if (!empty($_GET['date_to'])) {
        $where[] = 'created_at < DATE_ADD(:date_to, INTERVAL 1 DAY)';
        $parameters[':date_to'] = $_GET['date_to'];
    }

    $limit = min(500, max(1, (int) ($_GET['limit'] ?? 200)));
    $sql = 'SELECT * FROM activity_logs';
    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY created_at DESC, id DESC LIMIT ' . $limit;

    $statement = $pdo->prepare($sql);
    $statement->execute($parameters);
    jsonResponse($statement->fetchAll());
} catch (Throwable $exception) {
    handleException($exception);
}
