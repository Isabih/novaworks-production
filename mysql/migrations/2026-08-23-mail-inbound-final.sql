USE novaworks;

-- Final Resend inbound-mail upgrade. Safe to run on an existing Novaworks MySQL 8 database.
DELIMITER $$
CREATE PROCEDURE nw_mail_upgrade()
BEGIN
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
CALL nw_mail_upgrade();
DROP PROCEDURE nw_mail_upgrade;
