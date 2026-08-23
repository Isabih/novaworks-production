USE novaworks;

-- Run only on databases created before the final NIDA/Rwanda customer fields were added.
ALTER TABLE customers
  ADD COLUMN place_of_birth VARCHAR(200) NULL AFTER date_of_birth,
  ADD COLUMN nationality VARCHAR(100) NULL AFTER place_of_birth,
  ADD COLUMN civil_status VARCHAR(80) NULL AFTER nationality,
  ADD COLUMN father_name VARCHAR(255) NULL AFTER civil_status,
  ADD COLUMN mother_name VARCHAR(255) NULL AFTER father_name,
  ADD COLUMN surname VARCHAR(150) NULL AFTER mother_name,
  ADD COLUMN post_names VARCHAR(200) NULL AFTER surname,
  ADD COLUMN country VARCHAR(100) NOT NULL DEFAULT 'Rwanda' AFTER post_names,
  ADD COLUMN province VARCHAR(120) NULL AFTER country,
  ADD COLUMN domicile_country VARCHAR(120) NULL AFTER province,
  ADD COLUMN nida_upi VARCHAR(100) NULL AFTER domicile_village,
  ADD COLUMN nida_fosaid VARCHAR(30) NULL AFTER nida_upi,
  ADD COLUMN nida_service_available TINYINT(1) NULL AFTER nida_fosaid,
  ADD COLUMN nida_photo LONGTEXT NULL AFTER nida_service_available,
  ADD COLUMN marketing_consent TINYINT(1) NOT NULL DEFAULT 0 AFTER email_verified_at;

ALTER TABLE pending_customer_registrations
  ADD COLUMN gender VARCHAR(20) NULL AFTER national_id,
  ADD COLUMN date_of_birth VARCHAR(30) NULL AFTER gender,
  ADD COLUMN place_of_birth VARCHAR(200) NULL AFTER date_of_birth,
  ADD COLUMN nationality VARCHAR(100) NULL AFTER place_of_birth,
  ADD COLUMN civil_status VARCHAR(80) NULL AFTER nationality,
  ADD COLUMN father_name VARCHAR(255) NULL AFTER civil_status,
  ADD COLUMN mother_name VARCHAR(255) NULL AFTER father_name,
  ADD COLUMN surname VARCHAR(150) NULL AFTER mother_name,
  ADD COLUMN post_names VARCHAR(200) NULL AFTER surname,
  ADD COLUMN nida_upi VARCHAR(100) NULL AFTER post_names,
  ADD COLUMN nida_fosaid VARCHAR(30) NULL AFTER nida_upi,
  ADD COLUMN nida_service_available TINYINT(1) NULL AFTER nida_fosaid,
  ADD COLUMN nida_photo LONGTEXT NULL AFTER nida_service_available,
  ADD COLUMN nida_verified_at DATETIME NULL AFTER nida_photo,
  ADD COLUMN country VARCHAR(100) NOT NULL DEFAULT 'Rwanda' AFTER nida_verified_at,
  ADD COLUMN province VARCHAR(120) NULL AFTER country,
  ADD COLUMN district VARCHAR(120) NULL AFTER province,
  ADD COLUMN sector VARCHAR(120) NULL AFTER district,
  ADD COLUMN cell VARCHAR(120) NULL AFTER sector,
  ADD COLUMN village VARCHAR(120) NULL AFTER cell;

ALTER TABLE subscribers
  ADD COLUMN marketing_consent TINYINT(1) NOT NULL DEFAULT 1 AFTER notify,
  ADD COLUMN unsubscribed_at DATETIME NULL AFTER marketing_consent;
