<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';
require_once __DIR__ . '/../helpers/activity_logger.php';
require_once __DIR__ . '/../helpers/notification_helper.php';

bootstrapApi();

function portalReport(PDO $pdo, int $reportId): array
{
    $statement = $pdo->prepare(
        'SELECT r.id, r.client_id, r.report_month, r.report_year, r.report_content, r.status,
                c.name AS client_name
         FROM reports r INNER JOIN clients c ON c.id = r.client_id
         WHERE r.id = ?'
    );
    $statement->execute([$reportId]);
    $report = $statement->fetch();
    if (!$report) {
        errorResponse('Report not found.', 404);
    }
    return $report;
}

function portalShare(PDO $pdo, int $id): array
{
    $statement = $pdo->prepare(
        'SELECT ps.*, r.report_month, r.report_year, r.status AS report_status, c.name AS client_name
         FROM client_portal_shares ps
         INNER JOIN reports r ON r.id = ps.report_id
         INNER JOIN clients c ON c.id = ps.client_id
         WHERE ps.id = ?'
    );
    $statement->execute([$id]);
    $share = $statement->fetch();
    if (!$share) {
        errorResponse('Share link not found.', 404);
    }
    return $share;
}

function newPortalToken(): array
{
    $token = bin2hex(random_bytes(32));
    return [$token, hash('sha256', $token), substr($token, -8)];
}

function publicPortalReport(PDO $pdo, string $token): void
{
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        errorResponse('This report link is expired or unavailable.', 404);
    }
    $statement = $pdo->prepare(
        'SELECT ps.id, r.id AS report_id, r.report_month, r.report_year, r.report_content, r.status,
                c.id AS client_id, c.name AS client_name
         FROM client_portal_shares ps
         INNER JOIN reports r ON r.id = ps.report_id
         INNER JOIN clients c ON c.id = ps.client_id
         WHERE ps.share_token_hash = ?
           AND ps.is_active = 1
           AND (ps.expires_at IS NULL OR ps.expires_at > NOW())
         LIMIT 1'
    );
    $statement->execute([hash('sha256', $token)]);
    $row = $statement->fetch();
    if (!$row) {
        errorResponse('This report link is expired or unavailable.', 404);
    }

    $settingsStatement = $pdo->query(
        'SELECT setting_key, setting_value
         FROM settings
         WHERE setting_key IN (
            "agency_name", "legal_business_name", "contact_person", "agency_email",
            "agency_phone", "agency_address", "pan_number", "agency_website",
            "report_title", "prepared_by", "report_footer_text", "brand_color",
            "logo_url", "default_report_note", "currency"
         )'
    );
    $settings = [];
    foreach ($settingsStatement->fetchAll() as $setting) {
        $settings[$setting['setting_key']] = $setting['setting_value'];
    }
    $content = json_decode((string) $row['report_content'], true);
    if (!is_array($content)) {
        $content = ['summary' => (string) $row['report_content']];
    }
    jsonResponse([
        'report' => [
            'month' => (int) $row['report_month'],
            'year' => (int) $row['report_year'],
            'status' => $row['status'],
            'content' => $content,
        ],
        'client' => ['name' => $row['client_name']],
        'branding' => $settings,
    ]);
}

try {
    $pdo = Database::connect();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET' && ($_GET['action'] ?? '') === 'public') {
        publicPortalReport($pdo, trim((string) ($_GET['token'] ?? '')));
    }

    $currentUser = requireAuth($pdo);

    if ($method === 'GET') {
        $where = [];
        $parameters = [];
        foreach (['report_id', 'client_id'] as $filter) {
            if (!empty($_GET[$filter])) {
                $where[] = 'ps.' . $filter . ' = :' . $filter;
                $parameters[':' . $filter] = (int) $_GET[$filter];
            }
        }
        $sql = 'SELECT ps.id, ps.client_id, ps.report_id, ps.public_token_preview, ps.expires_at,
                       ps.is_active, ps.created_by, ps.created_at, ps.updated_at,
                       r.report_month, r.report_year, r.status AS report_status,
                       c.name AS client_name, u.name AS created_by_name
                FROM client_portal_shares ps
                INNER JOIN reports r ON r.id = ps.report_id
                INNER JOIN clients c ON c.id = ps.client_id
                LEFT JOIN users u ON u.id = ps.created_by';
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY ps.created_at DESC, ps.id DESC';
        $statement = $pdo->prepare($sql);
        $statement->execute($parameters);
        jsonResponse($statement->fetchAll());
    }

    if ($method === 'POST') {
        $action = $_GET['action'] ?? 'create';
        $data = requestBody();
        if ($action === 'regenerate') {
            $id = queryId();
            $current = portalShare($pdo, $id);
            [$token, $hash, $preview] = newPortalToken();
            $expiresAt = array_key_exists('expires_at', $data) ? ($data['expires_at'] ?: null) : $current['expires_at'];
            $statement = $pdo->prepare(
                'UPDATE client_portal_shares
                 SET share_token_hash = ?, public_token_preview = ?, expires_at = ?, is_active = 1
                 WHERE id = ?'
            );
            $statement->execute([$hash, $preview, $expiresAt, $id]);
            logActivity($pdo, $currentUser, [
                'action_type' => 'regenerated', 'module' => 'client_portal',
                'item_id' => $current['report_id'],
                'item_title' => $current['client_name'] . ' report share',
                'client_id' => $current['client_id'],
                'description' => 'Client portal share link regenerated.',
                'old_value' => ['share_id' => $id, 'token_preview' => $current['public_token_preview']],
                'new_value' => ['share_id' => $id, 'token_preview' => $preview, 'expires_at' => $expiresAt],
            ]);
            jsonResponse(['id' => $id, 'token' => $token, 'public_token_preview' => $preview], 200, 'Share link regenerated.');
        }

        requireFields($data, ['report_id']);
        $report = portalReport($pdo, (int) $data['report_id']);
        [$token, $hash, $preview] = newPortalToken();
        $expiresAt = $data['expires_at'] ?? null;
        $statement = $pdo->prepare(
            'INSERT INTO client_portal_shares
                (client_id, report_id, share_token_hash, public_token_preview, expires_at, is_active, created_by)
             VALUES (?, ?, ?, ?, ?, 1, ?)'
        );
        $statement->execute([
            $report['client_id'], $report['id'], $hash, $preview,
            $expiresAt ?: null, $currentUser['id'],
        ]);
        $id = (int) $pdo->lastInsertId();
        logActivity($pdo, $currentUser, [
            'action_type' => 'created', 'module' => 'client_portal',
            'item_id' => $report['id'], 'item_title' => $report['client_name'] . ' report share',
            'client_id' => $report['client_id'],
            'description' => 'Client portal share link created.',
            'new_value' => ['share_id' => $id, 'token_preview' => $preview, 'expires_at' => $expiresAt],
        ]);
        createNotification($pdo, (int) $currentUser['id'], [
            'type' => 'report_shared', 'title' => 'Report share link created',
            'message' => $report['client_name'] . ' report is ready to share.',
            'related_module' => 'reports', 'related_id' => $report['id'],
            'client_id' => $report['client_id'], 'client_name' => $report['client_name'],
            'priority' => 'normal', 'action_url' => 'Reports',
        ], $currentUser);
        jsonResponse(['id' => $id, 'token' => $token, 'public_token_preview' => $preview], 201, 'Share link created.');
    }

    if ($method === 'PATCH') {
        $id = queryId();
        $action = $_GET['action'] ?? 'deactivate';
        $current = portalShare($pdo, $id);
        if ($action === 'copy') {
            logActivity($pdo, $currentUser, [
                'action_type' => 'copied', 'module' => 'client_portal',
                'item_id' => $current['report_id'], 'item_title' => $current['client_name'] . ' report share',
                'client_id' => $current['client_id'],
                'description' => 'Client portal share link copied.',
                'new_value' => ['share_id' => $id, 'token_preview' => $current['public_token_preview']],
            ]);
            jsonResponse(['id' => $id], 200, 'Share link copy recorded.');
        }
        $pdo->prepare('UPDATE client_portal_shares SET is_active = 0 WHERE id = ?')->execute([$id]);
        logActivity($pdo, $currentUser, [
            'action_type' => 'deactivated', 'module' => 'client_portal',
            'item_id' => $current['report_id'], 'item_title' => $current['client_name'] . ' report share',
            'client_id' => $current['client_id'],
            'description' => 'Client portal share link deactivated.',
            'old_value' => ['share_id' => $id, 'is_active' => 1],
            'new_value' => ['share_id' => $id, 'is_active' => 0],
        ]);
        jsonResponse(['id' => $id], 200, 'Share link deactivated.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    handleException($exception);
}
