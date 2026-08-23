USE novaworks;

-- 1) Dedicated Property Types table. No app_settings column dependency.
CREATE TABLE IF NOT EXISTS property_types (
  type_key VARCHAR(80) PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  plural VARCHAR(140) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  image_url TEXT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  show_on_home TINYINT(1) NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO property_types(type_key,label,plural,description,enabled,show_on_home,position) VALUES
('apartment','Apartment','Apartments','Modern apartments for rent and sale',1,1,0),
('luxury-apartment','Luxury Apartment','Luxury Apartments','Premium residences with elevated finishes and services',1,1,1),
('villa','Villa','Villas','Private villas and executive homes',1,1,2),
('building','Building','Buildings','Residential and mixed-use buildings',1,1,3),
('office','Office','Offices','Professional office and commercial workspaces',1,0,4),
('land','Land / Plot','Land / Plots','Development land and investment plots',1,0,5),
('studio','Studio','Studios','Efficient, modern studio residences',1,0,6),
('commercial','Commercial','Commercial Spaces','Retail and commercial investment spaces',1,0,7);

-- 2) Add communication provider metadata only when missing.
DELIMITER $$
DROP PROCEDURE IF EXISTS nw_runtime_columns$$
CREATE PROCEDURE nw_runtime_columns()
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages') THEN
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
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='communication_messages' AND INDEX_NAME='uq_comm_provider_email') THEN
      CREATE UNIQUE INDEX uq_comm_provider_email ON communication_messages(provider_email_id);
    END IF;
  END IF;
END$$
CALL nw_runtime_columns()$$
DROP PROCEDURE nw_runtime_columns$$
DELIMITER ;

SELECT 'NOVAWORKS core runtime safe migration OK' AS status;
