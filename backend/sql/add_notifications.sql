USE brahmanda_work_os;

CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type ENUM(
        'overdue_task', 'due_today', 'reminder', 'assigned_task',
        'comment_added', 'report_ready', 'report_shared',
        'recurring_task_generated', 'unpaid_billing', 'system'
    ) NOT NULL DEFAULT 'system',
    title VARCHAR(190) NOT NULL,
    message TEXT NOT NULL,
    related_module VARCHAR(80) NULL,
    related_id BIGINT UNSIGNED NULL,
    client_id BIGINT UNSIGNED NULL,
    client_name VARCHAR(190) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    action_url VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_notifications_client FOREIGN KEY (client_id) REFERENCES clients(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_notifications_user_read (user_id, is_read, created_at),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_client (client_id),
    INDEX idx_notifications_created (created_at)
) ENGINE=InnoDB;
