USE brahmanda_work_os;

ALTER TABLE users
    ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER role;
