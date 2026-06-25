<?php

declare(strict_types=1);

function bootstrapApi(): void
{
    $origin = getenv('CORS_ORIGIN') ?: '*';

    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function jsonResponse($data = null, int $status = 200, string $message = ''): void
{
    http_response_code($status);

    $payload = [
        'success' => $status >= 200 && $status < 300,
    ];

    if ($message !== '') {
        $payload['message'] = $message;
    }

    if ($data !== null) {
        $payload['data'] = $data;
    }

    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function errorResponse(string $message, int $status = 400, array $errors = []): void
{
    $payload = null;

    if ($errors !== []) {
        $payload = ['errors' => $errors];
    }

    jsonResponse($payload, $status, $message);
}

function requestBody(): array
{
    $rawBody = file_get_contents('php://input');

    if ($rawBody === false || trim($rawBody) === '') {
        return [];
    }

    $data = json_decode($rawBody, true);

    if (!is_array($data)) {
        errorResponse('Request body must contain valid JSON.', 422);
    }

    return $data;
}

function requireFields(array $data, array $fields): void
{
    $missing = [];

    foreach ($fields as $field) {
        if (!array_key_exists($field, $data) || $data[$field] === '' || $data[$field] === null) {
            $missing[] = $field;
        }
    }

    if ($missing !== []) {
        errorResponse('Required fields are missing.', 422, $missing);
    }
}

function queryId(): int
{
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

    if (!$id || $id < 1) {
        errorResponse('A valid id query parameter is required.', 422);
    }

    return $id;
}

function boolValue($value): int
{
    return filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
}

function handleException(Throwable $exception): void
{
    $isDevelopment = (getenv('APP_ENV') ?: 'production') === 'development';
    $message = $isDevelopment ? $exception->getMessage() : 'An unexpected server error occurred.';

    errorResponse($message, 500);
}
