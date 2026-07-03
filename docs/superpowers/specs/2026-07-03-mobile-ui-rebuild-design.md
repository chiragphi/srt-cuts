# SRT Cuts — Mobile UI/UX Rebuild

**Date:** 2026-07-03
**Status:** Approved design, ready for planning
**Scope:** All customer-facing screens — home, book, bookings, auth — plus shared navigation. Excludes the admin panel.

## Problem

The mobile experience is visually overloaded ("too full"). Concrete causes:

1. **Overloaded hero.** Before any scroll the hero stacks: eyebrow, headline, lede, two CTAs, a sale chip, a 3-column stat grid, and a captioned photo with a tick-rail — too many focal points competing.
2. **Wall of hairline boxes.** `gap-px` bordered grids (the proof stat cells, the six info cells) render every section as edge-to-edge hard rectangles. This is the dominant "full" signal.
3. **Redundancy.** Home §04 "The Edge" and the "About Me" section are near-duplicates — barber photo + bio + Book/social buttons, twice.
4. **Low interior air.** Cards, rows, and form steps (notably book step 3) pack elements with little breathing room.

## Goal

Rebuild the mobile UI/UX from scratch on a proper component system, using negative space to make the layout feel calm, composed, and premium — **while preserving the existing SHARP/SPEC identity**: Anton condensed display, monospace spec labels, purple-black canvas (`--paper`), blue→purple accent (`--accent-grad`), elevation-not-shadow depth.

Non-goals: new brand/fonts/colors; admin panel; forced scroll-snap (explicitly declined — hijacks scroll on a long funnel, hurts reading and accessibility; normal scroll + existing subtle reveal is kept).

## Design principles

1. **Cluster then gap.** Related elements sit tight; large negative space separates clusters and sections. Mobile section rhythm ~72–88px; interior card padding ~24px.
2. **Fewer surfaces, more air.** Replace bordered `gap-px` grids with open, divider-separated layouts and a single calm card treatment. Let type and space carry structure, not borders.
3. **One focal point per section.** Especially the hero.
4. **Less is negative space.** Cut redundancy (merge the two barber blocks; dissolve the standalone stat grid) so the page is shorter and breathes.

## Foundation: spacing scale

Add spacing tokens to `globals.css` (e.g. `--space-1` … `--space-8`) and standardize:
- Section vertical rhythm (mobile-first, clamped up for desktop).
- Card interior padding.
- Cluster gaps vs. element gaps.

Existing tokens (colors, type, radius, ease) are reused unchanged.

## Component system (the rebuild core)

A small set of reusable primitives so every screen is consistent and calm. Each has one clear purpose and a well-defined prop interface:

- **`Section`** — consistent vertical padding, optional `band` (elevated), optional `id`. Wraps `.shell`.
- **`SectionHeader`** — `idx` label + display heading + optional sub, consistent internal spacing.
- **`Card`** — the single calm surface: generous padding, one soft hairline border. Variants: `quiet` (transparent + hairline) and `raised` (`--paper-2`). Replaces the `gap-px` bordered box grids.
- **`StatList`** — open, divider-separated rows (no full-cell borders).
- **`ServiceRow`** — clean menu row (name, desc, price, duration, sale/most-requested chip).
- **`Field`** / **`Pill`** / **`Chip`** / **`SummaryRow`** — normalized form controls, filter pills, tags, and key/value rows shared across book & bookings.

These live in `src/components/` and are consumed by all four screens. CSS utility classes in `globals.css` are updated/added to match (calmer card, spacing helpers); redundant one-off styles removed.

## Screen designs

### Home (`src/app/page.tsx`) — restructured funnel

Order (each a `Section`):
1. **Hero (focused)** — eyebrow (`· Herriman, UT ·`), headline, one-line lede, `[Reserve the chair]` + `see the work →`, then the photo with a single `● Booking open` pill. Stat cells and tick-rail removed from the hero. Sale chip, if present, becomes one quiet line under the CTAs.
2. **Ribbon** — thin marquee accent, kept.
3. **Work** — image grid (the proof); lightbox retained.
4. **Menu** — services as `ServiceRow`s in one calm container.
5. **About** — the merged barber section (photo + bio + specialties + one pull-quote + Book/social). Replaces both §04 "The Edge" and the old "About Me".
6. **Voices** — 1–2 testimonials with room, not 3 cramped cards.
7. **Info** — location · payment · hours/changes as open `StatList`/rows, not six bordered cells. Map link retained.
8. **Claim the chair** — final CTA.
9. **Footer** — simplified.

Dissolved: standalone §02 "Proof" 4-stat grid (best stat folded into hero microcopy / ribbon); duplicate barber block.

### Book (`src/app/book/page.tsx`)

Same 3-step wizard (Cut → Time → Confirm) and all logic (auth gate, availability, next-open, payment method, confirmation payoff). Rebuilt on the component system:
- More air between the progress bar, step content, and actions.
- Step 3 grouped into clear clusters (summary / notes+referral / payment / policy) with generous gaps; payment options full-width stacked on mobile.
- Confirmation screen uses `Card`/`SummaryRow`.

### Bookings (`src/app/bookings/page.tsx`)

Same functionality (filters, cancel with inline confirm, reschedule modal, empty/loading states). Rebuilt with calmer `Card`s, normalized filter `Pill`s, more spacing, and shared `SummaryRow`. Reschedule modal keeps bottom-sheet-on-mobile behavior.

### Auth (`src/app/auth/page.tsx`)

Already the calmest screen. Light touch: apply spacing scale, normalized `Field`/OTP, consistent step spacing. All four steps and logic unchanged.

### Navigation (`src/components/Navigation.tsx`)

Keep top bar (wordmark + Reserve on mobile) and bottom tab bar (good mobile pattern). Lighten spacing and active states; ensure the 5 tabs breathe. Sign-out sheet kept.

## Constraints

- **Next.js (this repo's version):** consult `node_modules/next/dist/docs/` before writing code, per AGENTS.md. Files are `"use client"` today; preserve where hooks/state require it.
- **Content-driven:** all copy/prices/gallery/testimonials/availability come from Supabase via `/api/site-content`; the rebuild changes presentation only, not data contracts.
- **Accessibility:** keep focus-visible, reduced-motion handling, tap targets ≥44px, and non-JS reveal fallback.
- **No behavior/route/API changes.** Pure UI/layout rebuild.

## Success criteria

- Hero presents one clear focal point; no stat grid or tick-rail in it.
- No `gap-px` hard-bordered box grids remain on customer screens.
- The two barber sections are merged into one.
- Consistent spacing scale and shared components across home, book, bookings, auth.
- Identity (fonts, colors, motifs) visually unchanged.
- All existing flows (booking, cancel/reschedule, auth, payment) still work.
