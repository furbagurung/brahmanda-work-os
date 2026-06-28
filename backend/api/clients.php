<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';
require_once __DIR__ . '/../helpers/activity_logger.php';
require_once __DIR__ . '/../helpers/image_optimizer.php';

bootstrapApi();

function normalizeCoverColor(mixed $value): ?string
{
    $coverColor = strtolower(trim((string) $value));
    return in_array($coverColor, ['purple', 'emerald', 'ocean', 'amber', 'rose', 'slate'], true)
        ? $coverColor
        : null;
}

try {
    $pdo = Database::connect();
    $currentUser = requireAuth($pdo);
    $method = $_SERVER['REQUEST_METHOD'];
    $action = trim((string) ($_GET['action'] ?? ''));

    if ($action === 'logo' && in_array($method, ['POST', 'DELETE'], true)) {
        $id = queryId();
        $currentStatement = $pdo->prepare('SELECT * FROM clients WHERE id = ?');
        $currentStatement->execute([$id]);
        $current = $currentStatement->fetch();
        if (!$current) {
            errorResponse('Client not found.', 404);
        }

        if ($method === 'DELETE') {
            $statement = $pdo->prepare(
                'UPDATE clients
                 SET logo_path = NULL, logo_url = NULL, logo_original_name = NULL
                 WHERE id = ?'
            );
            $statement->execute([$id]);
            $oldFilename = basename((string) ($current['logo_path'] ?? ''));
            if ($oldFilename !== '') {
                $oldPath = clientLogoUploadDirectory() . '/' . $oldFilename;
                if (is_file($oldPath)) {
                    @unlink($oldPath);
                }
            }
            logActivity($pdo, $currentUser, [
                'action_type' => 'updated', 'module' => 'clients', 'item_id' => $id,
                'item_title' => $current['name'], 'client_id' => $id,
                'client_name' => $current['name'], 'description' => 'Client logo removed.',
                'old_value' => $current, 'new_value' => ['logo_url' => null],
            ]);
            jsonResponse(['id' => $id, 'logo_url' => null], 200, 'Client logo removed.');
        }

        $file = $_FILES['logo'] ?? null;
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            errorResponse('A client logo image is required.', 422);
        }
        if ((int) ($file['size'] ?? 0) > 5 * 1024 * 1024) {
            errorResponse('Client logo must be 5MB or smaller.', 422);
        }
        $temporaryPath = (string) ($file['tmp_name'] ?? '');
        if ($temporaryPath === '' || !is_uploaded_file($temporaryPath)) {
            errorResponse('The uploaded logo could not be verified.', 422);
        }
        $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($temporaryPath) ?: '';
        $extensions = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];
        if (!isset($extensions[$mimeType])) {
            errorResponse('Only JPG, PNG, and WEBP logos are allowed.', 422);
        }

        $directory = clientLogoUploadDirectory();
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
            errorResponse('Client logo storage is unavailable.', 500);
        }
        $filename = 'client-' . $id . '-' . bin2hex(random_bytes(12)) . '.' . $extensions[$mimeType];
        $destination = $directory . '/' . $filename;
        $optimizationError = optimizeClientLogo($temporaryPath, $destination, $mimeType);
        if ($optimizationError !== null) {
            errorResponse($optimizationError, 422);
        }

        $logoUrl = clientLogoPublicUrl($filename);
        $originalName = substr(basename((string) ($file['name'] ?? 'logo')), 0, 255);
        try {
            $statement = $pdo->prepare(
                'UPDATE clients
                 SET logo_path = :logo_path, logo_url = :logo_url,
                     logo_original_name = :logo_original_name
                 WHERE id = :id'
            );
            $statement->execute([
                ':logo_path' => $filename,
                ':logo_url' => $logoUrl,
                ':logo_original_name' => $originalName,
                ':id' => $id,
            ]);
        } catch (Throwable $exception) {
            if (is_file($destination)) {
                @unlink($destination);
            }
            throw $exception;
        }

        $oldFilename = basename((string) ($current['logo_path'] ?? ''));
        if ($oldFilename !== '' && $oldFilename !== $filename) {
            $oldPath = $directory . '/' . $oldFilename;
            if (is_file($oldPath)) {
                @unlink($oldPath);
            }
        }
        logActivity($pdo, $currentUser, [
            'action_type' => 'updated', 'module' => 'clients', 'item_id' => $id,
            'item_title' => $current['name'], 'client_id' => $id,
            'client_name' => $current['name'], 'description' => 'Client logo updated.',
            'old_value' => $current, 'new_value' => ['logo_url' => $logoUrl],
        ]);
        jsonResponse([
            'id' => $id,
            'logo_path' => $filename,
            'logo_url' => $logoUrl,
            'logo_original_name' => $originalName,
        ], 200, 'Client logo updated.');
    }

    if ($method === 'GET') {
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

        if ($id) {
            $statement = $pdo->prepare(
                'SELECT c.*,
                    COUNT(t.id) AS total_tasks,
                    COALESCE(SUM(t.status = "Completed"), 0) AS completed_tasks,
                    COALESCE(SUM(t.status <> "Completed"), 0) AS pending_tasks,
                    COALESCE(SUM(CASE WHEN t.is_billable = 1 THEN t.billable_amount ELSE 0 END), 0) AS billable_amount
                 FROM clients c
                 LEFT JOIN tasks t ON t.client_id = c.id
                 WHERE c.id = ?
                 GROUP BY c.id'
            );
            $statement->execute([$id]);
            $client = $statement->fetch();

            if (!$client) {
                errorResponse('Client not found.', 404);
            }

            jsonResponse($client);
        }

        $statement = $pdo->query(
            'SELECT c.*,
                COUNT(t.id) AS total_tasks,
                COALESCE(SUM(t.status = "Completed"), 0) AS completed_tasks,
                COALESCE(SUM(t.status <> "Completed"), 0) AS pending_tasks,
                COALESCE(SUM(CASE WHEN t.is_billable = 1 THEN t.billable_amount ELSE 0 END), 0) AS billable_amount
             FROM clients c
             LEFT JOIN tasks t ON t.client_id = c.id
             GROUP BY c.id
             ORDER BY c.created_at DESC'
        );

        jsonResponse($statement->fetchAll());
    }

    if ($method === 'POST') {
        $data = requestBody();
        requireFields($data, ['name']);

        $statement = $pdo->prepare(
            'INSERT INTO clients
                (name, contact_person, phone, email, service_package, monthly_fee, start_date, status, notes, cover_color)
             VALUES
                (:name, :contact_person, :phone, :email, :service_package, :monthly_fee, :start_date, :status, :notes, :cover_color)'
        );
        $statement->execute([
            ':name' => trim((string) $data['name']),
            ':contact_person' => $data['contact_person'] ?? null,
            ':phone' => $data['phone'] ?? null,
            ':email' => $data['email'] ?? null,
            ':service_package' => $data['service_package'] ?? null,
            ':monthly_fee' => (float) ($data['monthly_fee'] ?? 0),
            ':start_date' => $data['start_date'] ?? null,
            ':status' => $data['status'] ?? 'active',
            ':notes' => $data['notes'] ?? null,
            ':cover_color' => normalizeCoverColor($data['cover_color'] ?? null),
        ]);

        $id = (int) $pdo->lastInsertId();
        logActivity($pdo, $currentUser, [
            'action_type' => 'created', 'module' => 'clients', 'item_id' => $id,
            'item_title' => trim((string) $data['name']), 'client_id' => $id,
            'client_name' => trim((string) $data['name']),
            'description' => 'Client created.', 'new_value' => $data,
        ]);
        jsonResponse(['id' => $id], 201, 'Client created.');
    }

    if ($method === 'PUT' || $method === 'PATCH') {
        $id = queryId();
        $data = requestBody();

        $currentStatement = $pdo->prepare('SELECT * FROM clients WHERE id = ?');
        $currentStatement->execute([$id]);
        $current = $currentStatement->fetch();

        if (!$current) {
            errorResponse('Client not found.', 404);
        }

        $merged = array_merge($current, $data);
        requireFields($merged, ['name']);

        $statement = $pdo->prepare(
            'UPDATE clients SET
                name = :name,
                contact_person = :contact_person,
                phone = :phone,
                email = :email,
                service_package = :service_package,
                monthly_fee = :monthly_fee,
                start_date = :start_date,
                status = :status,
                notes = :notes,
                cover_color = :cover_color
             WHERE id = :id'
        );
        $statement->execute([
            ':name' => trim((string) $merged['name']),
            ':contact_person' => $merged['contact_person'] ?: null,
            ':phone' => $merged['phone'] ?: null,
            ':email' => $merged['email'] ?: null,
            ':service_package' => $merged['service_package'] ?: null,
            ':monthly_fee' => (float) $merged['monthly_fee'],
            ':start_date' => $merged['start_date'] ?: null,
            ':status' => $merged['status'],
            ':notes' => $merged['notes'] ?: null,
            ':cover_color' => normalizeCoverColor($merged['cover_color'] ?? null),
            ':id' => $id,
        ]);
        logActivity($pdo, $currentUser, [
            'action_type' => ($current['status'] !== 'inactive' && $merged['status'] === 'inactive') ? 'deactivated' : 'updated',
            'module' => 'clients', 'item_id' => $id,
            'item_title' => $merged['name'], 'client_id' => $id, 'client_name' => $merged['name'],
            'description' => 'Client updated.', 'old_value' => $current, 'new_value' => $merged,
        ]);

        jsonResponse(['id' => $id], 200, 'Client updated.');
    }

    if ($method === 'DELETE') {
        $id = queryId();
        $currentStatement = $pdo->prepare('SELECT * FROM clients WHERE id = ?');
        $currentStatement->execute([$id]);
        $current = $currentStatement->fetch();
        $statement = $pdo->prepare('DELETE FROM clients WHERE id = ?');
        $statement->execute([$id]);

        if ($statement->rowCount() === 0) {
            errorResponse('Client not found.', 404);
        }
        logActivity($pdo, $currentUser, [
            'action_type' => 'deleted', 'module' => 'clients', 'item_id' => $id,
            'item_title' => $current['name'] ?? 'Client', 'client_id' => $id,
            'client_name' => $current['name'] ?? null, 'description' => 'Client deleted.',
            'old_value' => $current,
        ]);
        $logoFilename = basename((string) ($current['logo_path'] ?? ''));
        if ($logoFilename !== '') {
            $logoPath = clientLogoUploadDirectory() . '/' . $logoFilename;
            if (is_file($logoPath)) {
                @unlink($logoPath);
            }
        }

        jsonResponse(['id' => $id], 200, 'Client deleted.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    handleException($exception);
}
