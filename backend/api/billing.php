<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

bootstrapApi();

try {
    $pdo = Database::connect();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $where = ['t.is_billable = 1'];
        $parameters = [];

        if (!empty($_GET['client_id'])) {
            $where[] = 't.client_id = :client_id';
            $parameters[':client_id'] = (int) $_GET['client_id'];
        }

        if (!empty($_GET['payment_status'])) {
            $where[] = 't.payment_status = :payment_status';
            $parameters[':payment_status'] = $_GET['payment_status'];
        }

        $statement = $pdo->prepare(
            'SELECT t.id AS task_id, t.client_id, c.name AS client_name, t.title AS work_title,
                    t.billable_amount AS amount, t.payment_status, t.invoice_status,
                    COALESCE(b.billing_date, DATE(t.created_at)) AS billing_date,
                    t.status AS task_status
             FROM tasks t
             INNER JOIN clients c ON c.id = t.client_id
             LEFT JOIN billings b ON b.task_id = t.id
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY billing_date DESC, t.created_at DESC'
        );
        $statement->execute($parameters);
        $items = $statement->fetchAll();

        $totals = [
            'total' => 0.0,
            'paid' => 0.0,
            'unpaid' => 0.0,
        ];

        foreach ($items as $item) {
            $amount = (float) $item['amount'];
            $totals['total'] += $amount;
            $totals[strtolower($item['payment_status'])] += $amount;
        }

        jsonResponse(['items' => $items, 'totals' => $totals]);
    }

    if ($method === 'PATCH' || $method === 'PUT') {
        $taskId = queryId();
        $data = requestBody();

        if (!isset($data['payment_status']) && !isset($data['invoice_status'])) {
            errorResponse('payment_status or invoice_status is required.', 422);
        }

        $pdo->beginTransaction();

        $taskStatement = $pdo->prepare('SELECT * FROM tasks WHERE id = ? AND is_billable = 1');
        $taskStatement->execute([$taskId]);
        $task = $taskStatement->fetch();

        if (!$task) {
            errorResponse('Billable task not found.', 404);
        }

        $paymentStatus = $data['payment_status'] ?? $task['payment_status'];
        $invoiceStatus = $data['invoice_status'] ?? $task['invoice_status'];

        $statement = $pdo->prepare(
            'UPDATE tasks
             SET payment_status = :payment_status, invoice_status = :invoice_status
             WHERE id = :id'
        );
        $statement->execute([
            ':payment_status' => $paymentStatus,
            ':invoice_status' => $invoiceStatus,
            ':id' => $taskId,
        ]);

        $statement = $pdo->prepare(
            'INSERT INTO billings
                (client_id, task_id, work_title, amount, payment_status, invoice_status, billing_date)
             VALUES
                (:client_id, :task_id, :work_title, :amount, :payment_status, :invoice_status, :billing_date)
             ON DUPLICATE KEY UPDATE
                payment_status = VALUES(payment_status),
                invoice_status = VALUES(invoice_status),
                amount = VALUES(amount),
                work_title = VALUES(work_title)'
        );
        $statement->execute([
            ':client_id' => $task['client_id'],
            ':task_id' => $taskId,
            ':work_title' => $task['title'],
            ':amount' => $task['billable_amount'],
            ':payment_status' => $paymentStatus,
            ':invoice_status' => $invoiceStatus,
            ':billing_date' => substr((string) ($task['completed_at'] ?: $task['created_at']), 0, 10),
        ]);

        $pdo->commit();
        jsonResponse(['task_id' => $taskId], 200, 'Billing status updated.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    handleException($exception);
}
