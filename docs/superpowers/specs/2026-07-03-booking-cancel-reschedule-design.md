# In-app cancel / reschedule + admin notifications — design

**Date:** 2026-07-03
**Status:** Approved

## Context

Booking creation already texts the admin (`SMS.bookingCreatedAdmin` →
`ADMIN_PHONE`) with full details; it only appeared broken because all SMS was
dead before the Textbelt switch. So the new work is customer self-service
cancel/reschedule plus admin texts for those events.

## Data model

- Add `cancelled` to the bookings `status` enum. Reschedule reuses `pending`
  (edits date/time in place, resets to pending for re-approval) — no new
  status needed for it.
- **One-time SQL** (run in Supabase dashboard — the live project is on an
  account whose DDL our tooling can't reach):
  ```sql
  ALTER TABLE bookings DROP CONSTRAINT bookings_status_check,
    ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('pending','accepted','denied','cancelled'));
  ```
  Mirror this in `supabase-schema.sql`.

## Customer API — `/api/bookings/[id]` (new, owner-scoped)

`PATCH` with `{ action: "cancel" }` or
`{ action: "reschedule", date, time }`. Guards:
- Booking must belong to the session user (else 404, no info leak).
- Reject if status is already `cancelled`/`denied` or the date is past.
- **24h cutoff** (both actions): reject if the appointment start is <24h
  away — "Too close to your appointment — text us for last-minute changes."
- Reschedule: validate the new slot is an open availability slot and not
  already `accepted` by someone else (same checks as booking creation),
  then set date/time and status → `pending`.
- After success, text **admin only** (8013918823).

## SMS templates (`sms-messages.ts`)

- `bookingCancelledAdmin(name, phone, service, date, time)`
- `bookingRescheduledAdmin(name, phone, service, oldDate, oldTime, newDate, newTime)`

## Bookings page UI

On each **upcoming, non-cancelled** booking:
- **Cancel** (confirm step) and **Reschedule** buttons.
- Inside the 24h window the buttons are replaced by a small "Text us for
  last-minute changes" note.
- Reschedule opens a modal using the existing `CalendarPicker` + time-slot
  list, fed by `/api/site-content` (mirrors `/book`'s availability logic).
- Cancelled bookings remain visible as greyed history with a new
  `cancelled` status style (label "Cancelled").

## Validation / edge cases

- All guards enforced server-side; client mirrors them for UX only.
- Cancelling frees the slot automatically (conflict check counts only
  `accepted`).
- Admin booking list gains a `cancelled` status style so it renders too.

## Verification

Local: cancel and reschedule against a seeded upcoming booking (invalid
Textbelt key so no real texts), confirm status transitions, 24h rejection,
and slot-conflict rejection. Build + lint pass.
