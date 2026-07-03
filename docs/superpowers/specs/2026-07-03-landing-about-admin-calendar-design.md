# Logo-first landing + About Me + admin month-grid calendar — design

**Date:** 2026-07-03
**Status:** Approved & built

## Part A — Landing page

- **Logo-first hero:** hero is now a centered stack — the SRT logo
  (`/srt-logo.png`) as the focal point, a smaller "One chair. Everything to
  prove." line, then the "Reserve the chair" CTA, discount chip, and stat
  grid. The old two-column layout and side photo are gone.
- **About Me section** (`id="about"`, before the final CTA): the photo (new
  `aboutImageUrl` content field, defaults to the logo, set via admin), the
  site "definition" (the paragraph relocated from the hero), and the featured
  customer quote (relocated from section 02, shown when a real testimonial
  exists).
- Section 02 keeps its stat grid and now always leads with the static
  "Every head walks out a reference" line instead of the moved quote.
- **About Me tab:** desktop nav link + a 5th mobile bottom-tab
  (`.tabbar` → 5 columns), both anchoring to `/#about`.

## Part B — Admin availability calendar

Replaced the vertical "next 18 days" list with a month grid mirroring the
client `CalendarPicker`: prev/next month, weekday headers, day cells
color-coded (override-open = accent, override-closed = danger, weekly-default
= dot, past = disabled). Tapping a day opens a drop-bar below the grid with
that day's hour chips + Select all / Close day / Reset to weekly — reusing the
existing availability logic. Same `onChange(dateAvailability)` contract, so
the weekly editor, blocked dates, and AI assistant are untouched.

## Verification

Build + lint pass. Browser-checked: logo-first hero, About Me section, and
admin Schedule calendar (day select + hours drop-bar) all render correctly.
`aboutImageUrl` shows the logo placeholder until a real URL is pasted in
admin → Content → "About Me photo direct link".
