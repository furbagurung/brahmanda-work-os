<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';
require_once __DIR__ . '/../helpers/activity_logger.php';
require_once __DIR__ . '/../helpers/notification_helper.php';

bootstrapApi();

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
            'SELECT id, task_id, user_id, user_name, comment, created_at
             FROM task_comments WHERE task_id = ? ORDER BY created_at ASC, id ASC'
        );
        $statement->execute([$taskId]);
        jsonResponse($statement->fetchAll());
    }

    if ($method === 'POST') {
        $data = requestBody();
        requireFields($data, ['task_id', 'comment']);
        $comment = trim((string) $data['comment']);
        if ($comment === '') {
            errorResponse('Comment cannot be empty.', 422);
        }
        $task = $pdo->prepare(
            'SELECT t.id, t.title, t.client_id, t.assigned_user_id, c.name AS client_name
             FROM tasks t INNER JOIN clients c ON c.id = t.client_id WHERE t.id = ?'
        );
        $task->execute([(int) $data['task_id']]);
        $taskRow = $task->fetch();
        if (!$taskRow) {
            errorResponse('Task not found.', 404);
        }
        $statement = $pdo->prepare(
            'INSERT INTO task_comments (task_id, user_id, user_name, comment)
             VALUES (:task_id, :user_id, :user_name, :comment)'
        );
        $statement->execute([
            ':task_id' => $taskRow['id'],
            ':user_id' => $currentUser['id'],
            ':user_name' => $currentUser['name'],
            ':comment' => $comment,
        ]);
        $id = (int) $pdo->lastInsertId();
        logActivity($pdo, $currentUser, [
            'action_type' => 'commented', 'module' => 'tasks',
            'item_id' => $taskRow['id'], 'item_title' => $taskRow['title'],
            'client_id' => $taskRow['client_id'],
            'description' => 'Comment added to task.',
            'new_value' => ['comment_id' => $id, 'comment' => $comment],
        ]);
        $recipients = notificationRecipients(
            $pdo,
            !empty($taskRow['assigned_user_id']) ? (int) $taskRow['assigned_user_id'] : null
        );
        notifyRecipients($pdo, $recipients, [
            'type' => 'comment_added', 'title' => 'New task comment',
            'message' => $currentUser['name'] . ' commented on ' . $taskRow['title'] . '.',
            'related_module' => 'tasks', 'related_id' => $taskRow['id'],
            'client_id' => $taskRow['client_id'], 'client_name' => $taskRow['client_name'],
            'priority' => 'normal', 'action_url' => 'Tasks',
        ], (int) $currentUser['id'], $currentUser);
        jsonResponse(['id' => $id], 201, 'Comment added.');
    }

    if ($method === 'DELETE') {
        $id = queryId();
        $statement = $pdo->prepare(
            'SELECT tc.*, t.title AS task_title, t.client_id
             FROM task_comments tc INNER JOIN tasks t ON t.id = tc.task_id WHERE tc.id = ?'
        );
        $statement->execute([$id]);
        $comment = $statement->fetch();
        if (!$comment) {
            errorResponse('Comment not found.', 404);
        }
        if ($currentUser['role'] !== 'admin' && (int) $comment['user_id'] !== (int) $currentUser['id']) {
            errorResponse('You can only delete your own comments.', 403);
        }
        $pdo->prepare('DELETE FROM task_comments WHERE id = ?')->execute([$id]);
        logActivity($pdo, $currentUser, [
            'action_type' => 'deleted', 'module' => 'task_comments',
            'item_id' => $comment['task_id'], 'item_title' => $comment['task_title'],
            'client_id' => $comment['client_id'], 'description' => 'Task comment deleted.',
            'old_value' => ['comment_id' => $id, 'comment' => $comment['comment']],
        ]);
        jsonResponse(['id' => $id], 200, 'Comment deleted.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    handleException($exception);
}
