USE brahmanda_work_os;

ALTER TABLE task_attachments
    ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(500) NULL AFTER is_image,
    ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500) NULL AFTER thumbnail_path,
    ADD COLUMN IF NOT EXISTS optimized_path VARCHAR(500) NULL AFTER thumbnail_url,
    ADD COLUMN IF NOT EXISTS optimized_url VARCHAR(500) NULL AFTER optimized_path;

