<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';
require_once __DIR__ . '/../helpers/activity_logger.php';
require_once __DIR__ . '/../helpers/notification_helper.php';

bootstrapApi();

function notificationExistsToday(PDO $pdo, int $userId, string $type, int $relatedId): bool
{
    $statement = $pdo->prepare(
        'SELECT id FROM notifications
         WHERE user_id = ? AND type = ? AND related_id = ? AND DATE(created_at) = CURDATE()
         LIMIT 1'
    );
    $statement->execute([$userId, $type, $relatedId]);
    return (bool) $statement->fetch();
}

function generateSystemNotifications(PDO $pdo): int
{
    $tasks = $pdo->query(
        'SELECT t.id, t.assigned_user_id, t.title, t.deadline, t.reminder_date,
                t.is_billable, t.payment_status, c.id AS client_id, c.name AS client_name
         FROM tasks t INNER JOIN clients c ON c.id = t.client_id
         WHERE t.status <> "Completed"
           AND (
                t.deadline <= CURDATE()
                OR t.reminder_date = CURDATE()
                OR (t.is_billable = 1 AND t.payment_status = "Unpaid")
           )'
    )->fetchAll();
    $created = 0;

    foreach ($tasks as $task) {
        $recipients = notificationRecipients(
            $pdo,
            !empty($task['assigned_user_id']) ? (int) $task['assigned_user_id'] : null
        );
        $events = [];
        if ($task['deadline'] === date('Y-m-d')) {
            $events[] = ['due_today', 'Task due today', $task['title'] . ' is due today.', 'high', 'Tasks'];
        } elseif (!empty($task['deadline']) && $task['deadline'] < date('Y-m-d')) {
            $events[] = ['overdue_task', 'Overdue task', $task['title'] . ' is past its deadline.', 'urgent', 'Tasks'];
        }
        if ($task['reminder_date'] === date('Y-m-d')) {
            $events[] = ['reminder', 'Task reminder', 'Reminder scheduled today for ' . $task['title'] . '.', 'high', 'Reminders'];
        }
        if ((int) $task['is_billable'] === 1 && $task['payment_status'] === 'Unpaid') {
            $events[] = ['unpaid_billing', 'Unpaid billing item', $task['title'] . ' is still unpaid.', 'high', 'Billing'];
        }
        foreach ($events as [$type, $title, $message, $priority, $actionUrl]) {
            foreach ($recipients as $userId) {
                if (notificationExistsToday($pdo, $userId, $type, (int) $task['id'])) {
                    continue;
                }
                createNotification($pdo, $userId, [
                    'type' => $type, 'title' => $title, 'message' => $message,
                    'related_module' => 'tasks', 'related_id' => $task['id'],
                    'client_id' => $task['client_id'], 'client_name' => $task['client_name'],
                    'priority' => $priority, 'action_url' => $actionUrl,
                ]);
                $created++;
            }
        }
    }
    return $created;
}

try {
    $pdo = Database::connect();
    $currentUser = requireAuth($pdo);
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        if (($_GET['action'] ?? '') === 'unread_count') {
            $scopeAll = $currentUser['role'] === 'admin' && ($_GET['scope'] ?? '') === 'all';
            $statement = $pdo->prepare(
                'SELECT COUNT(*) FROM notifications WHERE is_read = 0' . ($scopeAll ? '' : ' AND user_id = ?')
            );
            $statement->execute($scopeAll ? [] : [(int) $currentUser['id']]);
            jsonResponse(['count' => (int) $statement->fetchColumn()]);
        }

        $where = [];
        $parameters = [];
        $scopeAll = $currentUser['role'] === 'admin' && ($_GET['scope'] ?? '') === 'all';
        if (!$scopeAll) {
            $where[] = 'n.user_id = :user_id';
            $parameters[':user_id'] = (int) $currentUser['id'];
        }
        foreach (['type', 'priority', 'client_id'] as $filter) {
            if (isset($_GET[$filter]) && $_GET[$filter] !== '') {
                $where[] = 'n.' . $filter . ' = :' . $filter;
                $parameters[':' . $filter] = $_GET[$filter];
            }
        }
        if (isset($_GET['is_read']) && $_GET['is_read'] !== '') {
            $where[] = 'n.is_read = :is_read';
            $parameters[':is_read'] = boolValue($_GET['is_read']);
        }
        $limit = min(500, max(1, (int) ($_GET['limit'] ?? 100)));
        $sql = 'SELECT n.*, u.name AS user_name
                FROM notifications n INNER JOIN users u ON u.id = n.user_id';
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY n.is_read ASC,
                    CASE n.priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "normal" THEN 3 ELSE 4 END,
                    n.created_at DESC LIMIT ' . $limit;
        $statement = $pdo->prepare($sql);
        $statement->execute($parameters);
        jsonResponse($statement->fetchAll());
    }

    if ($method === 'POST' && ($_GET['action'] ?? '') === 'generate') {
        $pdo->beginTransaction();
        $count = generateSystemNotifications($pdo);
        logActivity($pdo, $currentUser, [
            'action_type' => 'generated', 'module' => 'notifications',
            'item_title' => 'System notifications',
            'description' => $count . ' system notification(s) generated.',
            'new_value' => ['generated_count' => $count],
        ]);
        $pdo->commit();
        jsonResponse(['generated_count' => $count], 200, 'Notifications generated.');
    }

    if ($method === 'PATCH') {
        if (($_GET['action'] ?? '') === 'read_all') {
            $statement = $pdo->prepare(
                'UPDATE notifications SET is_read = 1, read_at = COALESCE(read_at, NOW())
                 WHERE user_id = ? AND is_read = 0'
            );
            $statement->execute([(int) $currentUser['id']]);
            logActivity($pdo, $currentUser, [
                'action_type' => 'marked_read', 'module' => 'notifications',
                'item_title' => 'All notifications',
                'description' => 'All notifications marked as read.',
                'new_value' => ['count' => $statement->rowCount()],
            ]);
            jsonResponse(['updated_count' => $statement->rowCount()], 200, 'All notifications marked as read.');
        }
        $id = queryId();
        $statement = $pdo->prepare(
            'UPDATE notifications SET is_read = 1, read_at = COALESCE(read_at, NOW())
             WHERE id = ? AND user_id = ?'
        );
        $statement->execute([$id, (int) $currentUser['id']]);
        if ($statement->rowCount() === 0) {
            errorResponse('Notification not found.', 404);
        }
        logActivity($pdo, $currentUser, [
            'action_type' => 'marked_read', 'module' => 'notifications',
            'item_id' => $id, 'item_title' => 'Notification',
            'description' => 'Notification marked as read.',
        ]);
        jsonResponse(['id' => $id], 200, 'Notification marked as read.');
    }

    if ($method === 'DELETE') {
        $id = queryId();
        $statement = $pdo->prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?');
        $statement->execute([$id, (int) $currentUser['id']]);
        if ($statement->rowCount() === 0) {
            errorResponse('Notification not found.', 404);
        }
        logActivity($pdo, $currentUser, [
            'action_type' => 'deleted', 'module' => 'notifications',
            'item_id' => $id, 'item_title' => 'Notification',
            'description' => 'Notification deleted.',
        ]);
        jsonResponse(['id' => $id], 200, 'Notification deleted.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    handleException($exception);
}
