-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/lpdxkaqkrpydehahstsg/sql/new

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  service TEXT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied')),
  service_price_cents INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'in_store' CHECK (payment_method IN ('in_store', 'online')),
  payment_status TEXT NOT NULL DEFAULT 'pay_in_store' CHECK (payment_status IN ('pay_in_store', 'unpaid', 'paid', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_price_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'in_store';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pay_in_store';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_method_check'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check
      CHECK (payment_method IN ('in_store', 'online'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_status_check'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
      CHECK (payment_status IN ('pay_in_store', 'unpaid', 'paid', 'refunded'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS site_content (
  id TEXT PRIMARY KEY DEFAULT 'main',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone, used);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date, booking_time);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);

-- Password + device-trust login (2026-07-02)
-- `otp_codes.code` now stores a SHA-256 hash of the code, not the raw code.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'sms'
  CHECK (method IN ('sms', 'totp'));
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS totp_secret TEXT;
-- TOTP rows have no code; SMS rows have no totp_secret.
ALTER TABLE otp_codes ALTER COLUMN code DROP NOT NULL;

CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_token_hash ON trusted_devices(token_hash);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);

-- In-app cancel / reschedule (2026-07-03)
-- Customers can now cancel bookings, which sets status to 'cancelled'.
DO $$
BEGIN
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
  ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('pending', 'accepted', 'denied', 'cancelled'));
END $$;

-- Admin cockpit rebuild (2026-07-03)
-- OPTIONAL audit trail for "View as customer" impersonation. The feature works
-- WITHOUT this table (writes are best-effort and swallow errors); create it only
-- if you want a record of when the admin viewed as a customer.
CREATE TABLE IF NOT EXISTS impersonation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('start', 'stop')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_impersonation_log_admin ON impersonation_log(admin_id);
