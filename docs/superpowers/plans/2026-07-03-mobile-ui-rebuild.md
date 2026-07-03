# Mobile UI/UX Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the mobile UI/UX of all customer-facing screens (home, book, bookings, auth) on a shared component system that uses negative space, while preserving the SHARP/SPEC identity.

**Architecture:** Add a spacing scale and calmer surface classes to `globals.css`, extract a small set of reusable presentational components under `src/components/ui/`, then rebuild each screen's markup to consume them — fewer bordered boxes, one focal point per section, merged redundant sections, generous air. No routing, API, or data-flow changes.

**Tech Stack:** Next.js 16.2.6 (App Router, client components), React 19, Tailwind CSS v4 (`@import "tailwindcss"` + CSS custom properties), framer-motion, lucide-react, clsx.

## Global Constraints

- Next.js version is **16.2.6**. Per `AGENTS.md`, consult `node_modules/next/dist/docs/` before using any unfamiliar Next API. This rebuild introduces no new Next APIs.
- Preserve the SHARP/SPEC identity verbatim: `--font-anton` display, `--font-mono-space` labels, `--paper` `#0f0d16` canvas, `--accent-grad` blue→purple. Do not change fonts, colors, or brand copy.
- **No behavior, route, or API changes.** All copy/prices/gallery/testimonials/availability come from Supabase via `/api/site-content`; touch presentation only, not data contracts.
- Keep accessibility: `:focus-visible` outlines, `prefers-reduced-motion` handling, tap targets ≥44px, and the no-JS `.reveal` fallback (`html.js` gate in `layout.tsx`).
- No forced scroll-snap (explicitly declined). Keep normal scroll + the existing `Reveal` component.
- **No test runner exists** in this repo. Per-task automated gate is `npm run lint` then `npm run build` (both must pass). Visual gate is a Playwright screenshot at a 390×844 mobile viewport of the affected screen(s), reviewed against the task's intent.
- Existing `SummaryRow` is duplicated inline in `src/app/book/page.tsx`; the reschedule/booking screens repeat filter-pill and card markup. DRY these into shared components as they are touched.

---

## File structure

**Create:**
- `src/components/ui/Section.tsx` — `Section`, `SectionHeader`
- `src/components/ui/Card.tsx` — `Card`
- `src/components/ui/StatList.tsx` — `StatList`, `InfoRow`
- `src/components/ui/Pill.tsx` — `Pill`
- `src/components/ui/SummaryRow.tsx` — `SummaryRow`
- `src/components/ui/ServiceRow.tsx` — `ServiceRow`
- `src/components/ui/index.ts` — barrel re-export

**Modify:**
- `src/app/globals.css` — spacing tokens, `.card`, `.statlist`/`.inforow`, spacing helpers, section rhythm
- `src/app/page.tsx` — full home restructure
- `src/components/Navigation.tsx` — lighten top bar + tabbar
- `src/app/book/page.tsx` — rebuild on components
- `src/app/bookings/page.tsx` — rebuild on components
- `src/app/auth/page.tsx` — spacing pass

---

### Task 1: Foundation — spacing scale and calmer surfaces in CSS

**Files:**
- Modify: `src/app/globals.css` (`:root` block ~16-52; add new sections after `.panel-fill` ~344)

**Interfaces:**
- Produces CSS classes consumed by every later task: `.card`, `.card--raised`, `.statlist`, `.inforow`, `.cluster`, `.stack-lg`; spacing custom properties `--space-1`…`--space-8`.

- [ ] **Step 1: Add spacing tokens to `:root`**

In `src/app/globals.css`, inside `:root { … }` (after the `--radius`/`--ease` lines near line 50), add:

```css
  /* Spacing scale — 4px base. Cluster tightly, gap generously. */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4.5rem;
```

- [ ] **Step 2: Give the mobile section rhythm a little more floor**

Replace the `.section` and `.section-tight` rules (currently ~120-126):

```css
.section {
  padding-block: clamp(64px, 9vw, 160px);
}

.section-tight {
  padding-block: clamp(48px, 6vw, 96px);
}
```

- [ ] **Step 3: Add the calm surface + open-list classes**

After the `.panel-fill` / `.band-ink .panel-fill` block (~344), add:

```css
/* ── Calm card: the single elevated surface (replaces gap-px box grids) ── */
.card {
  background: transparent;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: var(--space-5);
}

.card--raised {
  background: var(--paper-2);
}

.band-ink .card {
  border-color: var(--line-ink);
}

.band-ink .card--raised {
  background: var(--ink-2);
}

/* Open, divider-separated list — no per-cell borders */
.statlist > * + * {
  border-top: 1px solid var(--line);
}

.band-ink .statlist > * + * {
  border-top-color: var(--line-ink);
}

.inforow {
  display: block;
  padding-block: var(--space-5);
}

.inforow:first-child {
  padding-top: 0;
}

.inforow:last-child {
  padding-bottom: 0;
}

/* Layout helpers */
.cluster > * + * {
  margin-top: var(--space-3);
}

.stack-lg > * + * {
  margin-top: var(--space-6);
}
```

- [ ] **Step 4: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: both PASS (CSS-only change; no unused-class errors — Tailwind v4 does not tree-shake these hand-authored classes).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "Add spacing scale and calm surface classes"
```

---

### Task 2: Shared presentational components

**Files:**
- Create: `src/components/ui/Section.tsx`, `Card.tsx`, `StatList.tsx`, `Pill.tsx`, `SummaryRow.tsx`, `ServiceRow.tsx`, `index.ts`

**Interfaces:**
- Consumes: CSS classes from Task 1.
- Produces (exact signatures used by later tasks):
  - `Section({ id?, band?, tight?, className?, children })`
  - `SectionHeader({ idx, title, sub? })`
  - `Card({ raised?, className?, children })`
  - `StatList({ children })`, `InfoRow({ label, title, body, href?, action?, external?, icon? })`
  - `Pill({ active?, ...button })`
  - `SummaryRow({ label, value, last? })`
  - `ServiceRow({ service, index?, href?, onClick? })` where `service` is a `SiteContent["serviceConfigs"][number]`.

- [ ] **Step 1: Create `Section.tsx`**

```tsx
// src/components/ui/Section.tsx
import { type ReactNode } from "react";
import clsx from "clsx";

export function Section({
  id,
  band,
  tight,
  className,
  children,
}: {
  id?: string;
  band?: boolean;
  tight?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={clsx(tight ? "section-tight" : "section", band && "band-ink", className)}>
      <div className="shell">{children}</div>
    </section>
  );
}

export function SectionHeader({
  idx,
  title,
  sub,
}: {
  idx: string;
  title: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="mb-10">
      <p className="idx mb-4">{idx}</p>
      <h2 className="display display--xl">{title}</h2>
      {sub && <p className="mt-4 max-w-md text-[var(--mute)]">{sub}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create `Card.tsx`**

```tsx
// src/components/ui/Card.tsx
import { type ReactNode } from "react";
import clsx from "clsx";

export function Card({
  raised,
  className,
  children,
}: {
  raised?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <div className={clsx("card", raised && "card--raised", className)}>{children}</div>;
}
```

- [ ] **Step 3: Create `StatList.tsx`**

```tsx
// src/components/ui/StatList.tsx
import { type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

export function StatList({ children }: { children: ReactNode }) {
  return <div className="statlist">{children}</div>;
}

export function InfoRow({
  label,
  title,
  body,
  href,
  action,
  external,
  icon,
}: {
  label: string;
  title: string;
  body: string;
  href?: string;
  action?: string;
  external?: boolean;
  icon?: boolean;
}) {
  const content = (
    <>
      <p className="eyebrow eyebrow--plain mb-3">{label}</p>
      <h3 className="flex items-start gap-2 font-display text-xl uppercase leading-tight">
        {icon && <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--accent-deep)]" />}
        {title}
      </h3>
      <p className="mt-2 text-sm text-[var(--mute)]">{body}</p>
      {action && href && (
        <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--accent-deep)]">
          {action} <ArrowUpRight size={14} strokeWidth={2.5} />
        </span>
      )}
    </>
  );

  if (!href) return <div className="inforow">{content}</div>;
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inforow">
      {content}
    </a>
  ) : (
    <Link href={href} className="inforow">
      {content}
    </Link>
  );
}
```

- [ ] **Step 4: Create `Pill.tsx`**

```tsx
// src/components/ui/Pill.tsx
import { type ButtonHTMLAttributes, type ReactNode } from "react";

export function Pill({
  active,
  children,
  ...props
}: { active?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-full border px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.1em] transition-colors"
      style={{
        borderColor: active ? "transparent" : "var(--line-strong)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#ffffff" : "var(--mute)",
      }}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 5: Create `SummaryRow.tsx`**

```tsx
// src/components/ui/SummaryRow.tsx
import { type ReactNode } from "react";

export function SummaryRow({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-2.5"
      style={last ? undefined : { borderBottom: "1px solid var(--line)" }}
    >
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--mute)]">{label}</span>
      <span className="spec text-right text-sm">{value}</span>
    </div>
  );
}
```

- [ ] **Step 6: Create `ServiceRow.tsx`**

```tsx
// src/components/ui/ServiceRow.tsx
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatPrice, effectivePrice, hasDiscount, clampDiscount } from "@/lib/services";
import type { SiteContent } from "@/lib/site-content";

type Service = SiteContent["serviceConfigs"][number];

export function ServiceRow({
  service,
  index,
  href = "/book",
  popular,
}: {
  service: Service;
  index?: number;
  href?: string;
  popular?: boolean;
}) {
  const sale = hasDiscount(service);
  const pct = clampDiscount(service.discountPercent);
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 border-b border-[var(--line-ink)] px-1 py-6 transition-colors last:border-b-0 hover:bg-[var(--ink-2)]"
    >
      {typeof index === "number" && (
        <span className="idx hidden w-10 shrink-0 sm:block">{String(index + 1).padStart(2, "0")}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-2xl uppercase leading-none sm:text-3xl">{service.name}</h3>
          {sale && <span className="chip chip--accent">{pct}% off</span>}
          {popular && !sale && <span className="chip chip--accent">Most requested</span>}
        </div>
        <p className="mt-2 text-sm text-[var(--mute-ink)]">{service.desc}</p>
      </div>
      <div className="shrink-0 text-right">
        {sale ? (
          <p className="flex items-baseline justify-end gap-2">
            <span className="font-mono text-sm text-[var(--mute-ink)] line-through">{formatPrice(service.amount)}</span>
            <span className="spec text-xl text-[var(--ink)] sm:text-2xl">{formatPrice(effectivePrice(service))}</span>
          </p>
        ) : (
          <p className="spec text-xl text-[var(--ink)] sm:text-2xl">{formatPrice(service.amount)}</p>
        )}
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--mute-ink)]">{service.duration}</p>
      </div>
      <ArrowUpRight
        size={20}
        strokeWidth={2.5}
        className="hidden shrink-0 text-[var(--mute-ink)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)] sm:block"
      />
    </Link>
  );
}
```

- [ ] **Step 7: Create barrel `index.ts`**

```ts
// src/components/ui/index.ts
export { Section, SectionHeader } from "./Section";
export { Card } from "./Card";
export { StatList, InfoRow } from "./StatList";
export { Pill } from "./Pill";
export { SummaryRow } from "./SummaryRow";
export { ServiceRow } from "./ServiceRow";
```

- [ ] **Step 8: Verify types compile**

Run: `npm run lint && npm run build`
Expected: both PASS. (Components are unused so far; exports are not flagged by `eslint-config-next`. If build complains a component is unused, ignore — it is consumed in Tasks 3-8.)

- [ ] **Step 9: Commit**

```bash
git add src/components/ui
git commit -m "Add shared UI primitives for mobile rebuild"
```

---

### Task 3: Home — focused hero + upper sections

**Files:**
- Modify: `src/app/page.tsx` (imports; hero section ~71-153; keep ribbon ~156-168; Work section ~203-249)

**Interfaces:**
- Consumes: `Section`, `SectionHeader` from Task 2; CSS from Task 1.

- [ ] **Step 1: Add the barrel import**

At the top of `src/app/page.tsx`, add:

```tsx
import { Section, SectionHeader } from "@/components/ui";
```

- [ ] **Step 2: Replace the hero section (focused)**

Replace the entire `{/* ── 01 · HERO ── */}` `<section>` (lines ~71-153) with:

```tsx
        {/* ── 01 · HERO — focused ──────────────────────────────────── */}
        <section className="relative overflow-hidden pt-28 sm:pt-32">
          <div className="shell flex flex-col items-center pb-14 text-center">
            <Reveal>
              <p className="mb-7 flex items-center justify-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--mute)] sm:text-[12px]">
                <span className="h-0.5 w-5 shrink-0 bg-[var(--accent)]" />
                Herriman, UT — By appointment
                <span className="h-0.5 w-5 shrink-0 bg-[var(--accent)]" />
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="display display--xl">
                Your sharpest
                <br />
                cut <span className="hot">yet.</span>
              </h1>
            </Reveal>

            <Reveal delay={140}>
              <p className="lede mt-6 max-w-md">
                Book in under a minute — confirmed by text, no deposit, pay at the chair.
              </p>
            </Reveal>

            <Reveal delay={210}>
              <div className="mt-9 flex w-full flex-col items-center gap-4 sm:w-auto">
                <Link href="/book" className="btn btn--accent w-full sm:w-auto">
                  Reserve the chair
                  <ArrowUpRight size={17} strokeWidth={2.5} />
                </Link>
                <a
                  href="#work"
                  className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--mute)] transition-colors hover:text-[var(--ink)]"
                >
                  See the work <ArrowUpRight size={13} strokeWidth={2.5} />
                </a>
              </div>
            </Reveal>

            {maxDiscount > 0 && (
              <Reveal delay={240}>
                <a href="#services" className="mt-6 inline-flex items-center gap-2.5">
                  <span className="chip chip--accent">{maxDiscount}% OFF</span>
                  <span className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--ink)]">
                    {saleNames} on sale
                  </span>
                </a>
              </Reveal>
            )}

            <Reveal delay={300} className="mx-auto mt-12 w-full max-w-md">
              <figure className="relative w-full">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[6px] border border-[var(--line)]">
                  <Image src={heroImage} alt={content.barberName} fill priority sizes="(min-width:768px) 448px, 90vw" className="object-cover" />
                </div>
                <figcaption className="absolute bottom-3 left-3 flex items-center gap-2 rounded-[4px] border border-[var(--line-ink)] bg-[var(--ink-2)]/85 px-3.5 py-2.5 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink)]">Booking open</span>
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>
```

Note: the 3-column `<dl>` stat grid and the `tickrail` are intentionally removed from the hero.

- [ ] **Step 3: Delete the standalone Proof section**

Delete the entire `{/* ── 02 · PROOF ── */}` `<section className="section-tight">…</section>` block (lines ~170-200). Its trust signals now live in the ribbon and hero lede.

- [ ] **Step 4: Convert the Work section to use `Section` + `SectionHeader`**

Replace the opening of the Work section. Change:

```tsx
          <section id="work" className="section band-ink">
            <div className="shell">
              <Reveal>
                <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
                  <div>
                    <p className="idx mb-4">[ 03 — THE WORK ]</p>
                    <h2 className="display display--xl">
                      Receipts,
                      <br />
                      not <span className="hot">promises</span>
                    </h2>
                  </div>
                  <p className="max-w-xs text-sm text-[var(--mute-ink)]">
                    Edge work up close. The blends, the lines, the details that hold up in daylight.
                  </p>
                </div>
              </Reveal>
```

to:

```tsx
          <Section id="work" band>
            <Reveal>
              <SectionHeader
                idx="[ 02 — THE WORK ]"
                title={<>Receipts,<br />not <span className="hot">promises</span></>}
                sub="Edge work up close — the blends, the lines, the details that hold up in daylight."
              />
            </Reveal>
```

Then change the matching closing `</div></section>` of the Work section to `</Section>` (remove the now-unneeded `<div className="shell">` wrapper — `Section` provides it). Keep the gallery grid markup exactly as-is between them.

- [ ] **Step 5: Renumber remaining section indices**

Since old §02 was deleted, update the `idx` labels down the page so they read sequentially: Work `[ 02 — THE WORK ]`, Menu `[ 03 — … ]`, Voices `[ 04 — IN THEIR WORDS ]`, Info `[ 05 — THE FINE PRINT… ]`, final CTA `[ 06 — YOUR MOVE ]`. (About uses `[ ABOUT ]`, no number.) Apply the remaining renumbers in Task 4 where those sections are edited.

- [ ] **Step 6: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: both PASS.

- [ ] **Step 7: Visual check (mobile)**

Start dev server (`npm run dev`), then with the Playwright MCP: navigate to `http://localhost:3000`, resize to 390×844, screenshot. Confirm: hero has one focal point (headline → one CTA → text link → photo), no stat grid, no tickrail; Work header reads `[ 02 — THE WORK ]`.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx
git commit -m "Rebuild home hero (focused) and upper sections"
```

---

### Task 4: Home — merged About, trimmed Voices, open Info, CTA, footer

**Files:**
- Modify: `src/app/page.tsx` (Edge §04 ~252-294, Services §05 ~297-363, Voices §06 ~366-386, Logistics §07 ~389-445, About ~448-485, final CTA ~488-510)

**Interfaces:**
- Consumes: `Section`, `SectionHeader`, `Card`, `StatList`, `InfoRow`, `ServiceRow` from Task 2. Remove the now-unused local `InfoCell` helper (page.tsx ~552-592).

- [ ] **Step 1: Extend the import**

```tsx
import { Section, SectionHeader, Card, StatList, InfoRow, ServiceRow } from "@/components/ui";
```

- [ ] **Step 2: Convert Services (Menu) to `Section` + `ServiceRow`**

Replace the Services `<section id="services">` (~297-363). Keep the `maxDiscount` conditional header copy. New body:

```tsx
        {/* ── 03 · MENU ────────────────────────────────────────────── */}
        <Section id="services" band>
          <Reveal>
            <SectionHeader
              idx={maxDiscount > 0 ? `[ 03 — ON SALE · ${maxDiscount}% OFF ]` : "[ 03 — THE MENU ]"}
              title={maxDiscount > 0 ? <>Pick it. <span className="hot">Save</span> on it.</> : <>Pick it. Book it.</>}
              sub={
                maxDiscount > 0
                  ? `Limited-time pricing on ${saleNames}. Locked in the moment you book.`
                  : "Flat prices, no surprises. Every service is one tap from a booking."
              }
            />
          </Reveal>
          <div className="border-t border-[var(--line-ink)]">
            {services.map((s, i) => (
              <Reveal key={s.name}>
                <ServiceRow service={s} index={i} popular={s.name === MOST_REQUESTED} />
              </Reveal>
            ))}
          </div>
        </Section>
```

- [ ] **Step 3: Delete the Edge §04 section and merge it into About**

Delete the entire `{/* ── 04 · THE EDGE ── */}` `<section id="barber">` block (~252-294). Its content (barber photo, bio, specialties chips, Book/social buttons) is folded into the single About section next.

- [ ] **Step 4: Replace the About section with the merged barber block**

Replace the `{/* ── ABOUT ME ── */}` `<section id="about">` (~448-485) with:

```tsx
        {/* ── 04 · ABOUT — the one barber section ──────────────────── */}
        <Section id="about">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-[6px] border border-[var(--line)]">
                <Image src={aboutImage} alt={content.barberName} fill sizes="(min-width:1024px) 440px, 90vw" className="object-cover" />
              </div>
            </Reveal>
            <Reveal delay={80}>
              <p className="idx mb-4">[ ABOUT ]</p>
              <h2 className="display display--xl">
                Young hands.
                <br />
                <span className="hot">Relentless</span> standard.
              </h2>
              <p className="lede mt-7 max-w-xl">{content.barberBio}</p>
              {content.specialties.length > 0 && (
                <div className="mt-7 flex flex-wrap gap-2.5">
                  {content.specialties.map((s) => (
                    <span key={s} className="chip">{s}</span>
                  ))}
                </div>
              )}
              {aboutQuote && (
                <blockquote className="mt-8 border-l-2 border-[var(--accent)] pl-5">
                  <p className="display display--md normal-case" style={{ lineHeight: 1.1 }}>
                    &ldquo;{aboutQuote.quote}&rdquo;
                  </p>
                  <p className="eyebrow mt-4">{aboutQuote.name}</p>
                </blockquote>
              )}
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/book" className="btn btn--accent">
                  Reserve the chair
                  <ArrowUpRight size={16} strokeWidth={2.5} />
                </Link>
                {social && (
                  <a href={social} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
                    {content.instagramUrl ? "Instagram" : "TikTok"}
                  </a>
                )}
              </div>
            </Reveal>
          </div>
        </Section>
```

Move this About section so page order is: Menu → **About** → Voices → Info → CTA. (About now sits where §04 Edge used to, right after Menu.)

- [ ] **Step 5: Trim Voices to a calmer 2-up and use `Section`**

Replace the Voices `<section>` (~366-386) with (renders at most 2 testimonials on the funnel; the rest still exist in data):

```tsx
        {/* ── 05 · VOICES ──────────────────────────────────────────── */}
        {testimonials.length > 0 && (
          <Section band>
            <Reveal>
              <SectionHeader idx="[ 05 — IN THEIR WORDS ]" title="Regulars, not one-offs" />
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2">
              {testimonials.slice(0, 2).map((t, i) => (
                <Reveal key={`${t.name}-${i}`} delay={i * 60}>
                  <figure className="card card--raised flex h-full flex-col">
                    <span className="font-display text-4xl leading-none text-[var(--accent)]">&ldquo;</span>
                    <blockquote className="mt-3 flex-1 text-[17px] leading-snug">{t.quote}</blockquote>
                    <figcaption className="eyebrow mt-6">{t.name}</figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </Section>
        )}
```

- [ ] **Step 6: Rebuild Info (Logistics) as open rows in one Card**

Replace the Logistics `<section className="section-tight">` (~389-445) with:

```tsx
        {/* ── 06 · THE FINE PRINT ──────────────────────────────────── */}
        <Section tight>
          <Reveal>
            <SectionHeader idx="[ 06 — THE FINE PRINT ]" title="No surprises before you sit" />
          </Reveal>
          <Card>
            <StatList>
              <InfoRow
                label="Location"
                title={content.address}
                body={content.parkingNote}
                href={content.mapUrl}
                action="Open map"
                external
                icon
              />
              <InfoRow label="Payment" title="Pay at the chair or Venmo" body={content.depositNote} />
              <InfoRow label="Changes" title="Reschedule by text" body={content.cancellationPolicy} />
              <InfoRow label="Confirmation" title="You'll get a text" body={content.reminderPolicy} />
              <InfoRow label="Rewards" title={content.loyaltyOffer} body={content.referralOffer} />
              {social && (
                <InfoRow
                  label="Latest"
                  title={`Follow on ${content.instagramUrl ? "Instagram" : "TikTok"}`}
                  body="Fresh work and open slots as they drop."
                  href={social}
                  action={content.instagramUrl ? "Instagram" : "TikTok"}
                  external
                />
              )}
            </StatList>
          </Card>
        </Section>
```

- [ ] **Step 7: Renumber the final CTA to `[ 06 → 07 ]` and confirm order**

In the `{/* ── 08 · FINAL CTA ── */}` section, change its `idx` from `[ 08 — YOUR MOVE ]` to `[ 07 — YOUR MOVE ]`. Leave its markup otherwise intact (it is already spacious).

- [ ] **Step 8: Remove the now-unused `InfoCell` helper**

Delete the `function InfoCell({ … }) { … }` definition at the bottom of `page.tsx` (~552-592). Confirm no remaining references (`grep -n "InfoCell" src/app/page.tsx` returns nothing).

- [ ] **Step 9: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: both PASS, with no "unused variable" error for `InfoCell`, `MapPin`, or `X` (if `X`/`MapPin` become unused after edits, remove them from the lucide import line).

- [ ] **Step 10: Visual check (mobile)**

Playwright at 390×844 on `/`: confirm one barber/About section (not two), Menu uses clean rows, Voices shows 2 cards, Info is one card of divider rows (no 6-box grid), sections read 02→07.

- [ ] **Step 11: Commit**

```bash
git add src/app/page.tsx
git commit -m "Merge barber sections, open up Info/Voices/Menu on home"
```

---

### Task 5: Navigation — lighter top bar and tab bar

**Files:**
- Modify: `src/app/globals.css` (`.tabbar`/`.tab` ~570-600), `src/components/Navigation.tsx`

**Interfaces:**
- Consumes: spacing tokens from Task 1.

- [ ] **Step 1: Give the tab bar more air**

In `globals.css`, replace the `.tab` rule (~583-596) with:

```css
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 13px 0 11px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--mute);
  transition: color 0.14s var(--ease);
}

.tab[data-active="true"] {
  color: var(--accent-deep);
}

.tab[data-active="true"] svg {
  filter: drop-shadow(0 0 10px rgba(122, 99, 255, 0.5));
}
```

- [ ] **Step 2: Confirm the top bar stays minimal on mobile**

In `Navigation.tsx`, verify the mobile top bar shows only the wordmark and the `Reserve` button (the Work/Services/About links are already `hidden … sm:inline`, the account menu is `hidden sm:block`). No change needed unless lint flags an unused import. This step is verification only.

- [ ] **Step 3: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: both PASS.

- [ ] **Step 4: Visual check (mobile)**

Playwright at 390×844: confirm the bottom tab bar's 5 items breathe and the active tab glows; the top bar is just wordmark + Reserve.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/Navigation.tsx
git commit -m "Lighten mobile tab bar spacing and active state"
```

---

### Task 6: Book — rebuild the wizard on the component system

**Files:**
- Modify: `src/app/book/page.tsx` (imports; confirmation ~180-256; step 3 ~429-525; remove local `SummaryRow` ~533-543)

**Interfaces:**
- Consumes: `Card`, `SummaryRow` from Task 2.

- [ ] **Step 1: Import shared components, drop the local `SummaryRow`**

Add to imports:

```tsx
import { Card, SummaryRow } from "@/components/ui";
```

Delete the local `function SummaryRow({ label, value, last }) { … }` at the bottom of the file (~533-543). The shared one has the same signature, so all existing `<SummaryRow …/>` usages keep working.

- [ ] **Step 2: Swap `panel-fill` summary/confirmation surfaces to `Card`**

In the confirmation screen and step 3, replace the summary containers `<div className="panel-fill … p-5">` with `<Card raised>` … `</Card>` (drop the `p-5`; `Card` provides padding). This applies to:
- the confirmation summary block (~206-212),
- the confirmation referral block (~214-222) → `<Card raised className="flex items-start gap-3">`,
- step 3 summary (~438-447),
- step 3 policy block (~502-506) → `<Card raised className="space-y-2">`.

- [ ] **Step 3: Give step 3 clusters more breathing room**

On the step-3 `<motion.div>` wrapper, change `className="space-y-5"` to `className="space-y-7"`. Change the payment options grid from `grid gap-3 sm:grid-cols-2` to `grid gap-3` (full-width stacked cards on mobile; they already stack, this drops the desktop 2-up so each option has room — keep `sm:grid-cols-2` only if you prefer, but default to single column for calm). Keep all option logic unchanged.

- [ ] **Step 4: Add air to the step header**

Change the header wrapper `<div className="mb-7">` (~264) to `<div className="mb-9">`, and the progress block `<div className="mb-8 …">` (~273) to `<div className="mb-10 …">`.

- [ ] **Step 5: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: both PASS (no duplicate `SummaryRow`, no unused imports).

- [ ] **Step 6: Visual + flow check (mobile)**

Playwright at 390×844 on `/book` (sign in first if the auth gate redirects — or verify the redirect works). Step through Cut → Time → Confirm; confirm the summary uses the calm `Card`, step 3 has clear spacing between clusters, and submitting still reaches the confirmation payoff.

- [ ] **Step 7: Commit**

```bash
git add src/app/book/page.tsx
git commit -m "Rebuild booking wizard on shared cards, add breathing room"
```

---

### Task 7: Bookings — calmer cards and shared pills

**Files:**
- Modify: `src/app/bookings/page.tsx` (imports; filter pills ~195-213; booking cards ~258-365; empty state ~226-240)

**Interfaces:**
- Consumes: `Pill` from Task 2. (Booking cards keep their `motion.div` + `panel-fill` for the entrance animation; only the filter row and spacing change.)

- [ ] **Step 1: Import `Pill`**

```tsx
import { Pill } from "@/components/ui";
```

- [ ] **Step 2: Replace the inline filter buttons with `Pill`**

Replace the filter `.map` (~196-212) body with:

```tsx
            {(["all", "upcoming", "past"] as const).map((f) => (
              <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </Pill>
            ))}
```

- [ ] **Step 3: Give the list and header more air**

Change the booking list wrapper `className="space-y-3"` (~242) to `className="space-y-4"`. Change the header `<div className="mb-7">` (~185) to `<div className="mb-9">`, and the filter row `<div className="mb-6 flex gap-2">` (~195) to `<div className="mb-8 flex gap-2">`.

- [ ] **Step 4: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: both PASS.

- [ ] **Step 5: Visual + flow check (mobile)**

Playwright at 390×844 on `/bookings` (authenticated): confirm filter pills render via the shared component, cards breathe, and the reschedule modal + inline cancel still open and function.

- [ ] **Step 6: Commit**

```bash
git add src/app/bookings/page.tsx
git commit -m "Use shared pills and looser spacing on bookings"
```

---

### Task 8: Auth — spacing pass

**Files:**
- Modify: `src/app/auth/page.tsx` (step wrappers and field spacing throughout ~244-467)

**Interfaces:**
- Consumes: CSS from Task 1. (Auth is already the calmest screen; light touch only — no structural change.)

- [ ] **Step 1: Standardize vertical rhythm in each step**

For each of the four step `<motion.div>` blocks, ensure the intro copy uses consistent spacing: the `<p className="mb-8 mt-3 …">` lead paragraphs stay, and the form container stays `className="space-y-4"`. Change the `space-y-4` form containers to `space-y-5` for a touch more air (phone, password, set-password steps). Leave the OTP layout untouched.

- [ ] **Step 2: Confirm the container max-width reads centered and airy**

Verify the outer `<div className="w-full max-w-sm">` (~242) is unchanged and the page uses `band-ink` background (it does). Verification only.

- [ ] **Step 3: Verify build + lint**

Run: `npm run lint && npm run build`
Expected: both PASS.

- [ ] **Step 4: Visual + flow check (mobile)**

Playwright at 390×844 on `/auth`: confirm the phone step is centered and airy; enter a phone number to confirm the flow still advances (or the mocked/dev path behaves as before).

- [ ] **Step 5: Commit**

```bash
git add src/app/auth/page.tsx
git commit -m "Loosen auth step spacing"
```

---

### Task 9: Full mobile QA + polish pass

**Files:**
- Modify: any of the above as issues surface (spacing nudges only; no new structure).

**Interfaces:** none new.

- [ ] **Step 1: Screenshot every screen at mobile width**

With the dev server running, Playwright at 390×844, capture full-page screenshots of `/`, `/book`, `/bookings`, `/auth`. Also capture 768×1024 (tablet) and 1280×800 (desktop) for `/` to confirm nothing regressed at larger breakpoints.

- [ ] **Step 2: Check against success criteria**

Verify: hero has one focal point (no stat grid/tickrail); no `gap-px` hard-bordered box grids remain on customer screens (`grep -rn "gap-px" src/app src/components` should only match intentional non-customer code, ideally nothing on these screens); one barber/About section; consistent spacing; identity (fonts/colors) unchanged; all flows work.

- [ ] **Step 3: Fix any spacing/regression nits inline**

Apply small spacing corrections only. Re-run `npm run lint && npm run build` after each.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "Mobile UI/UX rebuild: final polish pass"
```

---

## Self-review

**Spec coverage:**
- Spacing scale → Task 1. ✓
- Component system (Section, SectionHeader, Card, StatList/InfoRow, ServiceRow, Pill, SummaryRow) → Task 2. ✓
- Home restructure (focused hero, dissolved Proof grid, merged barber, trimmed Voices, open Info) → Tasks 3-4. ✓
- Navigation lighten → Task 5. ✓
- Book / Bookings / Auth rebuilds → Tasks 6/7/8. ✓
- Accessibility, reduced-motion, no scroll-snap, no API changes → Global Constraints, preserved throughout. ✓
- Success criteria verification → Task 9. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/vague steps; every code step shows real code; every transform names exact line ranges and target markup.

**Type consistency:** `SummaryRow({label,value,last})` shared signature matches the deleted local one in book (Task 6). `ServiceRow({service,index,href,popular})` matches its home usage (Task 4). `InfoRow` props match Info usage (Task 4). `Pill({active,...button})` matches bookings usage (Task 7). Section/SectionHeader/Card props match all usages.

**Note on line numbers:** ranges reference the current files and will drift as edits land within a task — locate by the quoted surrounding markup, not the line number alone.
