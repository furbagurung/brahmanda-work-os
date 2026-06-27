<?php

declare(strict_types=1);

function createNotification(PDO $pdo, int $userId, array $data, ?array $actor = null): int
{
    $statement = $pdo->prepare(
        'INSERT INTO notifications
            (user_id, type, title, message, related_module, related_id, client_id,
             client_name, priority, action_url)
         VALUES
            (:user_id, :type, :title, :message, :related_module, :related_id, :client_id,
             :client_name, :priority, :action_url)'
    );
    $statement->execute([
        ':user_id' => $userId,
        ':type' => $data['type'] ?? 'system',
        ':title' => trim((string) ($data['title'] ?? 'Notification')),
        ':message' => trim((string) ($data['message'] ?? '')),
        ':related_module' => $data['related_module'] ?? null,
        ':related_id' => !empty($data['related_id']) ? (int) $data['related_id'] : null,
        ':client_id' => !empty($data['client_id']) ? (int) $data['client_id'] : null,
        ':client_name' => $data['client_name'] ?? null,
        ':priority' => $data['priority'] ?? 'normal',
        ':action_url' => $data['action_url'] ?? null,
    ]);
    $id = (int) $pdo->lastInsertId();
    if ($actor && function_exists('logActivity')) {
        logActivity($pdo, $actor, [
            'action_type' => 'generated', 'module' => 'notifications',
            'item_id' => $id, 'item_title' => $data['title'] ?? 'Notification',
            'client_id' => $data['client_id'] ?? null,
            'client_name' => $data['client_name'] ?? null,
            'description' => 'Notification generated.',
            'new_value' => ['user_id' => $userId, 'type' => $data['type'] ?? 'system'],
        ]);
    }
    return $id;
}

function notificationRecipients(PDO $pdo, ?int $assignedUserId = null): array
{
    if ($assignedUserId) {
        return [$assignedUserId];
    }
    $statement = $pdo->query('SELECT id FROM users WHERE role = "admin" AND status = "active"');
    return array_map('intval', array_column($statement->fetchAll(), 'id'));
}

function notifyRecipients(PDO $pdo, array $userIds, array $data, ?int $excludeUserId = null, ?array $actor = null): array
{
    $ids = [];
    foreach (array_unique(array_map('intval', $userIds)) as $userId) {
        if ($userId < 1 || ($excludeUserId && $userId === $excludeUserId)) {
            continue;
        }
        $ids[] = createNotification($pdo, $userId, $data, $actor);
    }
    return $ids;
}
