<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

bootstrapApi();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        errorResponse('Method not allowed.', 405);
    }

    $data = requestBody();
    requireFields($data, ['email', 'password']);

    $pdo = Database::connect();
    $statement = $pdo->prepare(
        'SELECT id, name, email, password, role, created_at
         FROM users
         WHERE email = ?
         LIMIT 1'
    );
    $statement->execute([strtolower(trim((string) $data['email']))]);
    $user = $statement->fetch();

    if (!$user || !password_verify((string) $data['password'], $user['password'])) {
        errorResponse('Invalid email or password.', 401);
    }

    unset($user['password']);

    jsonResponse([
        'user' => $user,
        'authentication' => 'Credentials verified. Add token or session handling before production use.',
    ], 200, 'Login successful.');
} catch (Throwable $exception) {
    handleException($exception);
}
