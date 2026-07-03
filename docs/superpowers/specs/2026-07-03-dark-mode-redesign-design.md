# Dark mode redesign — design

**Date:** 2026-07-03
**Status:** Approved (dark-only, whole site including admin)

## Direction

The "Sharp/Spec" identity goes dark-only: purple-black canvas (`#0f0d16`),
light lavender-warm text, and the same blue→purple accent gradient — lifted
(`#5b7cff → #a34ef5`) so it holds contrast on dark. Depth reads through
elevation (lighter surfaces) instead of shadows. No layout or content changes.

## Token model (globals.css)

Semantic roles invert: `--paper` is now the dark canvas and `--ink` the light
foreground. Two dark-surface tokens carry what `--ink` used to do as a
background: `--band` (full-bleed elevated sections, replaces the old ink
bands) and `--ink-2` (elevated cards/fields, unchanged role). `--accent-deep`
becomes a light AA-safe lavender for small text on dark.

New shared status/tint tokens replace hardcoded colors that were tuned for
cream: `--ok(-bg/-line)`, `--warn(-bg)`, `--danger(-bg/-line)`,
`--accent-bg(-strong)`.

## Sweep

- All `text-[var(--paper)]` (light-on-ink-band text) → `text-[var(--ink)]`.
  Background uses of `--paper` (hairline-grid cells, sheets, sticky headers)
  keep the token and go dark automatically.
- Hardcoded amber/green/red status colors and purple washes across admin,
  booking, bookings, auth, AdminAgent, SystemPanel, Toast → status tokens.
- `band-ink` foreground rules (ghost buttons, chips, fields) repointed from
  `--paper` to `--ink`.
- Scrims stay dark (`bg-black/80`); the hero figcaption glass uses `--ink-2`.
- Toast becomes a dark elevated card (`--ink-2`), matching the menu.
- Shimmer highlight dimmed for dark; accent button glow retuned to the new
  purple; PWA `themeColor` → `#0f0d16`.

## Verification

Build + lint pass. Visual verification: owner reviews the deployed site
(explicitly requested to self-verify).
