USE brahmanda_work_os;

ALTER TABLE tasks
    ADD COLUMN reminder_date DATE NULL AFTER deadline,
    ADD COLUMN reminder_note TEXT NULL AFTER reminder_date,
    ADD INDEX idx_tasks_reminder_date (reminder_date);
