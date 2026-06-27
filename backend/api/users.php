<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';
require_once __DIR__ . '/../helpers/activity_logger.php';

bootstrapApi();

function findUser(PDO $pdo, int $id): array
{
    $statement = $pdo->prepare(
        'SELECT id, name, email, role, status, created_at
         FROM users WHERE id = ?'
    );
    $statement->execute([$id]);
    $user = $statement->fetch();

    if (!$user) {
        errorResponse('User not found.', 404);
    }

    return $user;
}

function validRole(string $role): bool
{
    return in_array($role, ['admin', 'manager', 'member'], true);
}

function validStatus(string $status): bool
{
    return in_array($status, ['active', 'inactive'], true);
}

try {
    $pdo = Database::connect();
    $currentUser = requireAuth($pdo);
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        if (($_GET['action'] ?? '') === 'assignees') {
            $statement = $pdo->query(
                'SELECT id, name, role
                 FROM users
                 WHERE status = "active"
                 ORDER BY name ASC'
            );
            jsonResponse($statement->fetchAll());
        }
        if ($currentUser['role'] !== 'admin') {
            jsonResponse(findUser($pdo, (int) $currentUser['id']));
        }

        $statement = $pdo->query(
            'SELECT id, name, email, role, status, created_at
             FROM users
             ORDER BY status ASC, name ASC'
        );
        jsonResponse($statement->fetchAll());
    }

    requireAdmin($currentUser);

    if ($method === 'POST') {
        $data = requestBody();
        requireFields($data, ['name', 'email', 'password', 'role', 'status']);

        $email = strtolower(trim((string) $data['email']));
        $role = (string) $data['role'];
        $status = (string) $data['status'];

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            errorResponse('A valid email address is required.', 422);
        }
        if (!validRole($role) || !validStatus($status)) {
            errorResponse('Invalid user role or status.', 422);
        }
        if (strlen((string) $data['password']) < 8) {
            errorResponse('Password must be at least 8 characters.', 422);
        }

        $duplicate = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $duplicate->execute([$email]);
        if ($duplicate->fetch()) {
            errorResponse('A user with this email already exists.', 409);
        }

        $statement = $pdo->prepare(
            'INSERT INTO users (name, email, password, role, status)
             VALUES (:name, :email, :password, :role, :status)'
        );
        $statement->execute([
            ':name' => trim((string) $data['name']),
            ':email' => $email,
            ':password' => password_hash((string) $data['password'], PASSWORD_DEFAULT),
            ':role' => $role,
            ':status' => $status,
        ]);

        $id = (int) $pdo->lastInsertId();
        $created = findUser($pdo, $id);
        logActivity($pdo, $currentUser, [
            'action_type' => 'created', 'module' => 'users', 'item_id' => $id,
            'item_title' => $created['name'], 'description' => 'User created.', 'new_value' => $created,
        ]);
        jsonResponse(['id' => $id], 201, 'User created.');
    }

    if ($method === 'PUT' || ($method === 'PATCH' && ($_GET['action'] ?? '') !== 'password')) {
        $id = queryId();
        $existing = findUser($pdo, $id);
        $data = array_merge($existing, requestBody());
        requireFields($data, ['name', 'email', 'role', 'status']);

        $email = strtolower(trim((string) $data['email']));
        $role = (string) $data['role'];
        $status = (string) $data['status'];

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            errorResponse('A valid email address is required.', 422);
        }
        if (!validRole($role) || !validStatus($status)) {
            errorResponse('Invalid user role or status.', 422);
        }
        if ($id === (int) $currentUser['id'] && ($status !== 'active' || $role !== 'admin')) {
            errorResponse('You cannot remove your own active administrator access.', 422);
        }

        $duplicate = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id <> ?');
        $duplicate->execute([$email, $id]);
        if ($duplicate->fetch()) {
            errorResponse('A user with this email already exists.', 409);
        }

        $statement = $pdo->prepare(
            'UPDATE users SET
                name = :name,
                email = :email,
                role = :role,
                status = :status_value,
                api_token = CASE WHEN :token_status = "inactive" THEN NULL ELSE api_token END,
                token_expires_at = CASE WHEN :expiry_status = "inactive" THEN NULL ELSE token_expires_at END
             WHERE id = :id'
        );
        $statement->execute([
            ':name' => trim((string) $data['name']),
            ':email' => $email,
            ':role' => $role,
            ':status_value' => $status,
            ':token_status' => $status,
            ':expiry_status' => $status,
            ':id' => $id,
        ]);

        $updated = findUser($pdo, $id);
        logActivity($pdo, $currentUser, [
            'action_type' => 'updated', 'module' => 'users', 'item_id' => $id,
            'item_title' => $updated['name'], 'description' => 'User updated.',
            'old_value' => $existing, 'new_value' => $updated,
        ]);
        jsonResponse($updated, 200, 'User updated.');
    }

    if ($method === 'PATCH' && ($_GET['action'] ?? '') === 'password') {
        $id = queryId();
        findUser($pdo, $id);
        $data = requestBody();
        requireFields($data, ['password']);

        if (strlen((string) $data['password']) < 8) {
            errorResponse('Password must be at least 8 characters.', 422);
        }

        $statement = $pdo->prepare(
            'UPDATE users
             SET password = ?, api_token = NULL, token_expires_at = NULL
             WHERE id = ?'
        );
        $statement->execute([
            password_hash((string) $data['password'], PASSWORD_DEFAULT),
            $id,
        ]);
        logActivity($pdo, $currentUser, [
            'action_type' => 'password_changed', 'module' => 'users', 'item_id' => $id,
            'item_title' => findUser($pdo, $id)['name'], 'description' => 'User password changed.',
        ]);

        jsonResponse(['id' => $id], 200, 'Password changed.');
    }

    if ($method === 'DELETE') {
        $id = queryId();
        $existing = findUser($pdo, $id);

        if ($id === (int) $currentUser['id']) {
            errorResponse('You cannot deactivate your own account.', 422);
        }

        $statement = $pdo->prepare(
            'UPDATE users
             SET status = "inactive", api_token = NULL, token_expires_at = NULL
             WHERE id = ?'
        );
        $statement->execute([$id]);
        logActivity($pdo, $currentUser, [
            'action_type' => 'deactivated', 'module' => 'users', 'item_id' => $id,
            'item_title' => $existing['name'], 'description' => 'User deactivated.',
            'old_value' => $existing, 'new_value' => array_merge($existing, ['status' => 'inactive']),
        ]);

        jsonResponse(['id' => $id], 200, 'User deactivated.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    handleException($exception);
}
