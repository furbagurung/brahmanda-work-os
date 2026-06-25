<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

bootstrapApi();

function reportPeriod(): array
{
    $clientId = filter_input(INPUT_GET, 'client_id', FILTER_VALIDATE_INT);
    $month = filter_input(INPUT_GET, 'month', FILTER_VALIDATE_INT);
    $year = filter_input(INPUT_GET, 'year', FILTER_VALIDATE_INT);

    if (!$clientId || !$month || $month < 1 || $month > 12 || !$year || $year < 2000 || $year > 2100) {
        errorResponse('Valid client_id, month, and year query parameters are required.', 422);
    }

    return [$clientId, $month, $year];
}

try {
    $pdo = Database::connect();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        list($clientId, $month, $year) = reportPeriod();

        $clientStatement = $pdo->prepare('SELECT * FROM clients WHERE id = ?');
        $clientStatement->execute([$clientId]);
        $client = $clientStatement->fetch();

        if (!$client) {
            errorResponse('Client not found.', 404);
        }

        $completedStatement = $pdo->prepare(
            'SELECT id, title, description, category, proof_link, is_billable, billable_amount, completed_at
             FROM tasks
             WHERE client_id = :client_id
               AND status = "Completed"
               AND MONTH(completed_at) = :month
               AND YEAR(completed_at) = :year
             ORDER BY completed_at ASC'
        );
        $completedStatement->execute([
            ':client_id' => $clientId,
            ':month' => $month,
            ':year' => $year,
        ]);
        $completed = $completedStatement->fetchAll();

        $pendingStatement = $pdo->prepare(
            'SELECT id, title, category, priority, deadline, status
             FROM tasks
             WHERE client_id = ? AND status <> "Completed"
             ORDER BY deadline IS NULL, deadline ASC'
        );
        $pendingStatement->execute([$clientId]);
        $pending = $pendingStatement->fetchAll();

        $billableStatement = $pdo->prepare(
            'SELECT id, title, billable_amount, payment_status, invoice_status
             FROM tasks
             WHERE client_id = :client_id
               AND is_billable = 1
               AND (
                    (completed_at IS NOT NULL AND MONTH(completed_at) = :month AND YEAR(completed_at) = :year)
                    OR
                    (completed_at IS NULL AND MONTH(created_at) = :month AND YEAR(created_at) = :year)
               )
             ORDER BY created_at ASC'
        );
        $billableStatement->execute([
            ':client_id' => $clientId,
            ':month' => $month,
            ':year' => $year,
        ]);
        $billable = $billableStatement->fetchAll();

        $deliveredCategories = ['Design', 'Content', 'Social Media', 'Campaign', 'Presentation'];
        $deliverables = array_values(array_filter($completed, function (array $task) use ($deliveredCategories): bool {
            return in_array($task['category'], $deliveredCategories, true);
        }));

        $billableTotal = array_reduce($billable, function (float $total, array $task): float {
            return $total + (float) $task['billable_amount'];
        }, 0.0);

        jsonResponse([
            'client' => $client,
            'period' => ['month' => $month, 'year' => $year],
            'work_completed' => $completed,
            'deliverables' => $deliverables,
            'pending_tasks' => $pending,
            'extra_billable_work' => [
                'items' => $billable,
                'total' => $billableTotal,
            ],
            'next_month_plan' => [
                'Complete pending deliverables and revisions.',
                'Review campaign performance and document findings.',
                'Confirm next month priorities with the client.',
            ],
        ]);
    }

    if ($method === 'POST') {
        $data = requestBody();
        requireFields($data, ['client_id', 'report_month', 'report_year', 'report_content']);

        $content = is_string($data['report_content'])
            ? $data['report_content']
            : json_encode($data['report_content'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $statement = $pdo->prepare(
            'INSERT INTO reports
                (client_id, report_month, report_year, report_content, status)
             VALUES
                (:client_id, :report_month, :report_year, :report_content, :status)
             ON DUPLICATE KEY UPDATE
                report_content = VALUES(report_content),
                status = VALUES(status)'
        );
        $statement->execute([
            ':client_id' => (int) $data['client_id'],
            ':report_month' => (int) $data['report_month'],
            ':report_year' => (int) $data['report_year'],
            ':report_content' => $content,
            ':status' => $data['status'] ?? 'Draft',
        ]);

        jsonResponse([
            'id' => (int) ($pdo->lastInsertId() ?: 0),
        ], 201, 'Report saved.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    handleException($exception);
}
