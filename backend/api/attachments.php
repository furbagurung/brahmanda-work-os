<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';

bootstrapApi();

try {
    $pdo = Database::connect();
    $currentUser = requireAuth($pdo);
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $taskId = filter_input(INPUT_GET, 'task_id', FILTER_VALIDATE_INT);

        if (!$taskId || $taskId < 1) {
            errorResponse('A valid task_id query parameter is required.', 422);
        }

        $statement = $pdo->prepare(
            'SELECT id, task_id, attachment_type, title, url, created_at
             FROM task_attachments
             WHERE task_id = ?
             ORDER BY created_at ASC, id ASC'
        );
        $statement->execute([$taskId]);
        jsonResponse($statement->fetchAll());
    }

    if ($method === 'POST') {
        $data = requestBody();
        requireFields($data, ['task_id', 'title', 'url']);

        if (!filter_var($data['url'], FILTER_VALIDATE_URL)) {
            errorResponse('Attachment URL must be valid.', 422);
        }

        $taskStatement = $pdo->prepare('SELECT id FROM tasks WHERE id = ?');
        $taskStatement->execute([(int) $data['task_id']]);
        if (!$taskStatement->fetch()) {
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

        jsonResponse(['id' => (int) $pdo->lastInsertId()], 201, 'Attachment added.');
    }

    if ($method === 'DELETE') {
        $id = queryId();
        $statement = $pdo->prepare('DELETE FROM task_attachments WHERE id = ?');
        $statement->execute([$id]);

        if ($statement->rowCount() === 0) {
            errorResponse('Attachment not found.', 404);
        }

        jsonResponse(['id' => $id], 200, 'Attachment deleted.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    handleException($exception);
}
