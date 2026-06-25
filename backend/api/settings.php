<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';
require_once __DIR__ . '/../helpers/activity_logger.php';

bootstrapApi();

$defaults = [
    'agency_name' => 'Brahmanda Tech',
    'legal_business_name' => 'Kittik Enterprise',
    'contact_person' => 'Furba Gurung',
    'agency_email' => 'brahmandatech@gmail.com',
    'agency_phone' => '9840006162',
    'agency_address' => '',
    'pan_number' => '123252867',
    'agency_website' => '',
    'agency_notes' => '',
    'report_title' => 'Monthly Client Report',
    'prepared_by' => 'Brahmanda Tech',
    'report_footer_text' => 'Prepared by Brahmanda Tech',
    'brand_color' => '#002FA7',
    'logo_url' => '',
    'default_report_note' => '',
    'currency' => 'NPR',
    'default_task_priority' => 'Medium',
    'default_report_status' => 'Draft',
    'default_monthly_report_template' => 'Standard Monthly Client Report',
    'date_format' => 'MMM d, yyyy',
];

function settingsMap(PDO $pdo, array $defaults): array
{
    $settings = $defaults;
    $statement = $pdo->query('SELECT setting_key, setting_value FROM settings ORDER BY setting_key');
    foreach ($statement->fetchAll() as $row) {
        $settings[$row['setting_key']] = $row['setting_value'] ?? '';
    }
    return $settings;
}

try {
    $pdo = Database::connect();
    $currentUser = requireAuth($pdo);
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $settings = settingsMap($pdo, $defaults);
        if ($currentUser['role'] !== 'admin') {
            $settings = array_intersect_key($settings, array_flip(array_keys($defaults)));
        }
        jsonResponse($settings);
    }

    requireAdmin($currentUser);

    if ($method === 'PUT' || $method === 'PATCH' || $method === 'POST') {
        $data = requestBody();
        $updates = isset($data['settings']) && is_array($data['settings'])
            ? $data['settings']
            : (!empty($data['setting_key']) ? [$data['setting_key'] => $data['setting_value'] ?? ''] : $data);

        $updates = array_intersect_key($updates, $defaults);
        if ($updates === []) {
            errorResponse('No valid settings were provided.', 422);
        }
        if (isset($updates['brand_color']) && !preg_match('/^#[0-9a-f]{6}$/i', (string) $updates['brand_color'])) {
            errorResponse('Brand color must be a valid six-digit hex color.', 422);
        }
        if (isset($updates['agency_email']) && $updates['agency_email'] !== '' && !filter_var($updates['agency_email'], FILTER_VALIDATE_EMAIL)) {
            errorResponse('Agency email must be valid.', 422);
        }

        $oldSettings = settingsMap($pdo, $defaults);
        $statement = $pdo->prepare(
            'INSERT INTO settings (setting_key, setting_value)
             VALUES (:setting_key, :setting_value)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
        );
        foreach ($updates as $key => $value) {
            $statement->execute([
                ':setting_key' => $key,
                ':setting_value' => is_scalar($value) || $value === null
                    ? (string) ($value ?? '')
                    : json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ]);
        }
        $newSettings = settingsMap($pdo, $defaults);
        logActivity($pdo, $currentUser, [
            'action_type' => 'updated',
            'module' => 'settings',
            'item_title' => 'Workspace settings',
            'description' => count($updates) . ' setting(s) updated.',
            'old_value' => array_intersect_key($oldSettings, $updates),
            'new_value' => array_intersect_key($newSettings, $updates),
        ]);
        jsonResponse($newSettings, 200, 'Settings updated.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    handleException($exception);
}
