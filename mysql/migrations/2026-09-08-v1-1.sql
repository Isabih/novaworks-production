-- NOVAWORKS V1.1. Run once after a full database backup.
-- Existing property prices remain private internally; public display is opt-in.
ALTER TABLE properties MODIFY price DECIMAL(14,2) NULL DEFAULT NULL;
ALTER TABLE properties ADD COLUMN show_price TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE properties ADD COLUMN price_on_request TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE app_settings ADD COLUMN public_stats JSON NULL;
CREATE TABLE IF NOT EXISTS property_listing_requests (
 id CHAR(36) PRIMARY KEY,
 reference VARCHAR(32) NOT NULL UNIQUE,
 applicant_user_id CHAR(36) NULL,
 full_name VARCHAR(150) NOT NULL,
 email VARCHAR(255) NOT NULL,
 phone VARCHAR(40) NOT NULL,
 property_type VARCHAR(80) NOT NULL,
 listing_type ENUM('sale','rent') NOT NULL,
 title VARCHAR(255) NOT NULL,
 location VARCHAR(255) NOT NULL,
 district VARCHAR(120) NULL,
 description TEXT NULL,
 price DECIMAL(14,2) NULL,
 currency CHAR(3) NOT NULL DEFAULT 'USD',
 show_price TINYINT(1) NOT NULL DEFAULT 0,
 bedrooms INT NULL,
 bathrooms INT NULL,
 area_sqm DECIMAL(10,2) NULL,
 year_built INT NULL,
 video_url TEXT NULL,
 images_json JSON NULL,
 status ENUM('pending','in_review','approved','rejected') NOT NULL DEFAULT 'pending',
 assigned_admin_id CHAR(36) NULL,
 reviewed_by CHAR(36) NULL,
 review_note TEXT NULL,
 linked_property_id CHAR(36) NULL,
 acknowledgement_sent_at DATETIME NULL,
 response_due_at DATETIME NOT NULL,
 applicant_contacted_at DATETIME NULL,
 acknowledgement_error TEXT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_listing_requests_status(status,created_at),
 INDEX idx_listing_requests_email(email),
 CONSTRAINT fk_listing_applicant FOREIGN KEY(applicant_user_id) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_listing_assignee FOREIGN KEY(assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_listing_reviewer FOREIGN KEY(reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_listing_property FOREIGN KEY(linked_property_id) REFERENCES properties(id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS listing_email_outbox (
 id CHAR(36) PRIMARY KEY,
 listing_id CHAR(36) NOT NULL,
 recipient VARCHAR(255) NOT NULL,
 kind VARCHAR(60) NOT NULL,
 subject VARCHAR(255) NOT NULL,
 body_html MEDIUMTEXT NOT NULL,
 status ENUM('pending','sending','sent','failed') NOT NULL DEFAULT 'pending',
 attempts INT NOT NULL DEFAULT 0,
 next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 locked_until DATETIME NULL,
 sent_at DATETIME NULL,
 provider_id VARCHAR(255) NULL,
 last_error TEXT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_listing_email(listing_id,recipient,kind),
 INDEX idx_listing_outbox(status,next_attempt_at),
 FOREIGN KEY(listing_id) REFERENCES property_listing_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS listing_submission_limits (
 identity_hash CHAR(64) NOT NULL,
 window_start DATETIME NOT NULL,
 attempts INT NOT NULL DEFAULT 0,
 PRIMARY KEY(identity_hash,window_start)
) ENGINE=InnoDB;

