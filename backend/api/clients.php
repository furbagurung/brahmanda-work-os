<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';

bootstrapApi();

try {
    $pdo = Database::connect();
    $currentUser = requireAuth($pdo);
    $method = $_SERVER['REQUEST_METHOD'];

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
                (name, contact_person, phone, email, service_package, monthly_fee, start_date, status, notes)
             VALUES
                (:name, :contact_person, :phone, :email, :service_package, :monthly_fee, :start_date, :status, :notes)'
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
        ]);

        jsonResponse(['id' => (int) $pdo->lastInsertId()], 201, 'Client created.');
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
                notes = :notes
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
            ':id' => $id,
        ]);

        jsonResponse(['id' => $id], 200, 'Client updated.');
    }

    if ($method === 'DELETE') {
        $id = queryId();
        $statement = $pdo->prepare('DELETE FROM clients WHERE id = ?');
        $statement->execute([$id]);

        if ($statement->rowCount() === 0) {
            errorResponse('Client not found.', 404);
        }

        jsonResponse(['id' => $id], 200, 'Client deleted.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    handleException($exception);
}
