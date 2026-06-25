USE brahmanda_work_os;

ALTER TABLE users
    ADD COLUMN api_token CHAR(64) NULL UNIQUE COMMENT 'SHA-256 hash of the active bearer token' AFTER role,
    ADD COLUMN token_expires_at DATETIME NULL AFTER api_token;
