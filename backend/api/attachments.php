<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';
require_once __DIR__ . '/../helpers/activity_logger.php';

bootstrapApi();

try {
    $pdo = Database::connect();
    $currentUser = requireAuth($pdo);
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $taskId = filter_input(INPUT_GET, 'task_id', FILTER_VALIDATE_INT);
        $clientId = filter_input(INPUT_GET, 'client_id', FILTER_VALIDATE_INT);

        if ($taskId && $taskId > 0) {
            $statement = $pdo->prepare(
                'SELECT id, task_id, attachment_type, title, url, created_at
                 FROM task_attachments
                 WHERE task_id = ?
                 ORDER BY created_at ASC, id ASC'
            );
            $statement->execute([$taskId]);
        } elseif ($clientId && $clientId > 0) {
            $statement = $pdo->prepare(
                'SELECT a.id, a.task_id, a.attachment_type, a.title, a.url, a.created_at,
                        t.title AS task_title
                 FROM task_attachments a
                 INNER JOIN tasks t ON t.id = a.task_id
                 WHERE t.client_id = ?
                 ORDER BY t.title ASC, a.created_at ASC, a.id ASC'
            );
            $statement->execute([$clientId]);
        } else {
            errorResponse('A valid task_id or client_id query parameter is required.', 422);
        }

        jsonResponse($statement->fetchAll());
    }

    if ($method === 'POST') {
        $data = requestBody();
        requireFields($data, ['task_id', 'title', 'url']);

        if (!filter_var($data['url'], FILTER_VALIDATE_URL)) {
            errorResponse('Attachment URL must be valid.', 422);
        }

        $taskStatement = $pdo->prepare('SELECT id, client_id, title FROM tasks WHERE id = ?');
        $taskStatement->execute([(int) $data['task_id']]);
        $task = $taskStatement->fetch();
        if (!$task) {
            errorResponse('Task not found.', 404);
        }

        $statement = $pdo->prepare(
            'INSERT INTO task_attachments (task_id, attachment_type, title, url)
             VALUES (:task_id, :attachment_type, :title, :url)'
        );
        $statement->execute([
            ':task_id' => (int) $data['task_id'],
            ':attachment_type' => trim((string) ($data['attachment_type'] ?? 'link')) ?: 'link',
            ':title' => trim((string) $data['title']),
            ':url' => trim((string) $data['url']),
        ]);

        $id = (int) $pdo->lastInsertId();
        logActivity($pdo, $currentUser, [
            'action_type' => 'added', 'module' => 'proofs', 'item_id' => $id,
            'item_title' => trim((string) $data['title']), 'client_id' => $task['client_id'],
            'description' => 'Proof link added to ' . $task['title'] . '.',
            'new_value' => ['task_id' => $task['id'], 'title' => $data['title'], 'url' => $data['url']],
        ]);
        jsonResponse(['id' => $id], 201, 'Attachment added.');
    }

    if ($method === 'DELETE') {
        $id = queryId();
        $currentStatement = $pdo->prepare(
            'SELECT a.*, t.client_id, t.title AS task_title
             FROM task_attachments a INNER JOIN tasks t ON t.id = a.task_id WHERE a.id = ?'
        );
        $currentStatement->execute([$id]);
        $current = $currentStatement->fetch();
        $statement = $pdo->prepare('DELETE FROM task_attachments WHERE id = ?');
        $statement->execute([$id]);

        if ($statement->rowCount() === 0) {
            errorResponse('Attachment not found.', 404);
        }
        logActivity($pdo, $currentUser, [
            'action_type' => 'deleted', 'module' => 'proofs', 'item_id' => $id,
            'item_title' => $current['title'] ?? 'Proof link', 'client_id' => $current['client_id'] ?? null,
            'description' => 'Proof link deleted from ' . ($current['task_title'] ?? 'task') . '.',
            'old_value' => $current,
        ]);

        jsonResponse(['id' => $id], 200, 'Attachment deleted.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    handleException($exception);
}
