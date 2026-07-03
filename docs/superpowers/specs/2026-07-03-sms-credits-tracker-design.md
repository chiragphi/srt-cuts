# Admin SMS credits tracker — design

**Date:** 2026-07-03
**Status:** Approved

## Problem

Textbelt credits are prepaid; when they run out, texts stop sending (login
degrades to TOTP, booking texts drop). The only warning today is a server-side
log line. The admin needs to see remaining credits in the dashboard.

## Design

- **`src/lib/sms-client.ts`** — add `getSmsQuota(): Promise<number | null>`:
  GET `https://textbelt.com/quota/<key>` (free — reads the counter, consumes
  no credits), returning `quotaRemaining` or `null` on any failure/missing
  key. Export the existing low-quota threshold (25) for reuse.
- **`/api/admin/maintenance` GET** — fetch quota alongside the existing
  stats/activity (parallel) and return
  `sms: { quotaRemaining: number | null, low: boolean }`. `low` is computed
  server-side so the client never imports server code.
- **`SystemPanel.tsx`** — fifth stat card "Texts left" in the Storage grid:
  the credit count, subtitle "~$0.01 per text"; when `low`, warning color +
  "low — top up at textbelt.com". Shows "—" if quota couldn't be fetched.
  Card spans both columns on mobile so the grid stays even.

## Not doing

Usage history, auto-refill, alerts beyond the existing log warning.

## Verification

Build passes; hit `/api/admin/maintenance` with an admin session locally and
confirm the `sms` field; view the System tab.
