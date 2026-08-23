CREATE DATABASE IF NOT EXISTS novaworks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE novaworks;
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  business_email VARCHAR(255) NULL UNIQUE,
  secondary_email VARCHAR(255) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  avatar_url TEXT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  email_notifications_enabled TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  email_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email(email), INDEX idx_users_active(active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id CHAR(36) NOT NULL,
  role ENUM('it','admin','receptionist','agent','customer','owner') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, role),
  CONSTRAINT fk_user_roles_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token VARCHAR(180) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user(user_id), INDEX idx_sessions_expiry(expires_at,revoked_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(12) NOT NULL,
  purpose VARCHAR(60) NOT NULL DEFAULT 'account_verify',
  attempts INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ev_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ev_lookup(email,purpose,expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS feature_flags (
  feature_key VARCHAR(120) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  scope_json JSON NULL,
  updated_by CHAR(36) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_feature_user FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO feature_flags(feature_key,label,enabled) VALUES
('properties','Properties',1),('portfolio','Portfolio',1),('customer_registration','Customer registration',1),
('service_requests','Service requests',1),('visit_requests','Visit requests',1),('email_notifications','Email notifications',1),
('sms_notifications','SMS notifications',1),('bookings','Bookings',1),('luxury_access','Luxury access',1),('nova_ai','NOVA AI',1);

CREATE TABLE IF NOT EXISTS app_settings (
  id TINYINT PRIMARY KEY DEFAULT 1,
  sender_name VARCHAR(120) NOT NULL DEFAULT 'NOVAWORKS',
  from_email VARCHAR(255) NOT NULL DEFAULT 'no-reply@novaworks.rw',
  reply_to VARCHAR(255) NULL,
  signature TEXT NULL,
  brand_color VARCHAR(20) NOT NULL DEFAULT '#c9a96b',
  site_url VARCHAR(255) NOT NULL DEFAULT 'https://novaworks.rw',
  sms_enabled TINYINT(1) NOT NULL DEFAULT 0,
  sms_mode ENUM('relay','device') NOT NULL DEFAULT 'device',
  sr_confirm_subject VARCHAR(255) NOT NULL DEFAULT 'We received your service request',
  sr_confirm_body TEXT NULL,
  sr_urgent_label VARCHAR(120) NOT NULL DEFAULT 'URGENT — being handled with top priority',
  sr_normal_label VARCHAR(120) NOT NULL DEFAULT 'new',
  sr_reply_subject VARCHAR(255) NOT NULL DEFAULT 'Update on your service request',
  hero_slides JSON NULL,
  category_images JSON NULL,
  hero_story_video_url TEXT NULL,
  hero_video_bg_url TEXT NULL,
  auth_hero_image_url TEXT NULL,
  auth_hero_video_url TEXT NULL,
  property_categories JSON NULL,
  featured_property_ids JSON NULL,
  contact_ceo JSON NULL,
  contact_team JSON NULL,
  contact_info JSON NULL,
  about_content JSON NULL,
  portfolio_videos JSON NULL,
  updated_by CHAR(36) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_settings_user FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK(id=1)
) ENGINE=InnoDB;
INSERT IGNORE INTO app_settings(id,signature) VALUES(1,'Regards,\nNOVAWORKS Team');

CREATE TABLE IF NOT EXISTS properties (
  id CHAR(36) PRIMARY KEY,
  owner_id CHAR(36) NULL,
  agent_id CHAR(36) NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description MEDIUMTEXT NULL,
  property_type VARCHAR(80) NOT NULL DEFAULT 'residential',
  structure_mode VARCHAR(30) NOT NULL DEFAULT 'standalone',
  listing_type ENUM('sale','rent') NOT NULL DEFAULT 'sale',
  status ENUM('draft','active','sold','rented','archived','maintenance') NOT NULL DEFAULT 'draft',
  price DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  bedrooms INT NOT NULL DEFAULT 0,
  bathrooms INT NOT NULL DEFAULT 0,
  area_sqm DECIMAL(10,2) NULL,
  address VARCHAR(500) NULL,
  city VARCHAR(120) NULL,
  district VARCHAR(120) NULL,
  country VARCHAR(120) NOT NULL DEFAULT 'Rwanda',
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(10,7) NULL,
  amenities_json JSON NULL,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  notify_subscribers TINYINT(1) NOT NULL DEFAULT 0,
  views_count BIGINT NOT NULL DEFAULT 0,
  video_url TEXT NULL,
  tour_3d_url TEXT NULL,
  blueprint_url TEXT NULL,
  unit_count INT NOT NULL DEFAULT 1,
  unit_code_prefix VARCHAR(40) NULL,
  is_luxury TINYINT(1) NOT NULL DEFAULT 0,
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  available_from DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_property_owner FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_property_agent FOREIGN KEY(agent_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_property_search(status,listing_type,property_type,city), INDEX idx_property_owner(owner_id), INDEX idx_property_agent(agent_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_images (
  id CHAR(36) PRIMARY KEY,
  property_id CHAR(36) NOT NULL,
  url TEXT NOT NULL,
  storage_path VARCHAR(700) NULL,
  alt_text VARCHAR(255) NULL,
  position INT NOT NULL DEFAULT 0,
  is_cover TINYINT(1) NOT NULL DEFAULT 0,
  section VARCHAR(80) NOT NULL DEFAULT 'main',
  provider VARCHAR(40) NOT NULL DEFAULT 'r2',
  width INT NULL,
  height INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_property_images_property FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_images_property(property_id,position)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS apartments (
  id CHAR(36) PRIMARY KEY,
  property_id CHAR(36) NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(120) NULL,
  unit_type VARCHAR(40) NOT NULL DEFAULT 'apartment',
  floor INT NULL,
  bedrooms INT NULL,
  bathrooms INT NULL,
  area_sqm DECIMAL(10,2) NULL,
  status ENUM('available','occupied','maintenance','reserved') NOT NULL DEFAULT 'available',
  monthly_price DECIMAL(14,2) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_apartment_property FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY uq_apartment_code(property_id,code), INDEX idx_apartment_availability(property_id,status)
) ENGINE=InnoDB;

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

CREATE TABLE IF NOT EXISTS customers (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  national_id VARCHAR(40) NULL UNIQUE,
  gender VARCHAR(20) NULL,
  date_of_birth VARCHAR(30) NULL,
  place_of_birth VARCHAR(200) NULL,
  nationality VARCHAR(100) NULL,
  civil_status VARCHAR(80) NULL,
  father_name VARCHAR(255) NULL,
  mother_name VARCHAR(255) NULL,
  surname VARCHAR(150) NULL,
  post_names VARCHAR(200) NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Rwanda',
  province VARCHAR(120) NULL,
  domicile_country VARCHAR(120) NULL,
  domicile_district VARCHAR(120) NULL,
  domicile_sector VARCHAR(120) NULL,
  domicile_cell VARCHAR(120) NULL,
  domicile_village VARCHAR(120) NULL,
  nida_upi VARCHAR(100) NULL,
  nida_fosaid VARCHAR(30) NULL,
  nida_service_available TINYINT(1) NULL,
  nida_photo LONGTEXT NULL,
  nida_verified_at DATETIME NULL,
  nida_snapshot_json JSON NULL,
  email_verified_at DATETIME NULL,
  marketing_consent TINYINT(1) NOT NULL DEFAULT 0,
  qr_token VARCHAR(100) NULL UNIQUE,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_customer_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_customer_email(email), INDEX idx_customer_phone(phone), INDEX idx_customer_name(full_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pending_customer_registrations (
  id CHAR(36) PRIMARY KEY,
  created_by CHAR(36) NOT NULL,
  existing_customer_id CHAR(36) NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  national_id VARCHAR(40) NULL,
  gender VARCHAR(20) NULL,
  date_of_birth VARCHAR(30) NULL,
  place_of_birth VARCHAR(200) NULL,
  nationality VARCHAR(100) NULL,
  civil_status VARCHAR(80) NULL,
  father_name VARCHAR(255) NULL,
  mother_name VARCHAR(255) NULL,
  surname VARCHAR(150) NULL,
  post_names VARCHAR(200) NULL,
  nida_upi VARCHAR(100) NULL,
  nida_fosaid VARCHAR(30) NULL,
  nida_service_available TINYINT(1) NULL,
  nida_photo LONGTEXT NULL,
  nida_verified_at DATETIME NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Rwanda',
  province VARCHAR(120) NULL,
  district VARCHAR(120) NULL,
  sector VARCHAR(120) NULL,
  cell VARCHAR(120) NULL,
  village VARCHAR(120) NULL,
  nida_snapshot_json JSON NULL,
  property_id CHAR(36) NOT NULL,
  apartment_id CHAR(36) NOT NULL,
  stay_start DATE NOT NULL,
  stay_end DATE NOT NULL,
  rent_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(80) NULL,
  verification_code VARCHAR(12) NOT NULL,
  verification_expires_at DATETIME NOT NULL,
  email_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pending_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_pending_customer FOREIGN KEY(existing_customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_pending_property FOREIGN KEY(property_id) REFERENCES properties(id),
  CONSTRAINT fk_pending_apartment FOREIGN KEY(apartment_id) REFERENCES apartments(id),
  INDEX idx_pending_email(email,verification_expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tenancies (
  id CHAR(36) PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  property_id CHAR(36) NOT NULL,
  apartment_id CHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  actual_checkout_at DATETIME NULL,
  status ENUM('reserved','active','extension_requested','ended','cancelled') NOT NULL DEFAULT 'reserved',
  rent_amount DECIMAL(14,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenancy_customer FOREIGN KEY(customer_id) REFERENCES customers(id),
  CONSTRAINT fk_tenancy_property FOREIGN KEY(property_id) REFERENCES properties(id),
  CONSTRAINT fk_tenancy_apartment FOREIGN KEY(apartment_id) REFERENCES apartments(id),
  CONSTRAINT fk_tenancy_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tenancy_dates(apartment_id,start_date,end_date,status), INDEX idx_tenancy_customer(customer_id,status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stay_extension_requests (
  id CHAR(36) PRIMARY KEY,
  tenancy_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  requested_end_date DATE NOT NULL,
  reason TEXT NULL,
  status ENUM('pending','approved','denied','cancelled') NOT NULL DEFAULT 'pending',
  decided_by CHAR(36) NULL,
  decided_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_extension_tenancy FOREIGN KEY(tenancy_id) REFERENCES tenancies(id) ON DELETE CASCADE,
  CONSTRAINT fk_extension_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_extension_decider FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_extension_status(status,created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) PRIMARY KEY,
  tenancy_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(80) NULL,
  reference VARCHAR(160) NULL UNIQUE,
  status ENUM('pending','confirmed','failed','refunded','partially_refunded') NOT NULL DEFAULT 'pending',
  paid_at DATETIME NULL,
  confirmed_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_tenancy FOREIGN KEY(tenancy_id) REFERENCES tenancies(id),
  CONSTRAINT fk_payment_customer FOREIGN KEY(customer_id) REFERENCES customers(id),
  CONSTRAINT fk_payment_confirmer FOREIGN KEY(confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_payment_tenancy(tenancy_id,status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  property_id CHAR(36) NOT NULL,
  apartment_id CHAR(36) NULL,
  tenancy_id CHAR(36) NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INT NOT NULL DEFAULT 1,
  nightly_rate DECIMAL(14,2) NOT NULL DEFAULT 0,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'RWF',
  payment_method VARCHAR(80) NOT NULL DEFAULT 'momo',
  payment_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  payment_reference VARCHAR(160) NULL UNIQUE,
  gateway_tx_id VARCHAR(200) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  booking_type VARCHAR(30) NOT NULL DEFAULT 'new_stay',
  notes TEXT NULL,
  confirmed_by CHAR(36) NULL,
  confirmed_at DATETIME NULL,
  stay_start DATETIME NULL,
  stay_end DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_property FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_apartment FOREIGN KEY(apartment_id) REFERENCES apartments(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_tenancy FOREIGN KEY(tenancy_id) REFERENCES tenancies(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_confirmer FOREIGN KEY(confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_booking_user(user_id), INDEX idx_booking_status(status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_inquiries (
  id CHAR(36) PRIMARY KEY,
  property_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  customer_id CHAR(36) NULL,
  name VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(40) NULL,
  message TEXT NULL,
  status ENUM('new','contacted','scheduled','closed') NOT NULL DEFAULT 'new',
  scheduled_at DATETIME NULL,
  assigned_admin_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inquiry_property FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_inquiry_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_inquiry_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_inquiry_admin FOREIGN KEY(assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_inquiry_property(property_id), INDEX idx_inquiry_admin(assigned_admin_id,status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS saved_properties (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  property_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_saved(user_id,property_id),
  CONSTRAINT fk_saved_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_property FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_views (
  id CHAR(36) PRIMARY KEY,
  property_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_view_property FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_view_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_view_property(property_id), INDEX idx_view_date(viewed_at)
) ENGINE=InnoDB;

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
  CONSTRAINT fk_service_catalog_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO service_catalog(id,code,name,description,category,default_priority) VALUES
(UUID(),'plumbing','Plumbing','Water taps, pipes, drainage and leaks','plumbing','high'),
(UUID(),'electrical','Electrical','Lights, sockets and electrical faults','electrical','high'),
(UUID(),'cleaning','Cleaning','Cleaning and housekeeping support','cleaning','medium'),
(UUID(),'security','Security','Door, lock or security-related issue','security','urgent'),
(UUID(),'maintenance','General maintenance','Repairs and apartment maintenance','maintenance','medium'),
(UUID(),'other','Other','A service not listed above','other','medium');

CREATE TABLE IF NOT EXISTS service_requests (
  id CHAR(36) PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  tenancy_id CHAR(36) NULL,
  property_id CHAR(36) NOT NULL,
  apartment_id CHAR(36) NULL,
  service_catalog_id CHAR(36) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('maintenance','plumbing','electrical','cleaning','security','general','other') NOT NULL DEFAULT 'general',
  priority ENUM('low','medium','high','urgent','emergency') NOT NULL DEFAULT 'medium',
  status ENUM('pending','assigned','in_progress','awaiting_owner','completed','cancelled') NOT NULL DEFAULT 'pending',
  assigned_admin_id CHAR(36) NULL,
  admin_response TEXT NULL,
  expected_at DATETIME NULL,
  image_urls_json JSON NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME NULL,
  responded_by CHAR(36) NULL,
  completed_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sr_customer FOREIGN KEY(customer_id) REFERENCES customers(id),
  CONSTRAINT fk_sr_tenancy FOREIGN KEY(tenancy_id) REFERENCES tenancies(id) ON DELETE SET NULL,
  CONSTRAINT fk_sr_property FOREIGN KEY(property_id) REFERENCES properties(id),
  CONSTRAINT fk_sr_apartment FOREIGN KEY(apartment_id) REFERENCES apartments(id) ON DELETE SET NULL,
  CONSTRAINT fk_sr_catalog FOREIGN KEY(service_catalog_id) REFERENCES service_catalog(id) ON DELETE SET NULL,
  CONSTRAINT fk_sr_admin FOREIGN KEY(assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_sr_responder FOREIGN KEY(responded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_sr_queue(status,priority,requested_at), INDEX idx_sr_admin(assigned_admin_id,status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_items (
  id CHAR(36) PRIMARY KEY,
  service_request_id CHAR(36) NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  vendor VARCHAR(255) NULL,
  receipt_url TEXT NULL,
  owner_chargeable TINYINT(1) NOT NULL DEFAULT 1,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_service_item_request FOREIGN KEY(service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_service_item_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_service_items_request(service_request_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS visit_requests (
  id CHAR(36) PRIMARY KEY,
  property_id CHAR(36) NOT NULL,
  apartment_id CHAR(36) NULL,
  customer_id CHAR(36) NULL,
  requester_name VARCHAR(255) NULL,
  requester_email VARCHAR(255) NULL,
  requester_phone VARCHAR(40) NULL,
  requested_for DATETIME NULL,
  notes TEXT NULL,
  assigned_admin_id CHAR(36) NULL,
  status ENUM('requested','assigned','confirmed','completed','cancelled','expired','no_show') NOT NULL DEFAULT 'requested',
  completed_at DATETIME NULL,
  reminder_sent_at DATETIME NULL,
  overdue_notified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_visit_property FOREIGN KEY(property_id) REFERENCES properties(id),
  CONSTRAINT fk_visit_apartment FOREIGN KEY(apartment_id) REFERENCES apartments(id) ON DELETE SET NULL,
  CONSTRAINT fk_visit_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_visit_admin FOREIGN KEY(assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_visit_assignment(assigned_admin_id,status,requested_for)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS owner_ledger (
  id CHAR(36) PRIMARY KEY,
  owner_id CHAR(36) NOT NULL,
  property_id CHAR(36) NOT NULL,
  tenancy_id CHAR(36) NULL,
  service_request_id CHAR(36) NULL,
  entry_type ENUM('rent_income','commission','maintenance','adjustment','payout','refund') NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  direction ENUM('credit','debit') NOT NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ledger_owner FOREIGN KEY(owner_id) REFERENCES users(id),
  CONSTRAINT fk_ledger_property FOREIGN KEY(property_id) REFERENCES properties(id),
  CONSTRAINT fk_ledger_tenancy FOREIGN KEY(tenancy_id) REFERENCES tenancies(id) ON DELETE SET NULL,
  CONSTRAINT fk_ledger_service FOREIGN KEY(service_request_id) REFERENCES service_requests(id) ON DELETE SET NULL,
  CONSTRAINT fk_ledger_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_owner_ledger(owner_id,property_id,created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  recipient_id CHAR(36) NOT NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id CHAR(36) NULL,
  priority ENUM('normal','high','urgent','emergency') NOT NULL DEFAULT 'normal',
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_user FOREIGN KEY(recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notification_unread(recipient_id,read_at,created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS staff_notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NULL,
  reference_id CHAR(36) NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_notification_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_staff_notification(user_id,read_at,created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id CHAR(36) NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_entity(entity_type,entity_id,created_at), INDEX idx_audit_actor(actor_user_id,created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending','approved','denied') NOT NULL DEFAULT 'pending',
  approved_by CHAR(36) NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pr_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_pr_approver FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_pr_status(status,created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pending_staff (
  id CHAR(36) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  business_email VARCHAR(255) NOT NULL,
  secondary_email VARCHAR(255) NULL,
  phone VARCHAR(40) NULL,
  roles_json JSON NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  otp_code VARCHAR(12) NOT NULL,
  otp_expires_at DATETIME NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pending_staff_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contact_messages (
  id CHAR(36) PRIMARY KEY,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  interest VARCHAR(120) NULL,
  message TEXT NOT NULL,
  status ENUM('new','in_progress','resolved','spam') NOT NULL DEFAULT 'new',
  assigned_admin_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_contact_admin FOREIGN KEY(assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_contact_status(status,created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subscribers (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  notify TINYINT(1) NOT NULL DEFAULT 1,
  marketing_consent TINYINT(1) NOT NULL DEFAULT 1,
  unsubscribed_at DATETIME NULL,
  otp_code VARCHAR(12) NULL,
  otp_expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS communication_threads (
  id CHAR(36) PRIMARY KEY, subject VARCHAR(255) NOT NULL, kind ENUM('booking','email','general') NOT NULL DEFAULT 'general', booking_id CHAR(36) NULL, external_email VARCHAR(255) NULL, status ENUM('open','closed') NOT NULL DEFAULT 'open', unread_count INT NOT NULL DEFAULT 0, last_read_at DATETIME NULL, created_by CHAR(36) NULL, assigned_to CHAR(36) NULL, last_message_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comm_booking FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE, CONSTRAINT fk_comm_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL, CONSTRAINT fk_comm_assignee FOREIGN KEY(assigned_to) REFERENCES users(id) ON DELETE SET NULL, INDEX idx_comm_last(last_message_at), INDEX idx_comm_email(external_email)
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
CREATE TABLE IF NOT EXISTS email_log (
  id CHAR(36) PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  kind VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'sent',
  error TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_log(created_at,kind)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sms_log (
  id CHAR(36) PRIMARY KEY,
  to_phone VARCHAR(40) NOT NULL,
  kind VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL,
  response_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS luxury_access_requests (
  id CHAR(36) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  message TEXT NULL,
  property_slug VARCHAR(220) NULL,
  otp_code VARCHAR(12) NULL,
  otp_expires_at DATETIME NULL,
  email_verified_at DATETIME NULL,
  status ENUM('pending','approved','denied') NOT NULL DEFAULT 'pending',
  access_token VARCHAR(180) NULL UNIQUE,
  token_expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_of_the_day (
  id TINYINT PRIMARY KEY DEFAULT 1,
  property_id CHAR(36) NULL,
  updated_by CHAR(36) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pod_property FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE SET NULL,
  CONSTRAINT fk_pod_user FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK(id=1)
) ENGINE=InnoDB;
INSERT IGNORE INTO property_of_the_day(id) VALUES(1);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  image_url TEXT NOT NULL,
  storage_path VARCHAR(700) NULL,
  link_url TEXT NULL,
  position INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_portfolio_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_portfolio_active(active,position)
) ENGINE=InnoDB;

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

CREATE OR REPLACE VIEW owner_balances AS
SELECT owner_id,currency,SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END) balance
FROM owner_ledger GROUP BY owner_id,currency;
