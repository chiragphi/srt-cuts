# SRT Cuts — "The Standard" Appointment-Card Redesign

**Date:** 2026-06-21
**Status:** Approved (design), pending implementation plan
**Scope:** Full visual redesign of all customer-facing UI. Delete every existing UI
element and rebuild on a new design system. **All backend, data, API, and auth
logic is preserved unchanged** — only the UI layer is replaced.

---

## 1. Concept

Reframe SRT Cuts from the current "Dusk in the Pines" atmospheric forest theme
into **"The Standard"** — a refined letterpress **appointment-card / stationery**
system. The brand's real luxury is scarcity and craft (one chair, by appointment,
hidden studio), expressed through restraint, editorial typography, and tactile
print motifs rather than effects.

The current mystical/atmospheric layer (fog, embers, fireflies, ambient sound,
glows, organic photo masks) is **removed entirely**.

### Approved direction decisions
- **Metaphor:** Refined stationery (elegant, modern; not skeuomorphic kitsch). The
  card/ticket metaphor turns literal at one key moment — the **booking
  confirmation tear-off card**.
- **Palette:** Ecru paper + pine ink + brass (retains a thread to the "in the
  pines" story while flipping to a premium light-mode print aesthetic).
- **Typography:** High-contrast editorial **serif** for headlines/prices/quotes +
  **monospace** for every label, number, field, and status (the "official
  document" layer).
- **Scope:** Customer-facing pages only — `/` (home), `/book`, `/bookings`,
  `/auth`, plus shared components. `/admin` + `AdminAgent` stay functional and are
  **not** restyled in this pass.

---

## 2. Design system

### Color tokens
| Token | Value | Use |
|---|---|---|
| `--paper` | `#ECEADD` | page background (ecru cardstock) |
| `--paper-2` | slightly deeper ecru | card surfaces / insets |
| `--ink` | `#1C2A21` | primary text (pine ink), hairline rules |
| `--ink-soft` | muted ink | secondary text, captions |
| `--brass` | `#B08A3E` | accent: seals/stamps, primary CTA, active states |
| `--brass-deep` | darker brass | hover/pressed |
| status: pending / confirmed / declined | amber / green / red, ink-toned | booking status stamps |

Light-mode default. High contrast (ink-on-ecru). A faint paper grain texture is
acceptable but must stay subtle and cheap to render.

### Typography (2 families, one job each)
- **Display serif** — high-contrast editorial serif for headlines, prices,
  pull-quotes. Default: **Fraunces** at high optical size; alternative if a
  sharper/luxe feel is wanted: **Bodoni Moda**. (Final pick confirmed at build.)
- **Mono** — labels, numbers, fields, nav, captions, status. Default: **IBM Plex
  Mono**; alternative for vintage character: **Space Mono**.
- A defined type scale (display → h1/h2/h3 → body → label/caption) lives in
  `globals.css` as tokens.

### Motifs & components
- **Hairline rules** (letterpress) for structure.
- **Dotted leaders** between a label and a value (`FADE ········ $30`).
- **Brass rubber-stamp seal** for emphasis ("MOST LOVED", "REQUESTED").
- **Perforation divider** between sections — replaces `TreelineDivider`.
- **Card primitive** — ruled, paper-surface container used throughout.

### Motion (precise, not atmospheric)
- Rules draw in; type sets into place; the stamp "presses" on confirm.
- Fast, GPU-cheap transforms/opacity only — **no heavy blur filter animations**.
- Full `prefers-reduced-motion` support (keep `MotionConfig reducedMotion="user"`).
- framer-motion is retained (already a dependency).

### Skills as the quality bar
Implementation must be guided by the installed skills:
- **design-taste-frontend / high-end-visual-design / impeccable** — anti-generic
  direction, typographic discipline, "expensive" detailing, audit-first.
- **baseline-ui** — final spacing/hierarchy/typography polish pass.
- **fixing-motion-performance** — verify all animations are compositor-friendly.
- **responsive-design** — fluid type + mobile-first layout.

---

## 3. Preserved functional contracts (DO NOT CHANGE)

The new UI must consume exactly these. No `lib/` or `api/` file is modified.

### Data: `GET /api/site-content` → `{ content: SiteContent }`
`SiteContent` (see `src/lib/site-content.ts`) drives all copy and config:
hero/barber/gallery/testimonials, address/mapUrl/parkingNote, instagram/tiktok/
venmo URLs, loyaltyOffer/referralOffer/deposit/cancellation/reminder policies,
`serviceConfigs` (name/amount/duration/desc/detail), and availability:
`weeklyAvailability` (`"0"`–`"6"`), `dateAvailability` (`YYYY-MM-DD` overrides),
`scheduleBlocks`. Use `DEFAULT_SITE_CONTENT`, `mergeSiteContent`,
`isPlaceholderGalleryItem`, `isPlaceholderTestimonial`.

### Services: `src/lib/services.ts`
`SERVICES`, `formatPrice(amountCents)`, `getServiceConfigs(overrides)`. Prices are
integer cents.

### Schedule: `src/lib/schedule.ts`
`TIME_SLOTS`, `DAYS_OF_WEEK`.

### Auth: `useAuth()` (`src/context/auth.tsx`)
`{ user: {id,name,phone} | null, loading, refresh(), clearUser() }`.
Endpoints: `GET /api/auth/me`, `POST /api/auth/send-otp` `{phone}` →
`{isNewUser, bypass?, redirect?}`, `POST /api/auth/verify-otp`
`{phone, code, name?}`, `POST /api/auth/logout`. 30-day session cookie.

### Bookings
- `GET /api/bookings` → `{ bookings: Booking[] }` where `Booking` =
  `{id, service, booking_date, booking_time, status: pending|accepted|denied,
  service_price_cents, notes, created_at}`.
- `POST /api/bookings` `{service, date, time, notes, paymentMethod:
  "in_store"|"online"}` → on success `{paymentUrl?}` (redirect if present) or
  created booking.

### Booking-flow logic to preserve (currently in `book/page.tsx`)
Min date = tomorrow; availability resolution (date override → weekly → empty);
"next available" finder (scans 60 days, respects `scheduleBlocks`); Google
Calendar URL builder; 12h→24h conversion; copy-details; payment method selection;
referral code field. Auth gate: redirect to `/auth?redirect=/book` when logged out.

### Loyalty
`LoyaltyCard` component — preserve its existing data source/props (verify at build;
rebuild visual as a punch card). Offer text comes from `content.loyaltyOffer`.

### Other shared
`CalendarPicker` props: `{value, onChange, blockedDates, minDate,
weeklyAvailability, dateAvailability}` — restyle, keep the contract. `Toast`
(`useToast().toast(msg, type)`) — restyle, keep API.

---

## 4. Page designs

### Shared chrome
- **Navigation** — letterhead: serif wordmark (left), mono links + location +
  "No. ——" (right), brass **Reserve** button. Minimal mobile treatment + bottom
  bar where used. Logout via `clearUser()` + `/api/auth/logout` when logged in.
- **Footer** — bottom-of-receipt: ruled, mono fine print, nav links, copyright.
- **Perforation divider** between sections.

### Home (`/`) — same sections, new skin, all data-driven
1. **Masthead hero** — giant serif headline (from copy), mono subline (location ·
   one chair · by appointment), brass CTAs ("Reserve a chair" / "See the menu"),
   "No. 0042 · booking open" + today's date detail, hero image in a ruled frame.
2. **Loyalty card** (logged-in only).
3. **Services** — printed menu card: dotted leaders, duration/detail, "Most
   Loved" stamp on Full Service. From `content.serviceConfigs`.
4. **Gallery** — editorial grid, ruled photo frames, mono captions, lightbox
   retained. Filters placeholder items.
5. **Barber** — ruled portrait, serif name, bio, stamped specialty tags.
6. **Testimonials** — letterpress pull-quotes, mono attribution.
7. **FAQ** — ledger accordion rows, mono question numbers.
8. **Info grid** — Location / Rewards / Booking Policy / Connect cards.
9. **Contact CTA** + footer.

### `/book` — showpiece: "Reserve the chair"
Fill-out-an-appointment-card flow. Same 3 steps (service → time → confirm), same
state machine, same API + availability logic. Mono field labels, dotted-leader
running summary, stamped 1·2·3 progress. Restyled CalendarPicker + mono time
tokens + "Next available" quick action. Step 3: summary + notes + referral +
payment (in-store / Venmo) + policy text. Mobile bottom action bar retained.
**Confirmation = a literal perforated tear-off card**: `No. ####`, brass
**REQUESTED** stamp, mono details (service/price/date/time), and existing actions
(Add to Calendar, Copy details, Book another, My bookings).

### `/bookings`
Each booking = a **stamped ledger entry**: serif service, mono date·time, status
stamp (PENDING/CONFIRMED/DECLINED), price with dotted leader. Mono filter tabs
(all/upcoming/past). Blank-card empty state. Loyalty card on top. Rebook/Book-again
links retained. Loading skeleton restyled.

### `/auth`
Sign-the-guest-ledger feel. Phone step (formatted input) → 6-digit OTP as mono
stamped boxes; new-user name capture. All send/verify/resend/bypass/redirect logic
unchanged. Back-to-home link.

---

## 5. Files

### Rewrite
- `src/app/globals.css` — full rewrite: new tokens + utilities (`.card`, `.rule`,
  `.leader`, `.stamp`, `.mono-label`, `.btn-brass`, `.btn-ink`, `.otp-input`,
  etc.). Remove all forest classes (`.forest-content`, `.hero-glow`,
  `.photo-blend`, `.spotlight`, `.app-card`, treeline, etc. — replaced by new
  equivalents).
- `src/app/layout.tsx` — swap fonts (serif + mono), remove `SiteAtmosphere`, set
  ecru/ink theme color + body background. Keep `AuthProvider`, `ToastProvider`.

### Rebuild (UI only)
- `src/app/page.tsx`, `src/app/book/page.tsx`, `src/app/bookings/page.tsx`,
  `src/app/auth/page.tsx`
- `src/components/Navigation.tsx`, `LoyaltyCard.tsx`, `Toast.tsx`,
  `CalendarPicker.tsx`

### Add
- `src/components/Perforation.tsx` (divider) and any small card primitives.

### Delete
- `src/components/ForestAtmosphere.tsx`, `SiteAtmosphere.tsx`, `AmbientSound.tsx`,
  `TreelineDivider.tsx`.

### Untouched
- All of `src/lib/**`, `src/app/api/**`, `src/context/auth.tsx`,
  `src/app/admin/**`, `src/components/AdminAgent.tsx`.

---

## 6. Acceptance criteria
- No forest/atmosphere code or classes remain in customer-facing pages.
- All four pages render on the new ecru/ink/brass + serif/mono system, cohesively.
- All preserved contracts still work: site-content loads, OTP login, booking
  create + availability + payment redirect, bookings list + statuses, loyalty.
- `npm run build` and `npm run lint` pass.
- Responsive (mobile-first) and `prefers-reduced-motion` respected; animations are
  compositor-friendly (verified against `fixing-motion-performance`).
- Admin still functions unchanged.
