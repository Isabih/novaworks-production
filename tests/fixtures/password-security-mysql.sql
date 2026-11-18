-- Minimal staging-like fixture for testing the password security migrations.
CREATE TABLE users (
 id CHAR(36) PRIMARY KEY,
 email VARCHAR(255) NOT NULL,
 password_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE audit_logs (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 actor_user_id CHAR(36) NULL,
 action VARCHAR(120) NOT NULL,
 entity_type VARCHAR(80) NOT NULL,
 entity_id VARCHAR(80) NULL,
 new_values JSON NULL
) ENGINE=InnoDB;
INSERT INTO users(id,email,password_hash) VALUES
 ('00000000-0000-0000-0000-000000000001','sample@example.test','dummy');
