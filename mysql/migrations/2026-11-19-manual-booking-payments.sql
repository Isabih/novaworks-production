-- Manual payment confirmation: gateway integrations stay disabled until agreements are complete.
-- Execute after taking a staging backup. No credentials or payment account details are stored.
CREATE TABLE IF NOT EXISTS booking_manual_payments (
  id CHAR(36) PRIMARY KEY,
  booking_id CHAR(36) NOT NULL,
  channel ENUM('cash','bank_transfer','mobile_money_manual') NOT NULL,
  reference VARCHAR(160) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  verified_by CHAR(36) NOT NULL,
  evidence_note VARCHAR(1000) NOT NULL,
  verified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_manual_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_manual_payment_verifier FOREIGN KEY (verified_by) REFERENCES users(id),
  UNIQUE KEY uq_manual_payment_booking (booking_id),
  UNIQUE KEY uq_manual_payment_reference (channel,reference),
  INDEX idx_manual_payment_verifier (verified_by,verified_at)
) ENGINE=InnoDB;
