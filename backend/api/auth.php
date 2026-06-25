<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';

bootstrapApi();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        errorResponse('Method not allowed.', 405);
    }

    $pdo = Database::connect();

    if (($_GET['action'] ?? '') === 'logout') {
        $currentUser = requireAuth($pdo);
        $statement = $pdo->prepare(
            'UPDATE users SET api_token = NULL, token_expires_at = NULL WHERE id = ?'
        );
        $statement->execute([$currentUser['id']]);
        jsonResponse(null, 200, 'Logout successful.');
    }

    $data = requestBody();
    requireFields($data, ['email', 'password']);

    $statement = $pdo->prepare(
        'SELECT id, name, email, password, role, status, created_at
         FROM users
         WHERE email = ? AND status = "active"
         LIMIT 1'
    );
    $statement->execute([strtolower(trim((string) $data['email']))]);
    $user = $statement->fetch();

    if (!$user || !password_verify((string) $data['password'], $user['password'])) {
        errorResponse('Invalid email or password.', 401);
    }

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $expiresAt = (new DateTimeImmutable('+7 days'))->format('Y-m-d H:i:s');

    $tokenStatement = $pdo->prepare(
        'UPDATE users SET api_token = :api_token, token_expires_at = :token_expires_at WHERE id = :id'
    );
    $tokenStatement->execute([
        ':api_token' => $tokenHash,
        ':token_expires_at' => $expiresAt,
        ':id' => $user['id'],
    ]);

    unset($user['password']);

    jsonResponse([
        'user' => $user,
        'token' => $token,
        'token_expires_at' => $expiresAt,
    ], 200, 'Login successful.');
} catch (Throwable $exception) {
    handleException($exception);
}
