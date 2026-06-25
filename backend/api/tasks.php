<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';

bootstrapApi();

function findTask(PDO $pdo, int $id): array
{
    $statement = $pdo->prepare('SELECT * FROM tasks WHERE id = ?');
    $statement->execute([$id]);
    $task = $statement->fetch();

    if (!$task) {
        errorResponse('Task not found.', 404);
    }

    return $task;
}

function createDailyLog(PDO $pdo, array $task): void
{
    $statement = $pdo->prepare(
        'INSERT INTO daily_logs
            (client_id, task_id, log_date, work_done, category, proof_link, is_billable)
         VALUES
            (:client_id, :task_id, :log_date, :work_done, :category, :proof_link, :is_billable)
         ON DUPLICATE KEY UPDATE
            log_date = VALUES(log_date),
            work_done = VALUES(work_done),
            category = VALUES(category),
            proof_link = VALUES(proof_link),
            is_billable = VALUES(is_billable)'
    );
    $statement->execute([
        ':client_id' => $task['client_id'],
        ':task_id' => $task['id'],
        ':log_date' => substr((string) ($task['completed_at'] ?: date('Y-m-d')), 0, 10),
        ':work_done' => $task['title'] . ($task['description'] ? ': ' . $task['description'] : ''),
        ':category' => $task['category'] ?: null,
        ':proof_link' => $task['proof_link'] ?: null,
        ':is_billable' => (int) $task['is_billable'],
    ]);
}

function syncBilling(PDO $pdo, array $task): void
{
    if ((int) $task['is_billable'] !== 1) {
        $statement = $pdo->prepare('DELETE FROM billings WHERE task_id = ?');
        $statement->execute([$task['id']]);
        return;
    }

    $statement = $pdo->prepare(
        'INSERT INTO billings
            (client_id, task_id, work_title, amount, payment_status, invoice_status, billing_date)
         VALUES
            (:client_id, :task_id, :work_title, :amount, :payment_status, :invoice_status, :billing_date)
         ON DUPLICATE KEY UPDATE
            client_id = VALUES(client_id),
            work_title = VALUES(work_title),
            amount = VALUES(amount),
            payment_status = VALUES(payment_status),
            invoice_status = VALUES(invoice_status),
            billing_date = VALUES(billing_date)'
    );
    $statement->execute([
        ':client_id' => $task['client_id'],
        ':task_id' => $task['id'],
        ':work_title' => $task['title'],
        ':amount' => $task['billable_amount'],
        ':payment_status' => $task['payment_status'],
        ':invoice_status' => $task['invoice_status'],
        ':billing_date' => substr((string) ($task['completed_at'] ?: $task['created_at']), 0, 10),
    ]);
}

function taskValues(array $data): array
{
    return [
        ':client_id' => (int) $data['client_id'],
        ':title' => trim((string) $data['title']),
        ':description' => $data['description'] ?: null,
        ':category' => $data['category'] ?: null,
        ':priority' => $data['priority'] ?: 'Medium',
        ':deadline' => $data['deadline'] ?: null,
        ':reminder_date' => $data['reminder_date'] ?: null,
        ':reminder_note' => $data['reminder_note'] ?: null,
        ':status' => $data['status'] ?: 'New',
        ':proof_link' => $data['proof_link'] ?: null,
        ':is_billable' => boolValue($data['is_billable'] ?? false),
        ':billable_amount' => boolValue($data['is_billable'] ?? false) ? (float) ($data['billable_amount'] ?? 0) : 0,
        ':payment_status' => $data['payment_status'] ?: 'Unpaid',
        ':invoice_status' => $data['invoice_status'] ?: 'Not invoiced',
        ':completed_at' => ($data['status'] ?? 'New') === 'Completed'
            ? ($data['completed_at'] ?: date('Y-m-d H:i:s'))
            : null,
    ];
}

try {
    $pdo = Database::connect();
    $currentUser = requireAuth($pdo);
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $where = [];
        $parameters = [];

        foreach (['client_id', 'status', 'priority'] as $filter) {
            if (isset($_GET[$filter]) && $_GET[$filter] !== '') {
                $where[] = 't.' . $filter . ' = :' . $filter;
                $parameters[':' . $filter] = $_GET[$filter];
            }
        }

        $sql = 'SELECT t.*, c.name AS client_name
                FROM tasks t
                INNER JOIN clients c ON c.id = t.client_id';

        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY
                    CASE t.priority
                        WHEN "Urgent" THEN 1
                        WHEN "High" THEN 2
                        WHEN "Medium" THEN 3
                        ELSE 4
                    END,
                    t.deadline IS NULL,
                    t.deadline ASC,
                    t.created_at DESC';

        $statement = $pdo->prepare($sql);
        $statement->execute($parameters);
        jsonResponse($statement->fetchAll());
    }

    if ($method === 'POST') {
        $data = requestBody();
        requireFields($data, ['client_id', 'title']);
        $data = array_merge([
            'description' => null,
            'category' => null,
            'priority' => 'Medium',
            'deadline' => null,
            'reminder_date' => null,
            'reminder_note' => null,
            'status' => 'New',
            'proof_link' => null,
            'is_billable' => false,
            'billable_amount' => 0,
            'payment_status' => 'Unpaid',
            'invoice_status' => 'Not invoiced',
            'completed_at' => null,
        ], $data);

        $pdo->beginTransaction();

        $statement = $pdo->prepare(
            'INSERT INTO tasks
                (client_id, title, description, category, priority, deadline, reminder_date, reminder_note, status, proof_link,
                 is_billable, billable_amount, payment_status, invoice_status, completed_at)
             VALUES
                (:client_id, :title, :description, :category, :priority, :deadline, :reminder_date, :reminder_note, :status, :proof_link,
                 :is_billable, :billable_amount, :payment_status, :invoice_status, :completed_at)'
        );
        $statement->execute(taskValues($data));
        $id = (int) $pdo->lastInsertId();
        $task = findTask($pdo, $id);

        syncBilling($pdo, $task);
        if ($task['status'] === 'Completed') {
            createDailyLog($pdo, $task);
        }

        $pdo->commit();
        jsonResponse(['id' => $id], 201, 'Task created.');
    }

    if ($method === 'PUT' || ($method === 'PATCH' && ($_GET['action'] ?? '') !== 'complete')) {
        $id = queryId();
        $current = findTask($pdo, $id);
        $data = array_merge($current, requestBody());
        requireFields($data, ['client_id', 'title']);

        $pdo->beginTransaction();

        $values = taskValues($data);
        $values[':id'] = $id;
        $statement = $pdo->prepare(
            'UPDATE tasks SET
                client_id = :client_id,
                title = :title,
                description = :description,
                category = :category,
                priority = :priority,
                deadline = :deadline,
                reminder_date = :reminder_date,
                reminder_note = :reminder_note,
                status = :status,
                proof_link = :proof_link,
                is_billable = :is_billable,
                billable_amount = :billable_amount,
                payment_status = :payment_status,
                invoice_status = :invoice_status,
                completed_at = :completed_at
             WHERE id = :id'
        );
        $statement->execute($values);

        $task = findTask($pdo, $id);
        syncBilling($pdo, $task);
        if ($task['status'] === 'Completed') {
            createDailyLog($pdo, $task);
        }

        $pdo->commit();
        jsonResponse(['id' => $id], 200, 'Task updated.');
    }

    if ($method === 'PATCH' && ($_GET['action'] ?? '') === 'complete') {
        $id = queryId();
        findTask($pdo, $id);
        $pdo->beginTransaction();

        $statement = $pdo->prepare(
            'UPDATE tasks
             SET status = "Completed", completed_at = COALESCE(completed_at, NOW())
             WHERE id = ?'
        );
        $statement->execute([$id]);

        $task = findTask($pdo, $id);
        createDailyLog($pdo, $task);
        syncBilling($pdo, $task);

        $pdo->commit();
        jsonResponse(['id' => $id, 'completed_at' => $task['completed_at']], 200, 'Task completed and daily log created.');
    }

    if ($method === 'DELETE') {
        $id = queryId();
        $statement = $pdo->prepare('DELETE FROM tasks WHERE id = ?');
        $statement->execute([$id]);

        if ($statement->rowCount() === 0) {
            errorResponse('Task not found.', 404);
        }

        jsonResponse(['id' => $id], 200, 'Task deleted.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    handleException($exception);
}
