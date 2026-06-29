USE brahmanda_work_os;

ALTER TABLE tasks
    ADD COLUMN task_order INT NOT NULL DEFAULT 0 AFTER status,
    ADD INDEX idx_tasks_board_order (status, task_order);

UPDATE tasks
SET task_order = LEAST(id, 2147483) * 1000
WHERE task_order = 0;
