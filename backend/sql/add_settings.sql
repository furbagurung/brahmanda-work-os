USE brahmanda_work_os;

CREATE TABLE IF NOT EXISTS settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(150) NOT NULL UNIQUE,
    setting_value LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_settings_key (setting_key)
) ENGINE=InnoDB;

INSERT INTO settings (setting_key, setting_value) VALUES
    ('agency_name', 'Brahmanda Tech'),
    ('legal_business_name', 'Kittik Enterprise'),
    ('contact_person', 'Furba Gurung'),
    ('agency_email', 'brahmandatech@gmail.com'),
    ('agency_phone', '9840006162'),
    ('agency_address', ''),
    ('pan_number', '123252867'),
    ('agency_website', ''),
    ('agency_notes', ''),
    ('report_title', 'Monthly Client Report'),
    ('prepared_by', 'Brahmanda Tech'),
    ('report_footer_text', 'Prepared by Brahmanda Tech'),
    ('brand_color', '#002FA7'),
    ('logo_url', ''),
    ('default_report_note', ''),
    ('currency', 'NPR'),
    ('default_task_priority', 'Medium'),
    ('default_report_status', 'Draft'),
    ('default_monthly_report_template', 'Standard Monthly Client Report'),
    ('date_format', 'MMM d, yyyy')
ON DUPLICATE KEY UPDATE setting_value = setting_value;
