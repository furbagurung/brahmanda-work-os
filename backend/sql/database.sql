CREATE DATABASE IF NOT EXISTS brahmanda_work_os
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE brahmanda_work_os;

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'member') NOT NULL DEFAULT 'member',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    api_token CHAR(64) NULL UNIQUE COMMENT 'SHA-256 hash of the active bearer token',
    token_expires_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE clients (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(190) NOT NULL,
    contact_person VARCHAR(150) NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(190) NULL,
    service_package VARCHAR(150) NULL,
    monthly_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    start_date DATE NULL,
    status ENUM('active', 'inactive', 'on_hold') NOT NULL DEFAULT 'active',
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_clients_status (status),
    INDEX idx_clients_name (name)
) ENGINE=InnoDB;

CREATE TABLE tasks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    category VARCHAR(100) NULL,
    priority ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium',
    deadline DATE NULL,
    status ENUM('New', 'In Progress', 'Waiting for Client', 'Revision', 'Completed') NOT NULL DEFAULT 'New',
    proof_link VARCHAR(500) NULL,
    is_billable TINYINT(1) NOT NULL DEFAULT 0,
    billable_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('Unpaid', 'Paid') NOT NULL DEFAULT 'Unpaid',
    invoice_status ENUM('Not invoiced', 'Draft', 'Sent') NOT NULL DEFAULT 'Not invoiced',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_client
        FOREIGN KEY (client_id) REFERENCES clients(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_tasks_client (client_id),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_deadline (deadline),
    INDEX idx_tasks_billable (is_billable)
) ENGINE=InnoDB;

CREATE TABLE task_attachments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT UNSIGNED NOT NULL,
    attachment_type VARCHAR(50) NOT NULL DEFAULT 'link',
    title VARCHAR(190) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_attachments_task
        FOREIGN KEY (task_id) REFERENCES tasks(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_task_attachments_task (task_id)
) ENGINE=InnoDB;

CREATE TABLE daily_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT UNSIGNED NOT NULL,
    task_id BIGINT UNSIGNED NOT NULL,
    log_date DATE NOT NULL,
    work_done TEXT NOT NULL,
    category VARCHAR(100) NULL,
    proof_link VARCHAR(500) NULL,
    is_billable TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_daily_logs_client
        FOREIGN KEY (client_id) REFERENCES clients(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_daily_logs_task
        FOREIGN KEY (task_id) REFERENCES tasks(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_daily_logs_task (task_id),
    INDEX idx_daily_logs_date (log_date),
    INDEX idx_daily_logs_client (client_id)
) ENGINE=InnoDB;

CREATE TABLE billings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT UNSIGNED NOT NULL,
    task_id BIGINT UNSIGNED NOT NULL,
    work_title VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('Unpaid', 'Paid') NOT NULL DEFAULT 'Unpaid',
    invoice_status ENUM('Not invoiced', 'Draft', 'Sent') NOT NULL DEFAULT 'Not invoiced',
    billing_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_billings_client
        FOREIGN KEY (client_id) REFERENCES clients(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_billings_task
        FOREIGN KEY (task_id) REFERENCES tasks(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_billings_task (task_id),
    INDEX idx_billings_client (client_id),
    INDEX idx_billings_payment (payment_status),
    INDEX idx_billings_invoice (invoice_status)
) ENGINE=InnoDB;

CREATE TABLE reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT UNSIGNED NOT NULL,
    report_month TINYINT UNSIGNED NOT NULL,
    report_year SMALLINT UNSIGNED NOT NULL,
    report_content LONGTEXT NOT NULL,
    status ENUM('Draft', 'Pending Review', 'Sent') NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reports_client
        FOREIGN KEY (client_id) REFERENCES clients(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_reports_period (client_id, report_month, report_year),
    INDEX idx_reports_period (report_year, report_month),
    INDEX idx_reports_status (status)
) ENGINE=InnoDB;

-- Create the first user by generating a password hash in PHP:
-- php -r "echo password_hash('change-me', PASSWORD_DEFAULT), PHP_EOL;"
-- Then insert that hash:
-- INSERT INTO users (name, email, password, role)
-- VALUES ('Administrator', 'admin@example.com', '<generated-hash>', 'admin');
