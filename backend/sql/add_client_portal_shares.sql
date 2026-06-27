USE brahmanda_work_os;

CREATE TABLE client_portal_shares (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT UNSIGNED NOT NULL,
    report_id BIGINT UNSIGNED NOT NULL,
    share_token_hash CHAR(64) NOT NULL UNIQUE,
    public_token_preview VARCHAR(16) NOT NULL,
    expires_at DATETIME NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_portal_shares_client FOREIGN KEY (client_id) REFERENCES clients(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_portal_shares_report FOREIGN KEY (report_id) REFERENCES reports(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_portal_shares_created_by FOREIGN KEY (created_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_portal_shares_client (client_id),
    INDEX idx_portal_shares_report (report_id),
    INDEX idx_portal_shares_active_expiry (is_active, expires_at)
) ENGINE=InnoDB;
