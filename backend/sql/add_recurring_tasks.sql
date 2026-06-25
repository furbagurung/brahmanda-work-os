USE brahmanda_work_os;

ALTER TABLE tasks
    ADD COLUMN is_recurring TINYINT(1) NOT NULL DEFAULT 0 AFTER reminder_note,
    ADD COLUMN recurrence_type ENUM('daily', 'weekly', 'monthly') NULL AFTER is_recurring,
    ADD COLUMN recurrence_interval SMALLINT UNSIGNED NOT NULL DEFAULT 1 AFTER recurrence_type,
    ADD COLUMN recurrence_end_date DATE NULL AFTER recurrence_interval,
    ADD COLUMN next_occurrence_date DATE NULL AFTER recurrence_end_date,
    ADD COLUMN recurring_parent_id BIGINT UNSIGNED NULL AFTER next_occurrence_date,
    ADD CONSTRAINT fk_tasks_recurring_parent
        FOREIGN KEY (recurring_parent_id) REFERENCES tasks(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    ADD INDEX idx_tasks_recurring_due (is_recurring, next_occurrence_date),
    ADD INDEX idx_tasks_recurring_parent (recurring_parent_id);
