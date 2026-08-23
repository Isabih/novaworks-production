USE novaworks;

-- Safe upgrade for databases created before the sign-in video field existed.
DELIMITER $$
CREATE PROCEDURE nw_add_auth_video_column()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'app_settings'
      AND COLUMN_NAME = 'auth_hero_video_url'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN auth_hero_video_url TEXT NULL AFTER auth_hero_image_url;
  END IF;
END$$
DELIMITER ;
CALL nw_add_auth_video_column();
DROP PROCEDURE nw_add_auth_video_column;

-- Mail / booking conversation workspace. Messages are pruned by the app after seven days.
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
  CONSTRAINT fk_comm_booking FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_comm_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_comm_assignee FOREIGN KEY(assigned_to) REFERENCES users(id) ON DELETE SET NULL,
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
  provider_email_id VARCHAR(120) NULL,
  provider_message_id VARCHAR(500) NULL,
  to_json JSON NULL,
  cc_json JSON NULL,
  attachments_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comm_message_thread FOREIGN KEY(thread_id) REFERENCES communication_threads(id) ON DELETE CASCADE,
  CONSTRAINT fk_comm_message_user FOREIGN KEY(sender_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_comm_provider_email(provider_email_id),
  INDEX idx_comm_message(thread_id,created_at)
) ENGINE=InnoDB;
