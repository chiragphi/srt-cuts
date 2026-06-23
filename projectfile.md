# SRT Cuts — Total UI Reinvention Brief ("projectfile")

**Type:** Implementation prompt for the AI agent doing the redesign.
**Status:** Authoritative. This document overrides every earlier design doc in the repo
(including `docs/superpowers/specs/2026-06-21-srt-appointment-card-redesign-design.md`
"The Standard", and the previous "Dusk in the Pines" theme). Do not reference, reuse,
or be inspired by either of them.

---

## 0. Read this first

You are rebuilding the **entire customer-facing UI of SRT Cuts from scratch.**

This is not a re-skin. This is not a color swap. **Forget the current site exists.**
Every page, every component, every layout, every type choice, every interaction —
gone. You are designing a brand-new site for this business as if no website had ever
been built for it. If, at any point, you find yourself looking at the current UI for
"what to keep," stop — you've misunderstood the task. The only thing you keep is the
**backend** and the **data contracts** it exposes (Section 4). Everything a visitor
can see or touch is new.

> The failure mode to avoid: opening the existing pages and "improving" them. That
> produces the same site with different paint. Instead, start from the business and
> the goal, design the right site, and build that.

---

## 1. The business (design from this, not from the old site)

SRT Cuts is a **one-chair, by-appointment barber studio in Herriman, Utah.** The
barber is **young** — and that is the whole hook. The product is precision cuts
(fades, lineups, full-service) booked online, paid in-store or via Venmo, confirmed
by SMS. There is one chair, a hidden/private studio, and a personal standard of work.

### The positioning: age is the edge

The barber's age is **not** something to hide or soften — it is the central
competitive advantage, and the site must make a visitor *feel* that within seconds:

- **Hungry, not green.** Young means sharper hustle, later hours, faster replies,
  more reps per week, and someone who treats every single head like it's the one that
  builds the reputation. Frame age as *drive and standard*, not inexperience.
- **Native to the craft's current era.** Up to date on the cuts people actually want
  right now — the styles that are current, not dated.
- **Something to prove.** "Works harder for the booking" is a real promise here. Lean
  into it: responsiveness, care, and a chip-on-the-shoulder level of detail.

Translate this into copy, proof, and structure — not a gimmick badge. The visitor
should leave thinking *"this person is going to out-work everyone for my cut,"* not
*"this person is young."* Make the age a reason to book, stated with confidence.

---

## 2. The goal: this site exists to convert

The current site shows nice work. The new site must **sell faster** and turn visitors
into inquiries and bookings. Design every decision against that.

### First screen must answer "why book *you*" — instantly

Within the first viewport, a stranger must understand:
1. **What** this is (precision barber, by appointment, Herriman).
2. **Why this barber** (the age-as-edge promise, stated as a sharp benefit).
3. **Proof** that it's real (a strong, immediate trust signal — see Section 3).
4. **The offer + the next step** (an obvious, single, high-contrast path to book/inquire).

Lead with a **sharp headline** and a **clear offer**, not a pretty photo with no claim.
The hero is a pitch, not a gallery.

### Restructure the page around conversion (do NOT just re-order the old sections)

Design the home page as a funnel. A strong default spine — adapt as your design
direction demands, but every section must earn its place by moving someone toward
booking:

1. **Hero / pitch** — headline answers "why you," subline states the offer, one
   primary CTA (Reserve / Book), one secondary (See the work / Menu). Immediate proof
   element visible (rating, count, or a single killer line of social proof).
2. **Proof bar** — concentrated trust the moment after the hook: review snippets,
   booking count, repeat-client stat, or platform ratings. Real signal, not filler.
3. **The work (portfolio)** — curated proof that matches the clients you *want*:
   clean fades, lineups, transformations. Editorial, not a dump. Each shot should
   sell the edge work.
4. **Why this barber (the age edge)** — the positioning made explicit and confident:
   the standard, the hustle, the current styles, the personal attention of one chair.
5. **Services / offer** — tight, scannable, priced, with a clear "most requested"
   anchor. Reduce choice friction; every service is one tap from booking.
6. **Testimonials / trust** — named voices, specific outcomes. Reinforce right before
   the ask.
7. **Logistics that remove objections** — location/parking-after-confirm, payment
   options, policy, hours/responsiveness. Quietly kill the reasons not to book.
8. **Final CTA** — restate the offer and the single next step. Footer.

Keep the path to **book** reachable from anywhere (persistent CTA / nav). Every
section should either build belief or lower friction. If a block does neither, cut it.

---

## 3. Make it genuinely premium

"Premium" is earned through restraint, craft, and confidence — not effects.

- **One strong design direction, invented fresh.** Choose a distinctive aesthetic and
  commit to it fully. It must not resemble the current site or any prior spec in this
  repo. No generic template, no default Tailwind-looking landing page, no stock SaaS
  hero. Have a point of view.
- **Typographic discipline.** A deliberate type system (display + text + functional)
  with a real scale. Big, confident headlines. Tight, intentional spacing.
- **Real hierarchy and whitespace.** Generous, calm layout. Let the work and the claim
  breathe. Premium feels *uncrowded and sure of itself.*
- **Considered motion.** Purposeful, fast, compositor-friendly micro-interactions that
  make it feel alive and engineered — never decorative lag. Respect
  `prefers-reduced-motion`.
- **Cohesion.** Every page reads as one brand. Nav, buttons, cards, forms, empty
  states, toasts — all from one system.
- **Mobile-first.** Most barber bookings happen on a phone. The phone layout is the
  primary design, not an afterthought.

### Color / palette

You are **not** forbidden from any colors — including any the old site used. But do
**not** simply keep the current palette or "just change the colors" on the existing
UI. Pick a palette as a deliberate, from-scratch choice that serves the new direction
and the premium + age-as-edge positioning. If a color happens to overlap with the old
site because it's genuinely the right choice, that's fine — the requirement is a fresh
*design*, not a banned color list.

---

## 4. The backend is fixed — only change where the UI leads into it

**Do not touch Supabase, the database, the schema, or any backend logic.** Do not
modify anything in `src/lib/**`, `src/app/api/**`, `src/context/auth.tsx`, or the
admin surface (`src/app/admin/**`, `src/components/AdminAgent.tsx`). The backend
already works. Your job is the UI that sits on top of it — you change *where the UI
points and how it presents the data*, never the data layer itself.

The new UI must consume **exactly these existing contracts** (verify each against the
source at build time before using it):

- **Site content:** `GET /api/site-content` → `{ content: SiteContent }`. `SiteContent`
  (`src/lib/site-content.ts`) drives all copy/config: hero image, gallery,
  testimonials, barber name/bio/photo, specialties, address/mapUrl/parkingNote,
  instagram/tiktok/venmo, loyaltyOffer/referralOffer, deposit/cancellation/reminder
  policies, `serviceConfigs`, and availability (`weeklyAvailability`,
  `dateAvailability`, `scheduleBlocks`). Use `DEFAULT_SITE_CONTENT`,
  `mergeSiteContent`, `isPlaceholderGalleryItem`, `isPlaceholderTestimonial` (filter
  placeholders out of the live UI).
- **Services:** `src/lib/services.ts` — `SERVICES`, `formatPrice(amountCents)`,
  `getServiceConfigs(overrides)`. Prices are integer cents.
- **Schedule:** `src/lib/schedule.ts` — `TIME_SLOTS`, `DAYS_OF_WEEK`.
- **Auth:** `useAuth()` → `{ user: {id,name,phone} | null, loading, refresh(),
  clearUser() }`. Endpoints: `GET /api/auth/me`; `POST /api/auth/send-otp` `{phone}` →
  `{isNewUser, bypass?, redirect?}`; `POST /api/auth/verify-otp` `{phone, code,
  name?}`; `POST /api/auth/logout`. 30-day session cookie.
- **Bookings:** `GET /api/bookings` → `{ bookings: Booking[] }`, `Booking =
  {id, service, booking_date, booking_time, status: pending|accepted|denied,
  service_price_cents, notes, created_at}`. `POST /api/bookings` `{service, date,
  time, notes, paymentMethod: "in_store"|"online"}` → `{paymentUrl?}` (redirect if
  present) or the created booking.
- **Booking-flow logic to preserve** (currently in `book/page.tsx`): min date =
  tomorrow; availability resolution (date override → weekly → empty); "next available"
  finder (scans ~60 days, respects `scheduleBlocks`); 12h→24h conversion; Google
  Calendar URL builder; copy-details; payment-method selection; referral code field;
  auth gate (redirect to `/auth?redirect=/book` when logged out). Rebuild the UI for
  this flow; keep the logic and the API calls identical.
- **Loyalty:** `LoyaltyCard` — preserve its data source/props; redesign the visual.
- **Shared:** `CalendarPicker` props `{value, onChange, blockedDates, minDate,
  weeklyAvailability, dateAvailability}` and `Toast` `useToast().toast(msg, type)` —
  rebuild the visuals, keep the contracts.

### Surface to rebuild (UI only)

Pages: `/` (home), `/book`, `/bookings`, `/auth`. Shared: `Navigation`, footer,
`LoyaltyCard`, `Toast`, `CalendarPicker`, and any new primitives you introduce.
Rewrite `src/app/globals.css` and `src/app/layout.tsx` (fonts, theme, remove dead
atmosphere/forest/letterpress code and any components only the old UI used). **Do not**
restyle `/admin` or `AdminAgent`.

The booking flow (`/book`) is the showpiece — it's where conversion actually closes.
Make it feel effortless, confident, and premium. The confirmation moment should feel
like a real "you're in" payoff.

---

## 5. Use the skills — this is required, not optional

Drive the whole effort through the installed skills. Invoke the relevant ones and
follow them; do not freestyle past them:

- **Process first:** `superpowers:brainstorming` (lock the fresh design direction
  before building), then `superpowers:writing-plans` / `superpowers:executing-plans`
  for the build, and `superpowers:verification-before-completion` before claiming done.
- **Design direction & taste:** `design-taste-frontend`, `frontend-design`,
  `high-end-visual-design`, `impeccable`, `ui-ux-pro-max`, `master-uiux-enhancer`,
  `gpt-taste`, `emil-design-eng`. Use these to set an intentional, non-generic,
  expensive-feeling direction and to audit against slop.
- **Redesign discipline:** `redesign-existing-projects` (audit + replace generic
  patterns without breaking function), `baseline-ui` (final spacing/hierarchy/type
  polish pass).
- **Motion & responsiveness:** `fixing-motion-performance` (verify every animation is
  compositor-friendly), `responsive-design` (fluid type, container queries,
  mobile-first), `emil-design-eng` for interaction polish.
- **Brand & visuals (for the age-as-edge identity and any generated imagery/marks):**
  `brandkit`, `ckm-brand`, `ckm-design`, `imagegen-frontend-web`.
- **Stack help when needed:** `vercel:nextjs` / `vercel:shadcn` for App Router and
  component patterns; `supabase:supabase` only to *read/confirm* contracts — never to
  change the backend.

Pick the right tool for each step; you don't need all of them at once, but the design
must clearly reflect the taste/anti-generic skills above. **This version of Next.js
has breaking changes — read the relevant guide in `node_modules/next/dist/docs/`
before writing code, per `AGENTS.md`.**

---

## 6. Acceptance criteria

- The site is unrecognizable from the current one: new structure, new layout system,
  new type, new components, new identity. Nothing visually carried over.
- The first screen answers "why book this barber" with a sharp headline, immediate
  proof, a clear offer, and one obvious booking path.
- The home page is structured as a conversion funnel (Section 2), not a re-ordering of
  the old sections.
- The barber's age reads as a confident advantage throughout copy and structure.
- It feels genuinely premium: typographic discipline, real hierarchy, cohesion,
  purposeful motion, mobile-first.
- **Zero backend changes:** `src/lib/**`, `src/app/api/**`, `src/context/auth.tsx`,
  and `/admin` are byte-for-byte untouched and still fully functional.
- All preserved contracts work end-to-end: site-content loads, OTP login, booking
  create + availability + payment redirect, bookings list + statuses, loyalty.
- All dead code from prior themes (forest/atmosphere/letterpress and components only
  the old UI used) is removed.
- `npm run build` and `npm run lint` pass; `prefers-reduced-motion` respected.

---

## 7. Definition of done

Rebuild every customer-facing page from scratch on a single new premium design system
that sells the work and the barber, positions youth as the edge, and routes everyone
toward booking — without touching the backend. Verify the build, confirm the flows
work, then commit and push to git.
