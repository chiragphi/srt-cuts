# Verification resend cooldown — design

**Date:** 2026-07-03
**Status:** Approved

## Problem

The resend button could request unlimited codes — annoying for users who
double-tap, and an easy way for someone to drain prepaid Textbelt credits.

## Design

- **Server (`/api/auth/verify/start`)** — before issuing a code, read the
  newest `otp_codes.created_at` for the phone; if under 60s old, reject with
  429 and `retryAfter` (seconds). Enforced server-side so hammering the
  endpoint directly can't burn credits.
- **Client (auth page)** — a 60s countdown starts when an SMS code is sent;
  the resend button is disabled and reads "Resend in Ns" until it expires.
  A 429 response syncs the local countdown to the server's `retryAfter`.

## Verification

Local test with an invalid Textbelt key (no real sends): first request 200,
immediate second request 429 with `retryAfter: 60`.
