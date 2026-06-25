<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';
require_once __DIR__ . '/../helpers/activity_logger.php';

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
    $currentUser = requireAuth($pdo);
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $listClientId = filter_input(INPUT_GET, 'client_id', FILTER_VALIDATE_INT);
        $hasPeriod = isset($_GET['month']) || isset($_GET['year']);

        if (!$listClientId && !$hasPeriod) {
            $statement = $pdo->query(
                'SELECT r.id, r.client_id, c.name AS client_name, r.report_month, r.report_year,
                        r.status, r.created_at
                 FROM reports r
                 INNER JOIN clients c ON c.id = r.client_id
                 ORDER BY r.report_year DESC, r.report_month DESC, r.created_at DESC'
            );
            jsonResponse($statement->fetchAll());
        }

        if ($listClientId && !$hasPeriod) {
            $statement = $pdo->prepare(
                'SELECT id, client_id, report_month, report_year, report_content, status, created_at
                 FROM reports
                 WHERE client_id = ?
                 ORDER BY report_year DESC, report_month DESC, created_at DESC'
            );
            $statement->execute([$listClientId]);
            jsonResponse($statement->fetchAll());
        }

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

        if ($completed !== []) {
            $completedIds = array_column($completed, 'id');
            $placeholders = implode(',', array_fill(0, count($completedIds), '?'));
            $attachmentStatement = $pdo->prepare(
                'SELECT id, task_id, attachment_type, title, url, created_at
                 FROM task_attachments
                 WHERE task_id IN (' . $placeholders . ')
                 ORDER BY created_at ASC, id ASC'
            );
            $attachmentStatement->execute($completedIds);
            $attachmentsByTask = [];

            foreach ($attachmentStatement->fetchAll() as $attachment) {
                $attachmentsByTask[(string) $attachment['task_id']][] = $attachment;
            }

            foreach ($completed as &$task) {
                $task['attachments'] = $attachmentsByTask[(string) $task['id']] ?? [];
            }
            unset($task);
        }

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
                    (completed_at IS NOT NULL AND MONTH(completed_at) = :completed_month AND YEAR(completed_at) = :completed_year)
                    OR
                    (completed_at IS NULL AND MONTH(created_at) = :created_month AND YEAR(created_at) = :created_year)
               )
             ORDER BY created_at ASC'
        );
        $billableStatement->execute([
            ':client_id' => $clientId,
            ':completed_month' => $month,
            ':completed_year' => $year,
            ':created_month' => $month,
            ':created_year' => $year,
        ]);
        $billable = $billableStatement->fetchAll();

        $deliveredCategories = ['Design', 'Content', 'Social Media', 'Campaign', 'Presentation'];
        $deliverables = array_values(array_filter($completed, function (array $task) use ($deliveredCategories): bool {
            return in_array($task['category'], $deliveredCategories, true);
        }));

        $technicalCategories = ['Web', 'Technical', 'Development', 'SEO', 'Digital'];
        $technicalWork = array_values(array_filter($completed, function (array $task) use ($technicalCategories): bool {
            return in_array($task['category'], $technicalCategories, true);
        }));

        $revisions = array_values(array_filter($completed, function (array $task): bool {
            return stripos((string) $task['title'], 'revision') !== false
                || stripos((string) $task['description'], 'revision') !== false;
        }));

        $billableTotal = array_reduce($billable, function (float $total, array $task): float {
            return $total + (float) $task['billable_amount'];
        }, 0.0);

        $savedReportStatement = $pdo->prepare(
            'SELECT id, status, created_at
             FROM reports
             WHERE client_id = :client_id
               AND report_month = :month
               AND report_year = :year
             LIMIT 1'
        );
        $savedReportStatement->execute([
            ':client_id' => $clientId,
            ':month' => $month,
            ':year' => $year,
        ]);
        $savedReport = $savedReportStatement->fetch() ?: null;
        logActivity($pdo, $currentUser, [
            'action_type' => 'generated', 'module' => 'reports',
            'item_id' => $savedReport['id'] ?? null,
            'item_title' => date('F Y', mktime(0, 0, 0, $month, 1, $year)) . ' report',
            'client_id' => $clientId, 'client_name' => $client['name'],
            'description' => 'Report generated for ' . date('F Y', mktime(0, 0, 0, $month, 1, $year)) . '.',
        ]);

        jsonResponse([
            'client' => $client,
            'period' => ['month' => $month, 'year' => $year],
            'work_completed' => $completed,
            'deliverables' => $deliverables,
            'technical_work' => $technicalWork,
            'revisions_completed' => $revisions,
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
            'saved_report' => $savedReport,
        ]);
    }

    if ($method === 'POST') {
        $data = requestBody();
        requireFields($data, ['client_id', 'report_month', 'report_year', 'report_content']);

        $content = is_string($data['report_content'])
            ? $data['report_content']
            : json_encode($data['report_content'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $existingStatement = $pdo->prepare(
            'SELECT id, status, report_content FROM reports
             WHERE client_id = ? AND report_month = ? AND report_year = ?'
        );
        $existingStatement->execute([(int) $data['client_id'], (int) $data['report_month'], (int) $data['report_year']]);
        $existing = $existingStatement->fetch();
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
        $reportId = (int) ($pdo->lastInsertId() ?: ($existing['id'] ?? 0));
        logActivity($pdo, $currentUser, [
            'action_type' => $existing ? 'status_updated' : 'created',
            'module' => 'reports', 'item_id' => $reportId,
            'item_title' => date('F Y', mktime(0, 0, 0, (int) $data['report_month'], 1, (int) $data['report_year'])) . ' report',
            'client_id' => (int) $data['client_id'],
            'description' => $existing ? 'Report content or status updated.' : 'Report saved.',
            'old_value' => $existing,
            'new_value' => ['status' => $data['status'] ?? 'Draft', 'report_content' => $content],
        ]);

        jsonResponse([
            'id' => $reportId,
        ], 201, 'Report saved.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    handleException($exception);
}
