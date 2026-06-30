<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';
require_once __DIR__ . '/../helpers/activity_logger.php';

bootstrapApi();

function billingPeriodFromRequest(): array
{
    $month = filter_input(INPUT_GET, 'month', FILTER_VALIDATE_INT);
    $year = filter_input(INPUT_GET, 'year', FILTER_VALIDATE_INT);

    if (!$month && isset($_POST['month'])) {
        $month = (int) $_POST['month'];
    }
    if (!$year && isset($_POST['year'])) {
        $year = (int) $_POST['year'];
    }

    $month = $month ?: (int) date('n');
    $year = $year ?: (int) date('Y');

    if ($month < 1 || $month > 12 || $year < 2000 || $year > 2100) {
        errorResponse('Valid month and year are required.', 422);
    }

    return [$month, $year];
}

function periodBounds(int $month, int $year): array
{
    $start = sprintf('%04d-%02d-01', $year, $month);
    $end = date('Y-m-t', strtotime($start));
    return [$start, $end];
}

function monthlyStatus(float $paidAmount, float $totalAmount): string
{
    if ($paidAmount <= 0) {
        return 'Unpaid';
    }
    if ($paidAmount >= $totalAmount) {
        return 'Paid';
    }
    return 'Partial';
}

function monthlyInvoiceSnapshot(PDO $pdo, int $clientId, int $month, int $year, ?float $monthlyFeeOverride = null): array
{
    [$start, $end] = periodBounds($month, $year);

    $statement = $pdo->prepare(
        'SELECT c.id AS client_id, c.name AS client_name, c.service_package, c.monthly_fee,
                COALESCE(SUM(CASE WHEN t.is_billable = 0 THEN 1 ELSE 0 END), 0) AS included_task_count,
                COALESCE(SUM(CASE WHEN t.is_billable = 1 THEN 1 ELSE 0 END), 0) AS extra_task_count,
                COALESCE(SUM(CASE WHEN t.is_billable = 1 THEN t.billable_amount ELSE 0 END), 0) AS extra_amount
         FROM clients c
         LEFT JOIN tasks t ON t.client_id = c.id
            AND DATE(COALESCE(t.completed_at, t.deadline, t.created_at)) BETWEEN :start_date AND :end_date
         WHERE c.id = :client_id
         GROUP BY c.id'
    );
    $statement->execute([
        ':client_id' => $clientId,
        ':start_date' => $start,
        ':end_date' => $end,
    ]);
    $row = $statement->fetch();

    if (!$row) {
        errorResponse('Client not found.', 404);
    }

    $monthlyFee = $monthlyFeeOverride ?? (float) $row['monthly_fee'];
    $monthlyFee = max(0.0, $monthlyFee);
    $extraAmount = (float) $row['extra_amount'];

    return [
        'client_id' => $clientId,
        'client_name' => $row['client_name'],
        'service_package' => $row['service_package'],
        'invoice_month' => $month,
        'invoice_year' => $year,
        'monthly_fee' => $monthlyFee,
        'extra_amount' => $extraAmount,
        'total_amount' => $monthlyFee + $extraAmount,
        'included_task_count' => (int) $row['included_task_count'],
        'extra_task_count' => (int) $row['extra_task_count'],
    ];
}

function upsertMonthlyInvoice(
    PDO $pdo,
    int $clientId,
    int $month,
    int $year,
    ?float $paidAmount = null,
    ?string $status = null,
    ?string $notes = null,
    ?float $monthlyFeeOverride = null
): array
{
    $existingStatement = $pdo->prepare(
        'SELECT * FROM monthly_invoices
         WHERE client_id = :client_id AND invoice_month = :month AND invoice_year = :year
         LIMIT 1'
    );
    $existingStatement->execute([
        ':client_id' => $clientId,
        ':month' => $month,
        ':year' => $year,
    ]);
    $existing = $existingStatement->fetch() ?: null;

    $snapshot = monthlyInvoiceSnapshot(
        $pdo,
        $clientId,
        $month,
        $year,
        $monthlyFeeOverride ?? (isset($existing['monthly_fee']) ? (float) $existing['monthly_fee'] : null)
    );

    $nextPaidAmount = $paidAmount ?? (float) ($existing['paid_amount'] ?? 0);
    $totalAmount = (float) $snapshot['total_amount'];

    if ($status === 'Paid') {
        $nextPaidAmount = $totalAmount;
    } elseif ($status === 'Unpaid') {
        $nextPaidAmount = 0.0;
    }

    $nextPaidAmount = max(0.0, min($nextPaidAmount, $totalAmount));
    $nextStatus = $status && in_array($status, ['Unpaid', 'Partial', 'Paid'], true)
        ? $status
        : monthlyStatus($nextPaidAmount, $totalAmount);

    if ($nextPaidAmount <= 0) {
        $nextStatus = 'Unpaid';
    }
    if ($nextPaidAmount >= $totalAmount) {
        $nextStatus = 'Paid';
    }
    if ($nextPaidAmount > 0 && $nextPaidAmount < $totalAmount && $nextStatus === 'Paid') {
        $nextStatus = 'Partial';
    }

    $statement = $pdo->prepare(
        'INSERT INTO monthly_invoices
            (client_id, invoice_month, invoice_year, monthly_fee, extra_amount, total_amount, paid_amount, status, notes)
         VALUES
            (:client_id, :invoice_month, :invoice_year, :monthly_fee, :extra_amount, :total_amount, :paid_amount, :status, :notes)
         ON DUPLICATE KEY UPDATE
            monthly_fee = VALUES(monthly_fee),
            extra_amount = VALUES(extra_amount),
            total_amount = VALUES(total_amount),
            paid_amount = VALUES(paid_amount),
            status = VALUES(status),
            notes = VALUES(notes)'
    );
    $statement->execute([
        ':client_id' => $clientId,
        ':invoice_month' => $month,
        ':invoice_year' => $year,
        ':monthly_fee' => $snapshot['monthly_fee'],
        ':extra_amount' => $snapshot['extra_amount'],
        ':total_amount' => $snapshot['total_amount'],
        ':paid_amount' => $nextPaidAmount,
        ':status' => $nextStatus,
        ':notes' => $notes ?? ($existing['notes'] ?? null),
    ]);

    $idStatement = $pdo->prepare(
        'SELECT mi.*, c.name AS client_name, c.service_package
         FROM monthly_invoices mi
         INNER JOIN clients c ON c.id = mi.client_id
         WHERE mi.client_id = :client_id AND mi.invoice_month = :month AND mi.invoice_year = :year
         LIMIT 1'
    );
    $idStatement->execute([
        ':client_id' => $clientId,
        ':month' => $month,
        ':year' => $year,
    ]);
    $invoice = $idStatement->fetch();

    return array_merge($snapshot, $invoice ?: []);
}

function monthlyInvoiceRows(PDO $pdo, int $month, int $year, ?int $clientId = null): array
{
    [$start, $end] = periodBounds($month, $year);
    $where = $clientId ? 'c.id = :client_id' : 'c.status = "active"';
    $parameters = [
        ':month' => $month,
        ':year' => $year,
        ':start_date' => $start,
        ':end_date' => $end,
    ];
    if ($clientId) {
        $parameters[':client_id'] = $clientId;
    }

    $statement = $pdo->prepare(
        'SELECT c.id AS client_id, c.name AS client_name, c.service_package,
                mi.id, mi.invoice_month, mi.invoice_year,
                CASE WHEN mi.id IS NULL THEN c.monthly_fee ELSE mi.monthly_fee END AS monthly_fee,
                CASE WHEN mi.id IS NULL THEN COALESCE(SUM(CASE WHEN t.is_billable = 1 THEN t.billable_amount ELSE 0 END), 0) ELSE mi.extra_amount END AS extra_amount,
                CASE WHEN mi.id IS NULL THEN c.monthly_fee + COALESCE(SUM(CASE WHEN t.is_billable = 1 THEN t.billable_amount ELSE 0 END), 0) ELSE mi.total_amount END AS total_amount,
                COALESCE(mi.paid_amount, 0) AS paid_amount,
                COALESCE(mi.status, "Unpaid") AS status,
                mi.notes,
                mi.created_at,
                mi.updated_at,
                COALESCE(SUM(CASE WHEN t.is_billable = 0 THEN 1 ELSE 0 END), 0) AS included_task_count,
                COALESCE(SUM(CASE WHEN t.is_billable = 1 THEN 1 ELSE 0 END), 0) AS extra_task_count
         FROM clients c
         LEFT JOIN monthly_invoices mi ON mi.client_id = c.id
            AND mi.invoice_month = :month AND mi.invoice_year = :year
         LEFT JOIN tasks t ON t.client_id = c.id
            AND DATE(COALESCE(t.completed_at, t.deadline, t.created_at)) BETWEEN :start_date AND :end_date
         WHERE ' . $where . '
         GROUP BY c.id, mi.id
         ORDER BY c.name ASC'
    );
    $statement->execute($parameters);
    $rows = $statement->fetchAll();

    foreach ($rows as &$row) {
        $row['invoice_month'] = (int) ($row['invoice_month'] ?: $month);
        $row['invoice_year'] = (int) ($row['invoice_year'] ?: $year);
        $row['monthly_fee'] = (float) $row['monthly_fee'];
        $row['extra_amount'] = (float) $row['extra_amount'];
        $row['total_amount'] = (float) $row['total_amount'];
        $row['paid_amount'] = (float) $row['paid_amount'];
        $row['outstanding_amount'] = max(0, $row['total_amount'] - $row['paid_amount']);
        $row['included_task_count'] = (int) $row['included_task_count'];
        $row['extra_task_count'] = (int) $row['extra_task_count'];
    }
    unset($row);

    return $rows;
}

try {
    $pdo = Database::connect();
    $currentUser = requireAuth($pdo);
    $method = $_SERVER['REQUEST_METHOD'];
    $action = trim((string) ($_GET['action'] ?? ''));

    if ($method === 'GET') {
        [$month, $year] = billingPeriodFromRequest();
        $clientId = filter_input(INPUT_GET, 'client_id', FILTER_VALIDATE_INT) ?: null;
        $where = ['t.is_billable = 1'];
        $parameters = [];

        if ($clientId) {
            $where[] = 't.client_id = :client_id';
            $parameters[':client_id'] = $clientId;
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

        $monthlyRows = monthlyInvoiceRows($pdo, $month, $year, $clientId);
        $monthlyTotals = [
            'monthly_recurring_revenue' => 0.0,
            'extra_billable_work' => 0.0,
            'paid' => 0.0,
            'outstanding' => 0.0,
        ];
        foreach ($monthlyRows as $row) {
            $monthlyTotals['monthly_recurring_revenue'] += (float) $row['monthly_fee'];
            $monthlyTotals['extra_billable_work'] += (float) $row['extra_amount'];
            $monthlyTotals['paid'] += (float) $row['paid_amount'];
            $monthlyTotals['outstanding'] += (float) $row['outstanding_amount'];
        }

        jsonResponse([
            'items' => $items,
            'totals' => $totals,
            'monthly_invoices' => $monthlyRows,
            'monthly_totals' => $monthlyTotals,
            'period' => ['month' => $month, 'year' => $year],
        ]);
    }

    if ($method === 'POST' && $action === 'generate_monthly_invoice') {
        $data = requestBody();
        $clientId = (int) ($data['client_id'] ?? 0);
        $month = (int) ($data['month'] ?? date('n'));
        $year = (int) ($data['year'] ?? date('Y'));
        if (!$clientId || $month < 1 || $month > 12 || $year < 2000 || $year > 2100) {
            errorResponse('Valid client_id, month, and year are required.', 422);
        }

        $paidAmount = array_key_exists('paid_amount', $data) ? (float) $data['paid_amount'] : null;
        $status = isset($data['status']) ? (string) $data['status'] : null;
        $notes = array_key_exists('notes', $data) ? (string) $data['notes'] : null;
        $monthlyFee = array_key_exists('monthly_fee', $data) ? (float) $data['monthly_fee'] : null;
        $invoice = upsertMonthlyInvoice($pdo, $clientId, $month, $year, $paidAmount, $status, $notes, $monthlyFee);
        logActivity($pdo, $currentUser, [
            'action_type' => 'generated',
            'module' => 'billing',
            'item_id' => $invoice['id'] ?? null,
            'item_title' => $invoice['client_name'] . ' monthly invoice',
            'client_id' => $clientId,
            'client_name' => $invoice['client_name'],
            'description' => 'Monthly invoice generated.',
            'new_value' => $invoice,
        ]);
        jsonResponse($invoice, 201, 'Monthly invoice generated.');
    }

    if (($method === 'PATCH' || $method === 'PUT') && $action === 'monthly_invoice') {
        $data = requestBody();
        $clientId = (int) ($data['client_id'] ?? 0);
        $month = (int) ($data['month'] ?? date('n'));
        $year = (int) ($data['year'] ?? date('Y'));
        if (!$clientId || $month < 1 || $month > 12 || $year < 2000 || $year > 2100) {
            errorResponse('Valid client_id, month, and year are required.', 422);
        }

        $paidAmount = array_key_exists('paid_amount', $data) ? (float) $data['paid_amount'] : null;
        $status = isset($data['status']) ? (string) $data['status'] : null;
        $notes = array_key_exists('notes', $data) ? (string) $data['notes'] : null;
        $monthlyFee = array_key_exists('monthly_fee', $data) ? (float) $data['monthly_fee'] : null;
        $invoice = upsertMonthlyInvoice($pdo, $clientId, $month, $year, $paidAmount, $status, $notes, $monthlyFee);
        logActivity($pdo, $currentUser, [
            'action_type' => 'payment_changed',
            'module' => 'billing',
            'item_id' => $invoice['id'] ?? null,
            'item_title' => $invoice['client_name'] . ' monthly invoice',
            'client_id' => $clientId,
            'client_name' => $invoice['client_name'],
            'description' => 'Monthly invoice payment updated.',
            'new_value' => $invoice,
        ]);
        jsonResponse($invoice, 200, 'Monthly invoice updated.');
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
        $newValue = ['payment_status' => $paymentStatus, 'invoice_status' => $invoiceStatus];
        logActivity($pdo, $currentUser, [
            'action_type' => $paymentStatus !== $task['payment_status'] ? 'payment_changed' : 'updated',
            'module' => 'billing', 'item_id' => $taskId, 'item_title' => $task['title'],
            'client_id' => $task['client_id'], 'description' => $paymentStatus !== $task['payment_status']
                ? 'Payment status changed.'
                : 'Billing item updated.',
            'old_value' => ['payment_status' => $task['payment_status'], 'invoice_status' => $task['invoice_status']],
            'new_value' => $newValue,
        ]);
        jsonResponse(['task_id' => $taskId], 200, 'Billing status updated.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    handleException($exception);
}
