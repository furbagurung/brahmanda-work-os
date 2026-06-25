<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

bootstrapApi();

try {
    $pdo = Database::connect();

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        errorResponse('Method not allowed.', 405);
    }

    $where = [];
    $parameters = [];

    if (!empty($_GET['client_id'])) {
        $where[] = 'l.client_id = :client_id';
        $parameters[':client_id'] = (int) $_GET['client_id'];
    }

    if (!empty($_GET['date'])) {
        $where[] = 'l.log_date = :log_date';
        $parameters[':log_date'] = $_GET['date'];
    }

    $sql = 'SELECT l.*, c.name AS client_name, t.title AS task_title, t.billable_amount
            FROM daily_logs l
            INNER JOIN clients c ON c.id = l.client_id
            INNER JOIN tasks t ON t.id = l.task_id';

    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY l.log_date DESC, l.created_at DESC';

    $statement = $pdo->prepare($sql);
    $statement->execute($parameters);

    jsonResponse($statement->fetchAll());
} catch (Throwable $exception) {
    handleException($exception);
}
