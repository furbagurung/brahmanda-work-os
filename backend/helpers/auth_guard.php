<?php

declare(strict_types=1);

function bearerToken(): ?string
{
    $authorization = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? null;

    if (!$authorization && function_exists('getallheaders')) {
        $headers = getallheaders();
        $authorization = $headers['Authorization'] ?? $headers['authorization'] ?? null;
    }

    if (!$authorization || !preg_match('/^Bearer\s+(.+)$/i', trim($authorization), $matches)) {
        return null;
    }

    return trim($matches[1]);
}

function requireAuth(PDO $pdo): array
{
    $token = bearerToken();

    if (!$token || !preg_match('/^[a-f0-9]{64}$/i', $token)) {
        errorResponse('Authentication required.', 401);
    }

    $tokenHash = hash('sha256', $token);
    $statement = $pdo->prepare(
        'SELECT id, name, email, role, status, created_at, token_expires_at
         FROM users
         WHERE api_token = ?
           AND status = "active"
           AND token_expires_at IS NOT NULL
           AND token_expires_at > NOW()
         LIMIT 1'
    );
    $statement->execute([$tokenHash]);
    $user = $statement->fetch();

    if (!$user) {
        errorResponse('Invalid or expired authentication token.', 401);
    }

    return $user;
}

function requireAdmin(array $user): void
{
    if (($user['role'] ?? '') !== 'admin') {
        errorResponse('Administrator access is required.', 403);
    }
}
