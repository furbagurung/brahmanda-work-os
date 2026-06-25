USE brahmanda_work_os;

CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    user_name VARCHAR(150) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    item_id BIGINT UNSIGNED NULL,
    item_title VARCHAR(255) NULL,
    client_id BIGINT UNSIGNED NULL,
    client_name VARCHAR(190) NULL,
    description TEXT NOT NULL,
    old_value LONGTEXT NULL,
    new_value LONGTEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_activity_logs_user (user_id),
    INDEX idx_activity_logs_client (client_id),
    INDEX idx_activity_logs_module (module),
    INDEX idx_activity_logs_action (action_type),
    INDEX idx_activity_logs_created (created_at)
) ENGINE=InnoDB;
