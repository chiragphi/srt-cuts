"use client";

/**
 * SRT Cuts — Home · "SHARP / SPEC"
 * A young barber, one chair, everything to prove. The page is a conversion
 * funnel: pitch → proof → work → the edge → menu → voices → logistics → ask.
 * All copy/prices/gallery/policy come from Supabase via /api/site-content.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import Reveal from "@/components/Reveal";
import { formatPrice, effectivePrice, hasDiscount, clampDiscount } from "@/lib/services";
import {
  DEFAULT_SITE_CONTENT,
  isPlaceholderGalleryItem,
  isPlaceholderTestimonial,
  type SiteContent,
} from "@/lib/site-content";

const MOST_REQUESTED = "Full Service";

export default function HomePage() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/site-content")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        if (d?.content) setContent(d.content);
      });
  }, []);

  const gallery = content.gallery.filter((g) => !isPlaceholderGalleryItem(g));
  const testimonials = content.testimonials.filter((t) => !isPlaceholderTestimonial(t));
  const services = content.serviceConfigs;
  const social = content.instagramUrl || content.tiktokUrl;
  const aboutImage = content.aboutImageUrl || "/srt-logo.png";
  const aboutQuote = testimonials[0];

  const onSale = services.filter(hasDiscount);
  const maxDiscount = onSale.reduce((m, s) => Math.max(m, clampDiscount(s.discountPercent)), 0);
  const saleNames = onSale.map((s) => s.name).join(", ");

  return (
    <>
      <Navigation />

      {lightbox && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute right-5 top-5 text-[var(--ink)]" aria-label="Close" onClick={() => setLightbox(null)}>
            <X size={26} />
          </button>
          <div className="relative aspect-[4/5] w-full max-w-xl overflow-hidden rounded-[6px]" onClick={(e) => e.stopPropagation()}>
            <Image src={lightbox} alt="Work" fill sizes="(max-width:768px) 100vw, 576px" className="object-cover" unoptimized />
          </div>
        </div>
      )}

      <main className="has-tabbar">
        {/* ── 01 · HERO — logo-first ────────────────────────────────── */}
        <section className="relative overflow-hidden pt-28 sm:pt-32">
          <div className="shell flex flex-col items-center pb-16 text-center">
            <Reveal>
              <p className="mb-8 flex items-center justify-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--mute)] sm:text-[12px]">
                <span className="h-0.5 w-5 shrink-0 bg-[var(--accent)]" />
                Herriman, UT — By appointment
                <span className="h-0.5 w-5 shrink-0 bg-[var(--accent)]" />
              </p>
            </Reveal>

            <Reveal delay={80}>
              <div className="relative mx-auto h-44 w-72 sm:h-56 sm:w-[26rem]">
                <Image
                  src="/srt-logo.png"
                  alt="SRT Cuts"
                  fill
                  priority
                  sizes="(min-width:640px) 416px, 288px"
                  className="object-contain"
                />
              </div>
            </Reveal>

            <Reveal delay={150}>
              <h1 className="display display--lg mt-6">
                One chair. Everything to <span className="hot">prove.</span>
              </h1>
            </Reveal>

            <Reveal delay={210}>
              <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                <Link href="/book" className="btn btn--accent w-full sm:w-auto">
                  Reserve the chair
                  <ArrowUpRight size={17} strokeWidth={2.5} />
                </Link>
                <a href="#work" className="btn btn--ghost w-full sm:w-auto">
                  See the work
                </a>
              </div>
            </Reveal>

            {maxDiscount > 0 && (
              <Reveal delay={240}>
                <a href="#services" className="mt-6 inline-flex items-center gap-2.5">
                  <span className="chip chip--accent animate-pulse">{maxDiscount}% OFF</span>
                  <span className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--ink)]">
                    {saleNames} on sale — book now
                  </span>
                </a>
              </Reveal>
            )}

            <Reveal delay={270}>
              <dl className="mt-10 grid w-full max-w-lg grid-cols-3 gap-px overflow-hidden rounded-[4px] border border-[var(--line)] bg-[var(--line)]">
                {[
                  ["No deposits", "Pay at the chair"],
                  ["Replies fast", "Texts, not voicemail"],
                  ["Current cuts", "What's sharp now"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-[var(--paper)] px-3 py-3.5 sm:px-4 sm:py-4">
                    <dt className="font-display text-[15px] uppercase leading-none sm:text-lg">{k}</dt>
                    <dd className="mt-1.5 font-mono text-[9px] uppercase leading-tight tracking-[0.06em] text-[var(--mute)] sm:text-[10px]">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>

        {/* ── Spec ribbon ───────────────────────────────────────────── */}
        <div className="ribbon">
          <div className="ribbon-track">
            {[0, 1].map((dup) => (
              <span key={dup} aria-hidden={dup === 1}>
                {["Skin fades", "Tapers", "Lineups", "Full service", "Kids cuts", "Confirmed by SMS", "Pay via Venmo"].map((w) => (
                  <span key={w}>
                    {w} <em className="ribbon-dot not-italic">/</em>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* ── 02 · PROOF ────────────────────────────────────────────── */}
        <section className="section-tight">
          <div className="shell">
            <Reveal>
              <p className="idx mb-4">[ 02 — WHY IT&apos;S REAL ]</p>
            </Reveal>
            <Reveal delay={60}>
              <p className="display display--lg max-w-4xl normal-case" style={{ lineHeight: 1.05 }}>
                Every head walks out a <span className="hot">reference.</span> One chair means no rushing you to
                the next — just the cut, done right.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-4">
                {[
                  ["01", "Chair", "Yours, start to finish"],
                  ["SMS", "Confirm", "Real reply, fast"],
                  ["$0", "Deposit", "Pay at the chair or Venmo"],
                  ["100%", "Focus", "No double-booking"],
                ].map(([big, label, sub]) => (
                  <div key={label} className="bg-[var(--paper)] p-5">
                    <p className="spec text-3xl">{big}</p>
                    <p className="mt-2 font-display text-lg uppercase leading-none">{label}</p>
                    <p className="mt-1.5 text-xs text-[var(--mute)]">{sub}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 03 · THE WORK ─────────────────────────────────────────── */}
        {gallery.length > 0 && (
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

              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {gallery.map((item, i) => (
                  <Reveal key={`${item.title}-${i}`} delay={(i % 3) * 60}>
                    <button
                      onClick={() => setLightbox(item.imageUrl)}
                      className="group block w-full overflow-hidden rounded-[6px] border border-[var(--line-ink)] text-left"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--ink-2)]">
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          sizes="(min-width:768px) 33vw, 50vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          unoptimized
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                        <span className="font-display text-base uppercase leading-none">{item.title}</span>
                        <span className="idx">{String(i + 1).padStart(2, "0")}</span>
                      </div>
                    </button>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 04 · THE EDGE (age as advantage) ──────────────────────── */}
        <section id="barber" className="section">
          <div className="shell grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[6px] border border-[var(--line)]">
                <Image src={content.barberPhotoUrl || "/srt-logo.png"} alt={content.barberName} fill sizes="400px" className="object-cover" />
              </div>
            </Reveal>
            <Reveal delay={80}>
              <p className="idx mb-4">[ 04 — THE EDGE ]</p>
              <h2 className="display display--xl">
                Young hands.
                <br />
                <span className="hot">Relentless</span> standard.
              </h2>
              <p className="lede mt-7 max-w-xl">
                {content.barberBio}
              </p>
              <p className="mt-5 max-w-xl text-[var(--mute)]">
                Hungrier means more reps, later hours, faster replies, and someone treating every single head
                like it&apos;s the one that makes the reputation. Up to date on the cuts people actually want right
                now — not the ones that were sharp five years ago.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                {content.specialties.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/book" className="btn btn--ink">
                  Book the chair
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
        </section>

        {/* ── 05 · SERVICES / MENU ──────────────────────────────────── */}
        <section id="services" className="section band-ink">
          <div className="shell">
            <Reveal>
              <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
                <div>
                  <p className="idx mb-4">{maxDiscount > 0 ? `[ 05 — ON SALE · ${maxDiscount}% OFF ]` : "[ 05 — THE MENU ]"}</p>
                  <h2 className="display display--xl">
                    {maxDiscount > 0 ? (
                      <>
                        Pick it. <span className="hot">Save</span> on it.
                      </>
                    ) : (
                      <>Pick it. Book it.</>
                    )}
                  </h2>
                </div>
                <p className="max-w-xs text-sm text-[var(--mute-ink)]">
                  {maxDiscount > 0
                    ? `Limited-time pricing on ${saleNames}. Locked in the moment you book.`
                    : "Flat prices, no surprises. Every service is one tap from a booking."}
                </p>
              </div>
            </Reveal>

            <div className="overflow-hidden rounded-[6px] border border-[var(--line-ink)]">
              {services.map((s, i) => {
                const popular = s.name === MOST_REQUESTED;
                const sale = hasDiscount(s);
                const pct = clampDiscount(s.discountPercent);
                return (
                  <Reveal key={s.name}>
                    <Link
                      href="/book"
                      className="group flex items-center gap-4 border-b border-[var(--line-ink)] px-5 py-6 transition-colors last:border-b-0 hover:bg-[var(--ink-2)] sm:px-7"
                    >
                      <span className="idx hidden w-10 shrink-0 sm:block">{String(i + 1).padStart(2, "0")}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-display text-2xl uppercase leading-none sm:text-3xl">{s.name}</h3>
                          {sale && <span className="chip chip--accent animate-pulse">{pct}% off</span>}
                          {popular && !sale && <span className="chip chip--accent">Most requested</span>}
                        </div>
                        <p className="mt-2 text-sm text-[var(--mute-ink)]">{s.desc}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {sale ? (
                          <p className="flex items-baseline justify-end gap-2">
                            <span className="font-mono text-sm text-[var(--mute-ink)] line-through">{formatPrice(s.amount)}</span>
                            <span className="spec text-xl text-[var(--ink)] sm:text-2xl">{formatPrice(effectivePrice(s))}</span>
                          </p>
                        ) : (
                          <p className="spec text-xl text-[var(--ink)] sm:text-2xl">{formatPrice(s.amount)}</p>
                        )}
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--mute-ink)]">{s.duration}</p>
                      </div>
                      <ArrowUpRight
                        size={20}
                        strokeWidth={2.5}
                        className="hidden shrink-0 text-[var(--mute-ink)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)] sm:block"
                      />
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 06 · VOICES ───────────────────────────────────────────── */}
        {testimonials.length > 0 && (
          <section className="section">
            <div className="shell">
              <Reveal>
                <p className="idx mb-4">[ 06 — IN THEIR WORDS ]</p>
                <h2 className="display display--xl mb-12">Regulars, not one-offs</h2>
              </Reveal>
              <div className="grid gap-4 md:grid-cols-3">
                {testimonials.map((t, i) => (
                  <Reveal key={`${t.name}-${i}`} delay={(i % 3) * 60}>
                    <figure className="panel-fill flex h-full flex-col p-6">
                      <span className="font-display text-4xl leading-none text-[var(--accent)]">&ldquo;</span>
                      <blockquote className="mt-3 flex-1 text-[17px] leading-snug">{t.quote}</blockquote>
                      <figcaption className="eyebrow mt-6">{t.name}</figcaption>
                    </figure>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 07 · LOGISTICS (kill objections) ──────────────────────── */}
        <section className="section-tight">
          <div className="shell">
            <Reveal>
              <p className="idx mb-4">[ 07 — THE FINE PRINT, MADE EASY ]</p>
              <h2 className="display display--lg mb-10">No surprises before you sit</h2>
            </Reveal>
            <div className="grid gap-px overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
              <InfoCell
                label="Location"
                title={content.address}
                body={content.parkingNote}
                href={content.mapUrl}
                action="Open map"
                icon
                external
              />
              <InfoCell
                label="Payment"
                title="Pay at the chair or Venmo"
                body={content.depositNote}
                href="/book"
                action="Start booking"
              />
              <InfoCell
                label="Changes"
                title="Reschedule by text"
                body={content.cancellationPolicy}
                href="/book"
                action="Book now"
              />
              <InfoCell
                label="Confirmation"
                title="You'll get a text"
                body={content.reminderPolicy}
                href="/book"
                action="Reserve"
              />
              <InfoCell
                label="Rewards"
                title={content.loyaltyOffer}
                body={content.referralOffer}
                href="/book"
                action="Earn it"
              />
              {social && (
                <InfoCell
                  label="Latest"
                  title={`Follow on ${content.instagramUrl ? "Instagram" : "TikTok"}`}
                  body="Fresh work and open slots as they drop."
                  href={social}
                  action={content.instagramUrl ? "Instagram" : "TikTok"}
                  external
                />
              )}
            </div>
          </div>
        </section>

        {/* ── ABOUT ME ──────────────────────────────────────────────── */}
        <section id="about" className="section">
          <div className="shell grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-[6px] border border-[var(--line)]">
                <Image src={aboutImage} alt={content.barberName} fill sizes="(min-width:1024px) 440px, 90vw" className="object-cover" />
              </div>
            </Reveal>
            <Reveal delay={80}>
              <p className="idx mb-4">[ ABOUT ME ]</p>
              <h2 className="display display--xl">
                Behind the <span className="hot">chair.</span>
              </h2>
              <p className="lede mt-7 max-w-xl">
                Precision fades and clean lineups, booked online and confirmed by text. Young hands,
                relentless standard — every cut is the one that builds the name. Sit down sharp, leave sharper.
              </p>
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
        </section>

        {/* ── 08 · FINAL CTA ────────────────────────────────────────── */}
        <section className="section band-ink">
          <div className="shell">
            <Reveal>
              <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
                <div>
                  <p className="idx mb-5">[ 08 — YOUR MOVE ]</p>
                  <h2 className="display display--hero" style={{ fontSize: "clamp(48px,9vw,128px)" }}>
                    Claim the
                    <br />
                    <span className="hot">chair.</span>
                  </h2>
                  <p className="lede mt-6 max-w-md text-[var(--mute-ink)]">
                    Under a minute to book. Confirmed by text. Pay when you&apos;re in the chair.
                  </p>
                </div>
                <Link href="/book" className="btn btn--accent !min-h-[60px] !px-9 text-[14px]">
                  Reserve the chair
                  <ArrowUpRight size={18} strokeWidth={2.5} />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className="band-ink border-t border-[var(--line-ink)] pb-12 pt-14">
          <div className="shell">
            <div className="flex flex-col justify-between gap-10 sm:flex-row">
              <div className="max-w-xs">
                <span className="wordmark text-[var(--ink)]">
                  SRT<span className="hot">.</span>CUTS
                </span>
                <p className="mt-4 text-sm text-[var(--mute-ink)]">
                  Precision barbering in Herriman, Utah. One chair, by appointment, everything to prove.
                </p>
              </div>
              <nav className="grid grid-cols-2 gap-x-12 gap-y-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.1em]">
                <Link href="/" className="text-[var(--mute-ink)] transition-colors hover:text-[var(--ink)]">Home</Link>
                <Link href="/#work" className="text-[var(--mute-ink)] transition-colors hover:text-[var(--ink)]">Work</Link>
                <Link href="/#services" className="text-[var(--mute-ink)] transition-colors hover:text-[var(--ink)]">Menu</Link>
                <Link href="/book" className="text-[var(--mute-ink)] transition-colors hover:text-[var(--ink)]">Book</Link>
                <Link href="/bookings" className="text-[var(--mute-ink)] transition-colors hover:text-[var(--ink)]">My bookings</Link>
                {social && (
                  <a href={social} target="_blank" rel="noopener noreferrer" className="text-[var(--mute-ink)] transition-colors hover:text-[var(--ink)]">
                    {content.instagramUrl ? "Instagram" : "TikTok"}
                  </a>
                )}
              </nav>
            </div>
            <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[var(--line-ink)] pt-6 sm:flex-row sm:items-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--mute-ink)]">
                © {new Date().getFullYear()} SRT Cuts · Herriman, UT
              </p>
              <Link href="/book" className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--accent)]">
                Reserve the chair →
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}

function InfoCell({
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
  href: string;
  action: string;
  external?: boolean;
  icon?: boolean;
}) {
  const inner = (
    <>
      <p className="eyebrow mb-4">{label}</p>
      <h3 className="flex items-start gap-2 font-display text-xl uppercase leading-tight">
        {icon && <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--accent-deep)]" />}
        {title}
      </h3>
      <p className="mt-2.5 flex-1 text-sm text-[var(--mute)]">{body}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--accent-deep)]">
        {action} <ArrowUpRight size={14} strokeWidth={2.5} />
      </span>
    </>
  );
  const cls = "flex min-h-[180px] flex-col bg-[var(--paper)] p-6 transition-colors hover:bg-[var(--paper-2)]";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
