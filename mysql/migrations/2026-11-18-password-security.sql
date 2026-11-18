-- Apply in staging before enabling the new password security workflow.
-- Independent table avoids changing legacy password_reset_requests during rollout.
CREATE TABLE IF NOT EXISTS password_security_requests (
 id CHAR(36) PRIMARY KEY,
 user_id CHAR(36) NOT NULL,
 request_type ENUM('forgot','change') NOT NULL,
 email VARCHAR(255) NOT NULL,
 reason VARCHAR(1000) NOT NULL,
 status ENUM('requested','email_verified','approved','rejected','completed','expired') NOT NULL DEFAULT 'requested',
 otp_hash CHAR(64) NOT NULL,
 otp_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
 otp_expires_at DATETIME NOT NULL,
 otp_verified_at DATETIME NULL,
 approved_by CHAR(36) NULL,
 approval_reason VARCHAR(1000) NULL,
 approved_at DATETIME NULL,
 completion_token_hash CHAR(64) NULL UNIQUE,
 completion_expires_at DATETIME NULL,
 completed_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at DATETIME NOT NULL,
 INDEX idx_psr_user(user_id,status,created_at),
 INDEX idx_psr_queue(status,created_at),
 CONSTRAINT fk_psr_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT fk_psr_approver FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
