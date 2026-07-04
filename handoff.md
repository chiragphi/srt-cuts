# HANDOFF — Rebuild the SRT Cuts admin panel, Barbr-style

> **You are picking up a greenfield frontend rebuild of ONE surface: the admin panel.**
> The customer-facing app and the entire backend stay exactly as they are. Read this whole
> document before touching anything. Then follow the **Skills & process** section in order.

---

## 0. TL;DR of the mission

SRT Cuts is a one-chair barber booking app (Next.js 16 App Router, React 19, Tailwind v4,
framer-motion 12, Supabase, Textbelt/Twilio SMS). The owner uses an `/admin` panel to manage
bookings, availability, site content, money/taxes, and an AI ops agent.

**Rebuild that admin panel from the ground up, modeled on the Barbr app's UI/UX** — the
solo-barber SaaS (`com.barbrme`, barbr.me) whose product is: a clean booking calendar, deep
**performance analytics / insights**, **client management**, and smart automations. The new
admin must feel like a calm, premium, data-rich **operator's cockpit** — the opposite of a
cramped dashboard.

**Non-negotiables, up front:**

1. **Keep 100% of the backend.** Every API route, DB table, auth flow, SMS hook, and tax
   calculation keeps working unchanged. See [§4 Backend contract — DO NOT BREAK](#4-backend-contract--do-not-break).
2. **Throw away 100% of the old admin frontend.** Do not reuse a single old component, CSS
   class, or layout idea from the current site. Fresh design system, fresh components, fresh
   file tree. See [§3](#3-hard-design-constraints).
3. **Negative space is the headline feature.** The design must feel airy, editorial, and
   deliberately under-filled. If a screen looks busy or "full," it's wrong. One idea per
   region, big margins, lots of breathing room. This is the single most important aesthetic
   rule in this document.
4. **Dark mode, and visibly DIFFERENT from the customer app** so anyone can tell at a glance
   whether they're in the admin or the storefront. See [§5](#5-make-admin--customer-app-obviously-different).
5. **Lots of statistics**, all four analytics families below, all computed from existing data.
6. **One-tap "View as customer"** — impersonate a specific customer and see their logged-in
   view, with an obvious way back. See [§6](#6-view-as-customer-impersonation).
7. **Smooth, restrained, professional motion** that is distinct from the customer app's
   scroll-reveal style.

If any backend change is required, **write the SQL and hand it to the owner to run** (the live
Supabase project is under a different login than the MCP tooling — see [§4.4](#44-supabase-access-note)).

---

## 1. What Barbr is (design reference)

Barbr is a booking + growth app built for the individual barber. Copy its **UI/UX language**,
not any literal asset. What to emulate:

- **Calm, premium, spacious.** Near-black canvas, generous whitespace, a single confident
  accent, soft rounded surfaces, clean humanist sans. Nothing shouts.
- **Analytics-forward.** The barber opens it to answer "how am I doing?" — revenue, bookings,
  busiest times, who's coming back, who's slipping away. Numbers are the hero.
- **A real calendar** as a primary surface, not an afterthought.
- **Client relationships.** New vs returning, top clients, at-risk/inactive clients, and the
  automations that flow from that (rebooking reminders, win-back discounts, review requests).
- **Effortless.** Every screen does one job. Low cognitive load. Big touch targets.

Three analytics families Barbr centers on — build all of them (see [§7](#7-statistics--insights-build-all-of-these)).

---

## 2. The app you're working in

| Thing | Value |
|---|---|
| Framework | **Next.js 16.2.6, App Router** (React 19.2). Breaking changes vs older Next — per `AGENTS.md`, **read the relevant guide in `node_modules/next/dist/docs/` before writing App Router / route / metadata code.** |
| Styling | **Tailwind v4** (`@import "tailwindcss"` in `src/app/globals.css`, tokens as CSS vars). |
| Motion | **framer-motion 12** (already a dependency). |
| Icons | **lucide-react**. |
| Data | **Supabase** (`@supabase/supabase-js`), server-side via `supabaseAdmin` (service role). |
| Auth | Custom phone/OTP + password + trusted-device. Session cookie `srt_session`. `jose` + `AUTH_TOKEN_SECRET` available for signing. |
| SMS | Textbelt (`TEXTBELT_API_KEY`) via `src/lib/sms-client.ts`. |
| Admin entry | `src/app/admin/page.tsx` (the file you will replace). Admin is gated by `isAdmin(phone)` comparing to `ADMIN_PHONE`. |
| Current admin tabs | Bookings, Content, Schedule, Taxes, Growth, System — plus an `AdminAgent` AI panel and a `SystemPanel`. |

**Current admin visual (what you are replacing and must NOT echo):** a loud purple-black
"spec-sheet / brutalist" look — Anton condensed ALL-CAPS display, Space Mono labels, hard 4px
corners, dense stat grids, `.panel-fill`/`.wordmark`/`.display`/`.idx`/`.chip` utility classes.
**None of this carries over to the new admin.**

---

## 3. Hard design constraints

- **New design system, isolated from the old one.** Do **not** reuse the customer app's global
  utility classes or its Anton/mono brutalist treatment. Create an **admin-scoped token + style
  layer** (e.g. an `.admin` root class or a dedicated `admin.css` imported only by the admin
  tree) so the two worlds can't bleed into each other.
- **Purple stays — but only as a thin brand thread.** The owner chose to keep the indigo→purple
  accent (`~#7a63ff`) as the through-line so the admin still reads as "SRT." Use it sparingly:
  one accent, mostly for the active/primary state and a single data series. Everything else is
  near-black, graphite, and soft light-on-dark neutrals. The admin should feel like a *quiet,
  refined* cousin of the brand, not a recolor of the old page.
- **Negative space discipline (the #1 rule):**
  - Cap content width; let the canvas breathe around it.
  - One primary number or one idea per card. No stat-jammed 4-up grids crammed edge to edge.
  - Large section gaps, generous card padding, calm type scale.
  - Prefer *fewer, larger, better* elements over many small ones. If in doubt, remove.
  - Empty states are designed, not apologized for.
- **Dark, soft, rounded.** Near-black layered surfaces (elevation by lightness, not heavy
  shadow), soft radii (not the old hard 4px), hairline separators used rarely.
- **Typography:** clean humanist sans for everything (Instrument Sans is already loaded and is
  fine; you may add ONE tasteful display/number face for big metrics). **Retire Anton and the
  mono spec-sheet look for admin.** Tabular numerals for all stats.
- **Charts:** build **lightweight custom SVG/CSS charts** (sparklines, bars, line, donut,
  heatmap). Do **not** add a heavy charting dependency — custom keeps it on-brand, on-theme, and
  animatable, and honors the negative-space rule. Keep chart ink minimal (thin lines, few
  gridlines, no chartjunk).
- **Responsive:** desktop-first operator layout that collapses gracefully to a great phone
  experience (the owner will use this on mobile too). Use container queries / fluid type.
- **Accessibility:** AA contrast on the dark theme, focus-visible rings, `prefers-reduced-motion`
  respected on every animation, 44px min touch targets.

---

## 4. Backend contract — DO NOT BREAK

Everything here must keep working with **identical request/response shapes**. You are free to
*read* from these for the new UI; you must not change their contracts.

### 4.1 Supabase tables (project `lpdxkaqkrpydehahstsg`)
- `users(id, phone, name, password_hash, created_at)`
- `otp_codes(...)`, `trusted_devices(...)` — auth internals, leave alone.
- `sessions(token, user_id, expires_at, created_at)` — session cookie `srt_session` maps here.
- `bookings(id, user_id, user_name, user_phone, service, booking_date, booking_time, notes,
  status['pending'|'accepted'|'denied'|'cancelled'], service_price_cents, payment_method
  ['in_store'|'online'], payment_status['pay_in_store'|'unpaid'|'paid'|'refunded'], created_at)`
  — **this table is the source for ALL statistics.**
- `site_content(id='main', content JSONB, updated_at)` — the JSON shape is
  `SiteContent` in `src/lib/site-content.ts` (services, gallery, testimonials, availability,
  taxes, policies, etc.). Availability model: `weeklyAvailability` (`"0"`–`"6"` → time strings)
  and `dateAvailability` (`"YYYY-MM-DD"` → time strings, overrides weekly).

### 4.2 API routes to keep using (unchanged contracts)
- `GET /api/admin/bookings` → `{ bookings: Booking[] }` (admin-gated).
- `PATCH /api/admin/bookings/[id]` `{ status?: 'accepted'|'denied', paymentStatus?: 'unpaid'|'paid'|'refunded' }`
  → updates + fires customer SMS on status change.
- `DELETE /api/admin/bookings/[id]` → `{ ok: true }`.
- `GET|PATCH /api/admin/site-content` → `{ content: SiteContent }`.
- `POST /api/admin/ai` → the `AdminAgent` ops assistant (reads bookings + site_content, can
  mutate availability/bookings). Keep the panel; you may restyle its shell but preserve the
  endpoint and its behavior.
- `GET|POST /api/admin/maintenance` → the `SystemPanel` data. Keep.
- Customer/auth routes under `/api/auth/**`, `/api/bookings/**`, `/api/site-content`,
  `/api/cron/cleanup` — untouched.

### 4.3 Server helpers to reuse (don't fork)
- `src/lib/session.ts` — `getSession()`, `createSession()`, `isAdmin(phone)`, cookie helpers.
- `src/lib/supabase.ts` — `supabase`, `supabaseAdmin`.
- `src/lib/services.ts`, `src/lib/schedule.ts`, `src/lib/site-content.ts`, `src/lib/sms-*`.
- The **tax math** currently living inside the old `admin/page.tsx` (`calculateTaxSummary` and
  the 2026 single-filer bracket logic) must be **preserved** — extract it into
  `src/lib/tax.ts` verbatim (behavior-preserving) and reuse it, rather than rewriting it.

### 4.4 Supabase access note
The live Supabase project is under a **different login than the MCP/agent tooling**, so you may
not be able to apply migrations directly. For any DB change, **write the SQL into
`supabase-schema.sql` (append, idempotent `IF NOT EXISTS` style) and ask the owner to run it in
the Supabase SQL editor.** Do not assume MCP `apply_migration` will hit the live project.

---

## 5. Make admin ≠ customer app (obviously)

Someone glancing at the screen must instantly know which side they're on. Achieve this through
**structure and motion**, not just color:

- **Different navigation paradigm.** The customer app uses a top nav + mobile bottom tab bar.
  The admin should use a **persistent left sidebar / rail** on desktop (collapsible), and its
  own distinct mobile chrome. Different skeleton = different world.
- **Different type + density.** Calm humanist sans, tabular numerals, airy spacing — versus the
  customer app's loud condensed caps and mono.
- **A persistent "operator" signal.** A quiet, always-present admin identity in the rail (e.g.
  a small "SRT · Operator" mark and the current environment), plus the impersonation banner when
  active. It should feel like a back-of-house tool.
- **Different motion signature** (see §8).

---

## 6. "View as customer" (impersonation)

The owner picked **true impersonation**: from admin, choose a customer and see the app **as that
customer** (their logged-in view — their bookings, their storefront), with an obvious exit.

**Design (cookie-based, minimal backend, no schema change required):**

- Add `POST /api/admin/impersonate` `{ userId }` (admin-gated via `isAdmin`) that sets a
  **separate signed cookie** `srt_view_as` — a short-TTL `jose` JWT signed with
  `AUTH_TOKEN_SECRET`, payload `{ sub: userId, adminId, exp }`. Add `DELETE` (or
  `POST /api/admin/impersonate/stop`) to clear it.
- Update `getSession()` so that **only when the real `srt_session` belongs to an admin** and a
  valid `srt_view_as` cookie is present, it resolves to the impersonated user for page reads —
  and expose an `isImpersonating` flag + the real admin identity. Never let a non-admin
  session activate impersonation. Keep this logic tight and well-tested.
- Global **impersonation banner** (fixed, unmistakable): "Viewing as **{name}** · Exit". Exit
  clears the cookie and returns to `/admin`.
- Entry points: a customer picker in the Clients screen and in the top bar ("View as…"),
  populated from distinct `bookings.user_phone` / `users`.
- **Guardrails:** impersonation is **read-only-safe** — do not let an impersonated session take
  destructive/admin actions; block admin routes while impersonating; audit is optional (a small
  `impersonation_log` table is a *nice-to-have* — write the SQL if you add it, per §4.4).

Consider RLS implications: the app talks to Supabase through `supabaseAdmin` (service role)
server-side, so impersonation is enforced in *your* session layer, not Postgres RLS — keep that
boundary explicit and covered by tests.

---

## 7. Statistics & insights (build ALL of these)

All are computable from the `bookings` table (+ `service_price_cents`, `payment_*`,
`booking_date/time`, `status`, `created_at`) and `site_content` availability. The owner asked
for **all four families**. Keep each visualization calm and negative-space-forward — a few
strong charts beat a wall of tiles.

1. **Revenue & bookings over time**
   - Revenue trend (line/area) and bookings count over week / month / year ranges.
   - Average ticket, paid-vs-in-store split, accepted vs pending vs denied/cancelled.
   - Big hero number with a sparkline and a delta vs previous period.
2. **Client insights** (the Barbr heart)
   - New vs returning; top clients by spend and by visit count.
   - **At-risk / inactive clients** (no booking in N days) → the win-back / rebooking angle.
   - Lifetime value and visit cadence per client; a clean **Clients** list/detail view.
3. **Schedule & utilization**
   - Busiest days/times **heatmap**; chair utilization % (booked vs available slots from
     `weeklyAvailability`/`dateAvailability`); no-show/denied/cancel rates; upcoming load.
4. **Service & payment mix**
   - Most-booked services, revenue by service, Venmo vs in-store, discount impact, and the
     **tax set-aside** snapshot (reuse the preserved tax math from §4.3).

Add **motion that earns its place**: number count-ups on load, charts that draw in once,
period toggles that animate smoothly. Never gratuitous.

---

## 8. Information architecture (proposed)

A left rail with these destinations (name/refine as taste dictates, but cover the jobs):

- **Overview** — the cockpit: hero KPIs, revenue sparkline, today's schedule at a glance,
  pending-bookings callout, at-risk-clients nudge. Airy, scannable in 3 seconds.
- **Calendar** — Barbr-style booking calendar (month + day/agenda), driven by real bookings +
  availability. Primary surface.
- **Bookings** — manage queue: accept / deny / delete / mark paid (reuse the existing PATCH/DELETE
  contracts + SMS side effects). Restyled, spacious, filterable.
- **Clients** — client list + detail, insights from §7.2, and the "View as customer" entry.
- **Insights** — the deep analytics from §7 (all four families), with period toggles.
- **Money** — revenue + the preserved **Taxes** tooling.
- **Content** — the `site_content` editor (services, gallery, testimonials, policies, images).
- **Schedule** — weekly + date-specific availability editor (rebuilt, calmer, same data model).
- **Assistant** — the existing `AdminAgent` (keep endpoint/behavior; restyle shell).
- **System** — the existing `SystemPanel` (keep).
- Global top bar: environment mark, **View as customer**, sign out.

Rebuild all editors (Content/Schedule/etc.) with the **same data contracts** but the new design
language — do not paste the old JSX.

---

## 9. Motion spec (distinct, professional, restrained)

Follow the Emil-Kowalski-style bar: motion should feel intentional, fast, and interruptible.

- Signature: **calm, springy-but-quick** page/section entrances with subtle stagger; content
  settles, it doesn't bounce around. Clearly different from the customer app's scroll-reveal.
- Number **count-ups** and **chart draw-in** on first view only (not on every re-render).
- Tab/route transitions: smooth cross-fades / slides, short durations, standard easing.
- Hover/press micro-interactions on cards and controls; nothing that fights the eye.
- **Respect `prefers-reduced-motion`** everywhere; ensure 60fps (animate transform/opacity,
  avoid layout-thrash and animated blur). Run the motion review before calling it done (§10).

---

## 10. Skills & process — DO THIS IN ORDER

Use the owner's downloaded design skills. Announce each with "Using [skill] to [purpose]" and
turn any checklist into tasks. This handoff **is** the spec — start planning immediately.

**Plan**
1. Turn THIS document into a concrete, staged implementation plan and show it to the owner
   before building: design system/tokens → app shell + rail → data layer/stat computations →
   Overview → Calendar → Bookings → Clients → Insights → Money/Taxes → Content → Schedule →
   Assistant/System → impersonation → polish.

**Design & build (the polish stack)**
2. `master-uiux-enhancer` — the owner's umbrella skill; it stacks `frontend-design`,
   `ui-ux-pro-max`, `impeccable`, `emil-design-eng`, `fixing-motion-performance`,
   `responsive-design`, `ckm-design-system`, and `high-end-visual-design`. Run it as the
   primary design driver for every screen.
3. `minimalist-ui` — **explicitly**, to enforce the negative-space / editorial / not-overfull
   discipline that is this project's #1 aesthetic rule.
4. `ckm-design-system` — establish the admin-scoped tokens (color, spacing, type, radii,
   elevation) up front so every screen is consistent.
5. `responsive-design` — container queries, fluid type, mobile parity.

**Build the work**
6. Implement the plan phase by phase. Keep the app building and the public site working after
   every phase.

**Motion & polish passes (before "done")**
7. `emil-design-eng` + `fixing-motion-performance` — implement/tune motion.
8. `review-animations` — audit every animation against the craft bar; fix what it flags.
9. `baseline-ui` then `impeccable` — final deslop + craft passes (spacing, hierarchy,
   typography, alignment, states, empty/error/loading).

**Verify**
10. Prove it before declaring done: `npm run build` + `npm run lint` clean; every backend
    contract in §4 still works; customer app unaffected; impersonation can't be triggered by a
    non-admin; `prefers-reduced-motion` honored; mobile + desktop pass. Then do a self code-review
    pass over the diff.

---

## 11. Definition of done

- [ ] `/admin` is a completely new, dark, spacious, Barbr-inspired operator cockpit with a left
      rail; **zero** old admin components/classes reused.
- [ ] Negative-space discipline is visibly honored on every screen (calm, under-filled, one idea
      per region). Nothing looks cramped.
- [ ] It's unmistakably distinct from the customer app (structure + type + motion).
- [ ] All four statistics families shipped, computed from real data, with custom lightweight
      charts and tasteful count-up/draw-in motion.
- [ ] Calendar and Clients surfaces exist and work off live bookings.
- [ ] "View as customer" impersonation works end-to-end with a persistent banner + exit, and is
      admin-only and safe.
- [ ] Every backend contract in §4 is intact; SMS side effects, tax math, availability model,
      AI agent, and System panel all still function. Any DB change shipped as SQL for the owner.
- [ ] `npm run build` and `npm run lint` pass; motion respects reduced-motion; AA contrast; great
      on phone and desktop.
- [ ] Motion review + code review completed and addressed.

---

## 12. Guardrails / gotchas

- Read `node_modules/next/dist/docs/` for anything App-Router-specific before writing it
  (per `AGENTS.md` — this Next version has breaking changes vs training data).
- Don't touch the customer-facing pages (`/`, `/book`, `/bookings`, `/auth`) except where
  impersonation requires session-layer awareness (do that carefully, behind tests).
- Keep the old customer `globals.css` intact; add admin styles in an isolated layer/scope.
- SMS: status-change PATCH sends real texts — don't wire test buttons to it.
- The owner runs this on mobile too; the phone experience is not an afterthought.
