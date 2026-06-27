<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';
require_once __DIR__ . '/../helpers/activity_logger.php';

bootstrapApi();

function checklistTask(PDO $pdo, int $taskId): array
{
    $statement = $pdo->prepare('SELECT id, title, client_id FROM tasks WHERE id = ?');
    $statement->execute([$taskId]);
    $task = $statement->fetch();
    if (!$task) {
        errorResponse('Task not found.', 404);
    }
    return $task;
}

try {
    $pdo = Database::connect();
    $currentUser = requireAuth($pdo);
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $taskId = (int) ($_GET['task_id'] ?? 0);
        if ($taskId < 1) {
            errorResponse('task_id is required.', 422);
        }
        $statement = $pdo->prepare(
            'SELECT id, task_id, title, is_completed, created_at, updated_at
             FROM task_checklists WHERE task_id = ? ORDER BY created_at ASC, id ASC'
        );
        $statement->execute([$taskId]);
        jsonResponse($statement->fetchAll());
    }

    if ($method === 'POST') {
        $data = requestBody();
        requireFields($data, ['task_id', 'title']);
        $title = trim((string) $data['title']);
        if ($title === '') {
            errorResponse('Checklist title cannot be empty.', 422);
        }
        $task = checklistTask($pdo, (int) $data['task_id']);
        $statement = $pdo->prepare(
            'INSERT INTO task_checklists (task_id, title, is_completed) VALUES (?, ?, ?)'
        );
        $statement->execute([$task['id'], $title, boolValue($data['is_completed'] ?? false)]);
        jsonResponse(['id' => (int) $pdo->lastInsertId()], 201, 'Checklist item added.');
    }

    if ($method === 'PATCH' || $method === 'PUT') {
        $id = queryId();
        $statement = $pdo->prepare(
            'SELECT tc.*, t.title AS task_title, t.client_id
             FROM task_checklists tc INNER JOIN tasks t ON t.id = tc.task_id WHERE tc.id = ?'
        );
        $statement->execute([$id]);
        $item = $statement->fetch();
        if (!$item) {
            errorResponse('Checklist item not found.', 404);
        }
        $data = array_merge($item, requestBody());
        $title = trim((string) $data['title']);
        if ($title === '') {
            errorResponse('Checklist title cannot be empty.', 422);
        }
        $pdo->prepare('UPDATE task_checklists SET title = ?, is_completed = ? WHERE id = ?')
            ->execute([$title, boolValue($data['is_completed'] ?? false), $id]);
        jsonResponse(['id' => $id], 200, 'Checklist item updated.');
    }

    if ($method === 'DELETE') {
        $id = queryId();
        $statement = $pdo->prepare('DELETE FROM task_checklists WHERE id = ?');
        $statement->execute([$id]);
        if ($statement->rowCount() === 0) {
            errorResponse('Checklist item not found.', 404);
        }
        jsonResponse(['id' => $id], 200, 'Checklist item deleted.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    handleException($exception);
}
