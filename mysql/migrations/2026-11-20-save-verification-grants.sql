-- A successful OTP grants 15 minutes of save authorization to the same login session.
CREATE TABLE IF NOT EXISTS save_verification_grants (
 user_id CHAR(36) NOT NULL,
 session_hash CHAR(64) NOT NULL,
 expires_at DATETIME NOT NULL,
 PRIMARY KEY (user_id,session_hash),
 INDEX idx_save_grants_expiry(expires_at),
 CONSTRAINT fk_save_grants_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
