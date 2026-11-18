CREATE TABLE IF NOT EXISTS password_notification_outbox (
 id CHAR(36) PRIMARY KEY,
 request_id CHAR(36) NOT NULL,
 recipient_ciphertext MEDIUMTEXT NOT NULL,
 subject_ciphertext MEDIUMTEXT NOT NULL,
 body_ciphertext MEDIUMTEXT NOT NULL,
 status ENUM('pending','sending','sent','failed') NOT NULL DEFAULT 'pending',
 attempts INT NOT NULL DEFAULT 0,
 next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 claimed_at DATETIME NULL,
 sent_at DATETIME NULL,
 last_error VARCHAR(500) NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_password_mail_queue(status,next_attempt_at),
 CONSTRAINT fk_password_mail_request FOREIGN KEY(request_id) REFERENCES password_security_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB;
