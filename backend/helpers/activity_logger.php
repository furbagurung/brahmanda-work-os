<?php

declare(strict_types=1);

function activityIpAddress(): ?string
{
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($forwarded !== '') {
        return trim(explode(',', $forwarded)[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? null;
}

function activityValue($value): ?string
{
    if ($value === null) {
        return null;
    }
    if (is_string($value)) {
        return $value;
    }
    return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function activitySafeValue($value)
{
    if (!is_array($value)) {
        return $value;
    }
    foreach (['password', 'api_token', 'token_expires_at'] as $key) {
        unset($value[$key]);
    }
    return $value;
}

function logActivity(PDO $pdo, ?array $user, array $activity): void
{
    try {
        $clientId = !empty($activity['client_id']) ? (int) $activity['client_id'] : null;
        $clientName = $activity['client_name'] ?? null;
        if ($clientId && !$clientName) {
            $clientStatement = $pdo->prepare('SELECT name FROM clients WHERE id = ?');
            $clientStatement->execute([$clientId]);
            $clientName = $clientStatement->fetchColumn() ?: null;
        }

        $statement = $pdo->prepare(
            'INSERT INTO activity_logs
                (user_id, user_name, action_type, module, item_id, item_title,
                 client_id, client_name, description, old_value, new_value, ip_address)
             VALUES
                (:user_id, :user_name, :action_type, :module, :item_id, :item_title,
                 :client_id, :client_name, :description, :old_value, :new_value, :ip_address)'
        );
        $statement->execute([
            ':user_id' => !empty($user['id']) ? (int) $user['id'] : null,
            ':user_name' => $user['name'] ?? 'System',
            ':action_type' => trim((string) ($activity['action_type'] ?? 'updated')),
            ':module' => trim((string) ($activity['module'] ?? 'system')),
            ':item_id' => !empty($activity['item_id']) ? (int) $activity['item_id'] : null,
            ':item_title' => $activity['item_title'] ?? null,
            ':client_id' => $clientId,
            ':client_name' => $clientName,
            ':description' => trim((string) ($activity['description'] ?? 'Activity recorded.')),
            ':old_value' => activityValue(activitySafeValue($activity['old_value'] ?? null)),
            ':new_value' => activityValue(activitySafeValue($activity['new_value'] ?? null)),
            ':ip_address' => activityIpAddress(),
        ]);
    } catch (Throwable $exception) {
        error_log('Activity log failed: ' . $exception->getMessage());
    }
}
