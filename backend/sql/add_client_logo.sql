ALTER TABLE clients
    ADD COLUMN logo_path VARCHAR(500) NULL AFTER cover_color,
    ADD COLUMN logo_url VARCHAR(500) NULL AFTER logo_path,
    ADD COLUMN logo_original_name VARCHAR(255) NULL AFTER logo_url;
