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
import { ArrowUpRight, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import Reveal from "@/components/Reveal";
import { Section, SectionHeader, Card, StatList, InfoRow, ServiceRow } from "@/components/ui";
import { hasDiscount, clampDiscount } from "@/lib/services";
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
  const aboutImage = content.aboutImageUrl || "/barber.jpg";
  const heroImage = content.heroImageUrl || "/barber.jpg";
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

        {/* ── 02 · THE WORK ─────────────────────────────────────────── */}
        {gallery.length > 0 && (
          <Section id="work" band>
            <Reveal>
              <SectionHeader
                idx="[ 02 — THE WORK ]"
                title={<>Receipts,<br />not <span className="hot">promises</span></>}
                sub="Edge work up close — the blends, the lines, the details that hold up in daylight."
              />
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
          </Section>
        )}

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

        {/* ── 05 · VOICES ──────────────────────────────────────────── */}
        {testimonials.length > 0 && (
          <Section band>
            <Reveal>
              <SectionHeader idx="[ 04 — IN THEIR WORDS ]" title="Regulars, not one-offs" />
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

        {/* ── 06 · THE FINE PRINT ──────────────────────────────────── */}
        <Section tight>
          <Reveal>
            <SectionHeader idx="[ 05 — THE FINE PRINT ]" title="No surprises before you sit" />
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

        {/* ── 07 · FINAL CTA ────────────────────────────────────────── */}
        <section className="section band-ink">
          <div className="shell">
            <Reveal>
              <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
                <div>
                  <p className="idx mb-5">[ 06 — YOUR MOVE ]</p>
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
