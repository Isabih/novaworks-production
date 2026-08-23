-- NOVAWORKS FINAL EXISTING-DATABASE COMPATIBILITY PATCH
-- Designed for Oracle MySQL 8.x (does NOT use ADD COLUMN IF NOT EXISTS).
-- Safe to run repeatedly.

USE novaworks;

DELIMITER $$
DROP PROCEDURE IF EXISTS nw_final_runtime_fix$$
CREATE PROCEDURE nw_final_runtime_fix()
BEGIN
  -- app_settings columns used by Home Content / Auth / Property Types
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='app_settings' AND COLUMN_NAME='auth_hero_image_url'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN auth_hero_image_url TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='app_settings' AND COLUMN_NAME='auth_hero_video_url'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN auth_hero_video_url TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='app_settings' AND COLUMN_NAME='property_categories'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN property_categories JSON NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='app_settings' AND COLUMN_NAME='featured_property_ids'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN featured_property_ids JSON NULL;
  END IF;

  -- Mail workspace tables (create if older database does not have them)
  CREATE TABLE IF NOT EXISTS communication_threads (
    id CHAR(36) PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    kind ENUM('booking','email','general') NOT NULL DEFAULT 'general',
    booking_id CHAR(36) NULL,
    external_email VARCHAR(255) NULL,
    status ENUM('open','closed') NOT NULL DEFAULT 'open',
    created_by CHAR(36) NULL,
    assigned_to CHAR(36) NULL,
    last_message_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_comm_last(last_message_at),
    INDEX idx_comm_email(external_email)
  ) ENGINE=InnoDB;

  CREATE TABLE IF NOT EXISTS communication_messages (
    id CHAR(36) PRIMARY KEY,
    thread_id CHAR(36) NOT NULL,
    sender_user_id CHAR(36) NULL,
    sender_email VARCHAR(255) NULL,
    sender_name VARCHAR(255) NULL,
    direction ENUM('inbound','outbound','internal') NOT NULL DEFAULT 'internal',
    body MEDIUMTEXT NOT NULL,
    sent_via_email TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_comm_message(thread_id, created_at)
  ) ENGINE=InnoDB;

  -- Provider metadata columns used by Resend inbound/outbound mail
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages' AND COLUMN_NAME='provider_email_id'
  ) THEN
    ALTER TABLE communication_messages ADD COLUMN provider_email_id VARCHAR(120) NULL AFTER sent_via_email;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages' AND COLUMN_NAME='provider_message_id'
  ) THEN
    ALTER TABLE communication_messages ADD COLUMN provider_message_id VARCHAR(500) NULL AFTER provider_email_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages' AND COLUMN_NAME='to_json'
  ) THEN
    ALTER TABLE communication_messages ADD COLUMN to_json JSON NULL AFTER provider_message_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages' AND COLUMN_NAME='cc_json'
  ) THEN
    ALTER TABLE communication_messages ADD COLUMN cc_json JSON NULL AFTER to_json;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages' AND COLUMN_NAME='attachments_json'
  ) THEN
    ALTER TABLE communication_messages ADD COLUMN attachments_json JSON NULL AFTER cc_json;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages' AND INDEX_NAME='uq_comm_provider_email'
  ) THEN
    CREATE UNIQUE INDEX uq_comm_provider_email ON communication_messages(provider_email_id);
  END IF;
END$$
DELIMITER ;

CALL nw_final_runtime_fix();
DROP PROCEDURE nw_final_runtime_fix;

-- Seed property types only if the setting is currently empty.
UPDATE app_settings
SET property_categories = JSON_ARRAY(
  JSON_OBJECT('key','apartment','label','Apartment','plural','Apartments','description','Modern apartments for rent and sale','enabled',true,'show_on_home',true),
  JSON_OBJECT('key','luxury-apartment','label','Luxury Apartment','plural','Luxury Apartments','description','Premium residences with elevated finishes and services','enabled',true,'show_on_home',true),
  JSON_OBJECT('key','villa','label','Villa','plural','Villas','description','Private villas and executive homes','enabled',true,'show_on_home',true),
  JSON_OBJECT('key','building','label','Building','plural','Buildings','description','Residential and mixed-use buildings','enabled',true,'show_on_home',true),
  JSON_OBJECT('key','office','label','Office','plural','Offices','description','Professional office and commercial workspaces','enabled',true,'show_on_home',false),
  JSON_OBJECT('key','land','label','Land / Plot','plural','Land / Plots','description','Development land and investment plots','enabled',true,'show_on_home',false),
  JSON_OBJECT('key','studio','label','Studio','plural','Studios','description','Efficient, modern studio residences','enabled',true,'show_on_home',false),
  JSON_OBJECT('key','commercial','label','Commercial','plural','Commercial Spaces','description','Retail and commercial investment spaces','enabled',true,'show_on_home',false)
)
WHERE id=1 AND (property_categories IS NULL OR JSON_LENGTH(property_categories)=0);

SELECT 'NOVAWORKS final runtime migration OK' AS status;
