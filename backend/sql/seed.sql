USE brahmanda_work_os;

-- Demo administrator. Password: change-me
INSERT INTO users (name, email, password, role, status)
VALUES (
    'Brahmanda Admin',
    'admin@brahmandatech.com',
    '$2y$10$F4t0FMRMAisfC4U5Q3GpYeRDT75dh9gGV1KCtD3I8ZtOo5152DG3e',
    'admin',
    'active'
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    password = VALUES(password),
    role = VALUES(role),
    status = VALUES(status);

-- Idempotent demo clients. Existing clients with the same name are preserved.
INSERT INTO clients
    (name, contact_person, phone, email, service_package, monthly_fee, start_date, status, notes)
SELECT
    '20D Cinema', 'Marketing Team', '+977 9800000001', 'marketing@20dcinema.example',
    'Social Media + Design', 35000.00, '2026-01-01', 'active', 'Film promotion and campaign creative.'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = '20D Cinema');

INSERT INTO clients
    (name, contact_person, phone, email, service_package, monthly_fee, start_date, status, notes)
SELECT
    'Pranam Agro Foods', 'Brand Team', '+977 9800000002', 'brand@pranamagro.example',
    'Brand + Packaging', 30000.00, '2026-02-01', 'active', 'Packaging, product communication, and distributor materials.'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Pranam Agro Foods');

INSERT INTO clients
    (name, contact_person, phone, email, service_package, monthly_fee, start_date, status, notes)
SELECT
    'Malta Peppers', 'Operations Team', '+977 9800000003', 'operations@maltapeppers.example',
    'Web + Performance', 28000.00, '2026-03-01', 'active', 'Website, performance marketing, and reporting.'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Malta Peppers');

INSERT INTO clients
    (name, contact_person, phone, email, service_package, monthly_fee, start_date, status, notes)
SELECT
    'Kittik Enterprise', 'Management', '+977 9800000004', 'management@kittik.example',
    'Content + Digital', 25000.00, '2026-04-01', 'active', 'Company profile, digital presence, and content support.'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = 'Kittik Enterprise');

-- Sample tasks. Each title is inserted only once per client.
INSERT INTO tasks
    (client_id, title, description, category, priority, deadline, status, proof_link,
     is_billable, billable_amount, payment_status, invoice_status, completed_at)
SELECT
    c.id, 'June social media calendar', 'Finalize the monthly content calendar and secure approval.',
    'Social Media', 'High', '2026-06-28', 'In Progress', NULL,
    0, 0.00, 'Unpaid', 'Not invoiced', NULL
FROM clients c
WHERE c.name = '20D Cinema'
  AND NOT EXISTS (
      SELECT 1 FROM tasks t WHERE t.client_id = c.id AND t.title = 'June social media calendar'
  );

INSERT INTO tasks
    (client_id, title, description, category, priority, deadline, status, proof_link,
     is_billable, billable_amount, payment_status, invoice_status, completed_at)
SELECT
    c.id, 'Movie campaign key visual', 'Create the primary visual direction for the upcoming movie campaign.',
    'Campaign', 'High', '2026-06-30', 'New', NULL,
    1, 12000.00, 'Unpaid', 'Draft', NULL
FROM clients c
WHERE c.name = '20D Cinema'
  AND NOT EXISTS (
      SELECT 1 FROM tasks t WHERE t.client_id = c.id AND t.title = 'Movie campaign key visual'
  );

INSERT INTO tasks
    (client_id, title, description, category, priority, deadline, status, proof_link,
     is_billable, billable_amount, payment_status, invoice_status, completed_at)
SELECT
    c.id, 'Product label revisions', 'Apply approved copy corrections to the packaging files.',
    'Design', 'Urgent', '2026-06-27', 'Revision', 'https://figma.com',
    1, 6500.00, 'Unpaid', 'Not invoiced', NULL
FROM clients c
WHERE c.name = 'Pranam Agro Foods'
  AND NOT EXISTS (
      SELECT 1 FROM tasks t WHERE t.client_id = c.id AND t.title = 'Product label revisions'
  );

INSERT INTO tasks
    (client_id, title, description, category, priority, deadline, status, proof_link,
     is_billable, billable_amount, payment_status, invoice_status, completed_at)
SELECT
    c.id, 'Distributor presentation', 'Prepare the sales presentation for distributor meetings.',
    'Presentation', 'Medium', '2026-07-02', 'New', NULL,
    1, 8500.00, 'Unpaid', 'Not invoiced', NULL
FROM clients c
WHERE c.name = 'Pranam Agro Foods'
  AND NOT EXISTS (
      SELECT 1 FROM tasks t WHERE t.client_id = c.id AND t.title = 'Distributor presentation'
  );

INSERT INTO tasks
    (client_id, title, description, category, priority, deadline, status, proof_link,
     is_billable, billable_amount, payment_status, invoice_status, completed_at)
SELECT
    c.id, 'Website performance review', 'Review Core Web Vitals and prepare an optimization checklist.',
    'Web', 'Medium', '2026-06-29', 'In Progress', NULL,
    0, 0.00, 'Unpaid', 'Not invoiced', NULL
FROM clients c
WHERE c.name = 'Malta Peppers'
  AND NOT EXISTS (
      SELECT 1 FROM tasks t WHERE t.client_id = c.id AND t.title = 'Website performance review'
  );

INSERT INTO tasks
    (client_id, title, description, category, priority, deadline, status, proof_link,
     is_billable, billable_amount, payment_status, invoice_status, completed_at)
SELECT
    c.id, 'Meta ads report', 'Compile campaign results and next-month recommendations.',
    'Reporting', 'Medium', '2026-06-24', 'Completed', 'https://drive.google.com',
    0, 0.00, 'Unpaid', 'Not invoiced', '2026-06-24 17:00:00'
FROM clients c
WHERE c.name = 'Malta Peppers'
  AND NOT EXISTS (
      SELECT 1 FROM tasks t WHERE t.client_id = c.id AND t.title = 'Meta ads report'
  );

INSERT INTO tasks
    (client_id, title, description, category, priority, deadline, status, proof_link,
     is_billable, billable_amount, payment_status, invoice_status, completed_at)
SELECT
    c.id, 'Company profile copy', 'Review the first draft and collect client feedback.',
    'Content', 'Medium', '2026-06-30', 'Waiting for Client', 'https://docs.google.com',
    0, 0.00, 'Unpaid', 'Not invoiced', NULL
FROM clients c
WHERE c.name = 'Kittik Enterprise'
  AND NOT EXISTS (
      SELECT 1 FROM tasks t WHERE t.client_id = c.id AND t.title = 'Company profile copy'
  );

INSERT INTO tasks
    (client_id, title, description, category, priority, deadline, status, proof_link,
     is_billable, billable_amount, payment_status, invoice_status, completed_at)
SELECT
    c.id, 'Google Business update', 'Update business hours, services, and recent project photos.',
    'Digital', 'Low', '2026-06-24', 'Completed', 'https://business.google.com',
    0, 0.00, 'Unpaid', 'Not invoiced', '2026-06-24 16:30:00'
FROM clients c
WHERE c.name = 'Kittik Enterprise'
  AND NOT EXISTS (
      SELECT 1 FROM tasks t WHERE t.client_id = c.id AND t.title = 'Google Business update'
  );

-- Keep related demo tables consistent for tasks inserted directly through SQL.
INSERT INTO daily_logs
    (client_id, task_id, log_date, work_done, category, proof_link, is_billable)
SELECT
    t.client_id, t.id, DATE(t.completed_at),
    CONCAT(t.title, IF(t.description IS NULL OR t.description = '', '', CONCAT(': ', t.description))),
    t.category, t.proof_link, t.is_billable
FROM tasks t
WHERE t.status = 'Completed'
ON DUPLICATE KEY UPDATE
    log_date = VALUES(log_date),
    work_done = VALUES(work_done),
    category = VALUES(category),
    proof_link = VALUES(proof_link),
    is_billable = VALUES(is_billable);

INSERT INTO billings
    (client_id, task_id, work_title, amount, payment_status, invoice_status, billing_date)
SELECT
    t.client_id, t.id, t.title, t.billable_amount,
    t.payment_status, t.invoice_status, COALESCE(DATE(t.completed_at), DATE(t.created_at))
FROM tasks t
WHERE t.is_billable = 1
ON DUPLICATE KEY UPDATE
    work_title = VALUES(work_title),
    amount = VALUES(amount),
    payment_status = VALUES(payment_status),
    invoice_status = VALUES(invoice_status),
    billing_date = VALUES(billing_date);

-- Migrate legacy single proof links into the multi-link attachment table.
INSERT INTO task_attachments (task_id, attachment_type, title, url)
SELECT t.id, 'link', 'Proof link', t.proof_link
FROM tasks t
WHERE t.proof_link IS NOT NULL
  AND t.proof_link <> ''
  AND NOT EXISTS (
      SELECT 1 FROM task_attachments a
      WHERE a.task_id = t.id AND a.url = t.proof_link
  );
