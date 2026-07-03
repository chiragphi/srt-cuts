# Textbelt SMS delivery — design

**Date:** 2026-07-03
**Status:** Approved

## Problem

Verification codes and booking texts were delivered by emailing carrier
email-to-SMS gateways (vtext.com, txt.att.net, …) from a Gmail account, via a
standalone service on a Windows PC behind a tunnel. Carriers have retired
those gateways and/or blocklisted the sender, so every send now bounces
("address not found"). This is deliberate carrier policy against automated
traffic on P2P gateways — not recoverable by configuration.

## Decision

Send SMS through the Textbelt HTTP API (https://textbelt.com), called
directly from the Next.js app. No phone number provisioning, no 10DLC or
toll-free registration; ~US$0.01/text at ~100–300 texts/month. The Windows
PC verification service and tunnel are retired.

## Changes

1. **`src/lib/sms-client.ts`** — reimplement internals against Textbelt,
   keeping the same three exports so no call site changes:
   - `requestPhoneVerification(phone, account)` — generate the 6-digit code
     locally, POST to `https://textbelt.com/text`, return the existing
     `{ method: "sms", code, expiresAt, … }` shape. If the send fails
     (quota exhausted, undeliverable number, network error), fall back to
     TOTP using the existing helpers in `sms-gateway.ts` — login is never
     fully blocked by an SMS outage.
   - `sendGatewaySms` / `notifyPhone` — one-way booking texts via the same
     Textbelt call; best-effort, unchanged contract.
   - Log loudly when Textbelt reports low/zero remaining quota so credits
     get topped up before delivery stops.
2. **`src/lib/sms-gateway.ts`** — strip the dead email-gateway machinery
   (nodemailer transport, numlookupapi carrier lookup, carrier→gateway map,
   `verifyUserPhoneNumber`, `sendPhoneNotification`). Keep `normalizePhone`,
   `generateCode`, and the TOTP section (`generateTotpSecret`,
   `buildOtpAuthUrl`, `verifyTotp`).
3. **Dependencies** — drop `nodemailer` and `@types/nodemailer`.
4. **Environment** — new `TEXTBELT_API_KEY` (local + Vercel); retire
   `SMS_SERVICE_URL` / `SMS_SERVICE_TOKEN`. Key lives only in env, never in
   the repo.

## Not changing

`verify/start`, `verify/complete`, booking/admin routes, the `otp_codes`
table, and the TOTP verification flow are untouched.

## Verification

- `https://textbelt.com/quota/<key>` confirms the key is live (free check).
- `npm run build` + lint pass.
- Real-world test: request a verification code to the admin phone from the
  deployed preview before relying on it in production.
