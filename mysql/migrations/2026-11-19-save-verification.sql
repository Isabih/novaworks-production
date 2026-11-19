-- Apply after the password-security tables. Separate purpose from password reset.
CREATE TABLE IF NOT EXISTS save_verification_challenges (
 id CHAR(36) PRIMARY KEY,
 user_id CHAR(36) NOT NULL,
 action_key VARCHAR(120) NOT NULL,
 payload_hash CHAR(64) NOT NULL,
 otp_hash CHAR(64) NOT NULL,
 attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
 expires_at DATETIME NOT NULL,
 consumed_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_save_verification_user(user_id,action_key,created_at),
 CONSTRAINT fk_save_verification_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
