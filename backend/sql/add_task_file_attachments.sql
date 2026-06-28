USE brahmanda_work_os;

ALTER TABLE task_attachments
    ADD COLUMN IF NOT EXISTS file_path VARCHAR(500) NULL AFTER url,
    ADD COLUMN IF NOT EXISTS file_url VARCHAR(500) NULL AFTER file_path,
    ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255) NULL AFTER file_url,
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120) NULL AFTER original_filename,
    ADD COLUMN IF NOT EXISTS file_size BIGINT NULL AFTER mime_type,
    ADD COLUMN IF NOT EXISTS is_image TINYINT(1) NOT NULL DEFAULT 0 AFTER file_size;

