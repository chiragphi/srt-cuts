-- Add ip_hash column to otp_codes for IP-based SMS rate limiting.
-- Run this in your Supabase dashboard (SQL Editor) before deploying the
-- matching change to src/app/api/auth/verify/start/route.ts.

ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS ip_hash TEXT;

-- Index makes the per-IP hourly count query fast.
CREATE INDEX IF NOT EXISTS otp_codes_ip_hash_created_at
  ON otp_codes (ip_hash, created_at);
