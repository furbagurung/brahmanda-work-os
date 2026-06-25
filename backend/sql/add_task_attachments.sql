USE brahmanda_work_os;

CREATE TABLE IF NOT EXISTS task_attachments (
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

INSERT INTO task_attachments (task_id, attachment_type, title, url)
SELECT t.id, 'link', 'Proof link', t.proof_link
FROM tasks t
WHERE t.proof_link IS NOT NULL
  AND t.proof_link <> ''
  AND NOT EXISTS (
      SELECT 1 FROM task_attachments a
      WHERE a.task_id = t.id AND a.url = t.proof_link
  );
