CREATE TABLE IF NOT EXISTS monthly_invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT UNSIGNED NOT NULL,
    invoice_month TINYINT UNSIGNED NOT NULL,
    invoice_year SMALLINT UNSIGNED NOT NULL,
    monthly_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    extra_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status ENUM('Unpaid', 'Partial', 'Paid') NOT NULL DEFAULT 'Unpaid',
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_monthly_invoices_client
        FOREIGN KEY (client_id) REFERENCES clients(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_monthly_invoice_period (client_id, invoice_month, invoice_year),
    INDEX idx_monthly_invoices_period (invoice_year, invoice_month),
    INDEX idx_monthly_invoices_status (status)
) ENGINE=InnoDB;
