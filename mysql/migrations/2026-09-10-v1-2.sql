-- NOVAWORKS V1.2
-- Run once after a verified database backup.
ALTER TABLE app_settings ADD COLUMN popup_settings JSON NULL;
