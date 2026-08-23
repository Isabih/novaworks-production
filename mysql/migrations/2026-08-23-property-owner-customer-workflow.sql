USE novaworks;

CREATE TABLE IF NOT EXISTS service_catalog (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  description VARCHAR(500) NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'general',
  default_priority ENUM('low','medium','high','urgent','emergency') NOT NULL DEFAULT 'medium',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_service_catalog_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_service_catalog_active(active,name)
) ENGINE=InnoDB;

INSERT IGNORE INTO service_catalog(id,code,name,description,category,default_priority) VALUES
(UUID(),'plumbing','Plumbing','Water taps, pipes, drainage and leaks','plumbing','high'),
(UUID(),'electrical','Electrical','Lights, sockets and electrical faults','electrical','high'),
(UUID(),'cleaning','Cleaning','Cleaning and housekeeping support','cleaning','medium'),
(UUID(),'security','Security','Door, lock or security-related issue','security','urgent'),
(UUID(),'maintenance','General maintenance','Repairs and apartment maintenance','maintenance','medium'),
(UUID(),'other','Other','A service not listed above','other','medium');

CREATE TABLE IF NOT EXISTS apartment_images (
  id CHAR(36) PRIMARY KEY,
  apartment_id CHAR(36) NOT NULL,
  url TEXT NOT NULL,
  storage_path VARCHAR(700) NULL,
  alt_text VARCHAR(255) NULL,
  position INT NOT NULL DEFAULT 0,
  is_cover TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_apartment_images_apartment FOREIGN KEY(apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
  INDEX idx_apartment_images(apartment_id,position)
) ENGINE=InnoDB;

DELIMITER $$
CREATE PROCEDURE nw_workflow_upgrade()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='email_notifications_enabled') THEN
    ALTER TABLE users ADD COLUMN email_notifications_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER active;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_threads' AND COLUMN_NAME='unread_count') THEN
    ALTER TABLE communication_threads ADD COLUMN unread_count INT NOT NULL DEFAULT 0 AFTER status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_threads' AND COLUMN_NAME='last_read_at') THEN
    ALTER TABLE communication_threads ADD COLUMN last_read_at DATETIME NULL AFTER unread_count;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='luxury_access_requests' AND COLUMN_NAME='property_slug') THEN
    ALTER TABLE luxury_access_requests ADD COLUMN property_slug VARCHAR(220) NULL AFTER message;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages' AND COLUMN_NAME='provider_email_id') THEN
    ALTER TABLE communication_messages ADD COLUMN provider_email_id VARCHAR(120) NULL AFTER sent_via_email;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages' AND COLUMN_NAME='provider_message_id') THEN
    ALTER TABLE communication_messages ADD COLUMN provider_message_id VARCHAR(500) NULL AFTER provider_email_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages' AND COLUMN_NAME='to_json') THEN
    ALTER TABLE communication_messages ADD COLUMN to_json JSON NULL AFTER provider_message_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages' AND COLUMN_NAME='cc_json') THEN
    ALTER TABLE communication_messages ADD COLUMN cc_json JSON NULL AFTER to_json;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages' AND COLUMN_NAME='attachments_json') THEN
    ALTER TABLE communication_messages ADD COLUMN attachments_json JSON NULL AFTER cc_json;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='properties' AND COLUMN_NAME='structure_mode') THEN
    ALTER TABLE properties ADD COLUMN structure_mode VARCHAR(30) NOT NULL DEFAULT 'standalone' AFTER property_type;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='apartments' AND COLUMN_NAME='unit_type') THEN
    ALTER TABLE apartments ADD COLUMN unit_type VARCHAR(40) NOT NULL DEFAULT 'apartment' AFTER name;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='apartments' AND COLUMN_NAME='area_sqm') THEN
    ALTER TABLE apartments ADD COLUMN area_sqm DECIMAL(10,2) NULL AFTER bathrooms;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='visit_requests' AND COLUMN_NAME='apartment_id') THEN
    ALTER TABLE visit_requests ADD COLUMN apartment_id CHAR(36) NULL AFTER property_id;
    ALTER TABLE visit_requests ADD CONSTRAINT fk_visit_apartment FOREIGN KEY(apartment_id) REFERENCES apartments(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='service_requests' AND COLUMN_NAME='service_catalog_id') THEN
    ALTER TABLE service_requests ADD COLUMN service_catalog_id CHAR(36) NULL AFTER apartment_id;
    ALTER TABLE service_requests ADD CONSTRAINT fk_sr_catalog FOREIGN KEY(service_catalog_id) REFERENCES service_catalog(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='service_requests' AND COLUMN_NAME='expected_at') THEN
    ALTER TABLE service_requests ADD COLUMN expected_at DATETIME NULL AFTER admin_response;
  END IF;
  -- Existing installations may have older, narrower enums. Normalize them for the new customer service workflow.
  ALTER TABLE service_requests MODIFY COLUMN category ENUM('maintenance','plumbing','electrical','cleaning','security','general','other') NOT NULL DEFAULT 'general';
  ALTER TABLE service_requests MODIFY COLUMN priority ENUM('low','medium','high','urgent','emergency') NOT NULL DEFAULT 'medium';
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='bookings' AND COLUMN_NAME='booking_type') THEN
    ALTER TABLE bookings ADD COLUMN booking_type VARCHAR(30) NOT NULL DEFAULT 'new_stay' AFTER status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='bookings' AND COLUMN_NAME='tenancy_id') THEN
    ALTER TABLE bookings ADD COLUMN tenancy_id CHAR(36) NULL AFTER apartment_id;
    ALTER TABLE bookings ADD CONSTRAINT fk_booking_tenancy FOREIGN KEY(tenancy_id) REFERENCES tenancies(id) ON DELETE SET NULL;
  END IF;
END$$
CALL nw_workflow_upgrade()$$
DROP PROCEDURE nw_workflow_upgrade$$
DELIMITER ;


CREATE OR REPLACE VIEW available_apartments AS
SELECT a.* FROM apartments a
WHERE a.status='available'
  AND NOT EXISTS(
    SELECT 1 FROM tenancies t
    WHERE t.apartment_id=a.id
      AND t.status IN('reserved','active','extension_requested')
      AND t.end_date>=CURRENT_DATE()
  )
  AND NOT EXISTS(
    SELECT 1 FROM bookings b
    WHERE b.apartment_id=a.id
      AND b.status IN('pending','confirmed')
  );

-- Consolidate historical duplicate open mail threads so one email = one inbox conversation.
DROP TEMPORARY TABLE IF EXISTS nw_thread_canonical;
CREATE TEMPORARY TABLE nw_thread_canonical AS
SELECT LOWER(external_email) email_key,
       SUBSTRING_INDEX(GROUP_CONCAT(id ORDER BY last_message_at DESC, created_at DESC SEPARATOR ','), ',', 1) keep_id
FROM communication_threads
WHERE status='open' AND external_email IS NOT NULL AND external_email<>''
GROUP BY LOWER(external_email);

UPDATE communication_messages m
JOIN communication_threads t ON t.id=m.thread_id
JOIN nw_thread_canonical c ON c.email_key=LOWER(t.external_email)
SET m.thread_id=c.keep_id
WHERE t.id<>c.keep_id;

UPDATE communication_threads keep_t
JOIN (
  SELECT c.keep_id, MAX(t.last_message_at) latest, SUM(COALESCE(t.unread_count,0)) unread_total
  FROM nw_thread_canonical c
  JOIN communication_threads t ON LOWER(t.external_email)=c.email_key AND t.status='open'
  GROUP BY c.keep_id
) x ON x.keep_id=keep_t.id
SET keep_t.last_message_at=x.latest, keep_t.unread_count=x.unread_total;

DELETE t FROM communication_threads t
JOIN nw_thread_canonical c ON c.email_key=LOWER(t.external_email)
WHERE t.status='open' AND t.id<>c.keep_id;

DROP TEMPORARY TABLE IF EXISTS nw_thread_canonical;

SELECT 'NOVAWORKS property/owner/customer workflow migration OK' AS status;
