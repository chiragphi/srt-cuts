"use client";

/**
 * SRT Cuts — Home (customer storefront, "Editorial / Atelier").
 * A premium, light, editorial funnel: pitch → proof → menu → barber → voices
 * → logistics → ask. All copy/prices/gallery/policy come from Supabase via
 * /api/site-content. Fully isolated from the admin cockpit — its own `.site`
 * design system, its own components.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, X, MapPin } from "lucide-react";
import { useAuth } from "@/context/auth";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/motion";
import {
  formatPrice,
  effectivePrice,
  hasDiscount,
  clampDiscount,
  type ServiceConfig,
} from "@/lib/services";
import {
  DEFAULT_SITE_CONTENT,
  isPlaceholderGalleryItem,
  isPlaceholderTestimonial,
  type SiteContent,
} from "@/lib/site-content";

const MOST_REQUESTED = "Full Service";

export default function HomePage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // The owner's home base is the cockpit — so when the signed-in admin lands on
  // the storefront, send them straight to /admin. The one exception is an
  // explicit "View storefront" hop (?site=1), which we remember for the tab so
  // browsing the customer site doesn't keep bouncing back. Viewing-as a customer
  // reads as non-admin here, so previews are unaffected.
  useEffect(() => {
    if (loading || !isAdmin || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("site") === "1") {
      sessionStorage.setItem("srtSiteMode", "1");
      window.history.replaceState(null, "", "/");
      return;
    }
    if (sessionStorage.getItem("srtSiteMode") === "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRedirecting(true);
    router.replace("/admin");
  }, [loading, isAdmin, router]);

  useEffect(() => {
    fetch("/api/site-content")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        if (d?.content) setContent(d.content);
      });
  }, []);

  if (redirecting) {
    return <div className="site" style={{ minHeight: "100dvh" }} />;
  }

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
    <div className="site">
      <SiteNav />

      {lightbox && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,17,25,0.86)", backdropFilter: "blur(4px)", padding: 16 }}
          onClick={() => setLightbox(null)}
        >
          <button aria-label="Close" onClick={() => setLightbox(null)} style={{ position: "absolute", top: 20, right: 20, color: "#fff", background: "none", border: 0, cursor: "pointer" }}>
            <X size={26} />
          </button>
          <div style={{ position: "relative", aspectRatio: "4/5", width: "100%", maxWidth: 560, overflow: "hidden", borderRadius: 18 }} onClick={(e) => e.stopPropagation()}>
            <Image src={lightbox} alt="Work" fill sizes="(max-width:768px) 100vw, 560px" style={{ objectFit: "cover" }} unoptimized />
          </div>
        </div>
      )}

      <main className="cx-has-tabbar">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section style={{ paddingTop: "clamp(120px, 16vw, 190px)" }}>
          <div className="cx-shell">
            <div className="grid items-center" style={{ gap: "clamp(36px, 6vw, 72px)", gridTemplateColumns: "1fr" }}>
              <div className="lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
                <div>
                  <Reveal>
                    <p className="cx-eyebrow" style={{ marginBottom: 22 }}>Herriman, UT · By appointment</p>
                  </Reveal>
                  <Reveal delay={70}>
                    <h1 className="cx-display cx-display--hero">
                      Your sharpest<br />cut <em>yet.</em>
                    </h1>
                  </Reveal>
                  <Reveal delay={140}>
                    <p className="cx-lede" style={{ marginTop: 26, maxWidth: 460 }}>
                      Book in under a minute — confirmed by text, no deposit, pay at the chair.
                    </p>
                  </Reveal>
                  <Reveal delay={210}>
                    <div className="flex flex-wrap items-center" style={{ gap: 16, marginTop: 34 }}>
                      <Link href="/book" className="cx-btn cx-btn--accent">
                        Reserve the chair <ArrowUpRight size={17} strokeWidth={2.2} />
                      </Link>
                      <a href="#work" className="cx-textlink">
                        See the work <ArrowUpRight size={14} strokeWidth={2.2} />
                      </a>
                    </div>
                  </Reveal>
                  {maxDiscount > 0 && (
                    <Reveal delay={260}>
                      <a href="#services" className="flex items-center" style={{ gap: 10, marginTop: 26 }}>
                        <span className="cx-chip cx-chip--accent">{maxDiscount}% off</span>
                        <span style={{ fontSize: 14, fontWeight: 550, color: "var(--c-ink-2)" }}>{saleNames} on sale</span>
                      </a>
                    </Reveal>
                  )}
                </div>

                <Reveal delay={200} className="cx-hero-media">
                  <figure style={{ position: "relative" }}>
                    <div style={{ position: "relative", aspectRatio: "4/5", width: "100%", overflow: "hidden", borderRadius: "var(--c-r-xl)", boxShadow: "var(--c-shadow)" }}>
                      <Image src={heroImage} alt={content.barberName} fill priority sizes="(min-width:1024px) 460px, 92vw" style={{ objectFit: "cover" }} />
                    </div>
                    <figcaption
                      style={{ position: "absolute", left: 16, bottom: 16, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderRadius: 999, padding: "8px 14px", boxShadow: "var(--c-shadow-sm)" }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--c-ok)" }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>Booking open</span>
                    </figcaption>
                  </figure>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ── Work ─────────────────────────────────────────────────── */}
        {gallery.length > 0 && (
          <section id="work" className="cx-section">
            <div className="cx-shell">
              <Reveal>
                <SectionHead eyebrow="The work" title={<>Receipts, not <em>promises.</em></>} sub="Edge work up close — the blends, the lines, the details that hold up in daylight." />
              </Reveal>
              <div className="grid" style={{ gap: "clamp(12px,2vw,20px)", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", marginTop: 44 }}>
                {gallery.map((item, i) => (
                  <Reveal key={`${item.title}-${i}`} delay={(i % 3) * 70}>
                    <button
                      onClick={() => setLightbox(item.imageUrl)}
                      className="cx-card"
                      style={{ display: "block", width: "100%", overflow: "hidden", textAlign: "left", padding: 0, cursor: "pointer" }}
                    >
                      <div style={{ position: "relative", aspectRatio: "4/5", overflow: "hidden", background: "var(--n-100)" }}>
                        <Image src={item.imageUrl} alt={item.title} fill sizes="(min-width:768px) 33vw, 50vw" style={{ objectFit: "cover" }} className="cx-gallery-img" unoptimized />
                      </div>
                      <div className="flex items-center justify-between" style={{ padding: "13px 16px" }}>
                        <span style={{ fontFamily: "var(--c-display)", fontSize: 17, fontWeight: 520 }}>{item.title}</span>
                        <span className="cx-num" style={{ fontSize: 13, color: "var(--c-ink-3)" }}>{String(i + 1).padStart(2, "0")}</span>
                      </div>
                    </button>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Menu ─────────────────────────────────────────────────── */}
        <section id="services" className="cx-section--tight" style={{ background: "var(--c-raise)", borderBlock: "1px solid var(--c-line)" }}>
          <div className="cx-shell">
            <Reveal>
              <SectionHead
                eyebrow={maxDiscount > 0 ? `On sale · ${maxDiscount}% off` : "The menu"}
                title={maxDiscount > 0 ? <>Pick it. <em>Save</em> on it.</> : <>Pick it. Book it.</>}
                sub={maxDiscount > 0 ? `Limited-time pricing on ${saleNames}. Locked in the moment you book.` : "Flat prices, no surprises. Every service is one tap from a booking."}
              />
            </Reveal>
            <div style={{ marginTop: 40, borderTop: "1px solid var(--c-line)" }}>
              {services.map((s, i) => (
                <Reveal key={s.name} delay={Math.min(i, 5) * 40}>
                  <ServiceRow service={s} index={i} popular={s.name === MOST_REQUESTED} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── About ────────────────────────────────────────────────── */}
        <section id="about" className="cx-section">
          <div className="cx-shell">
            <div className="grid items-center" style={{ gap: "clamp(32px,5vw,64px)", gridTemplateColumns: "1fr" }}>
              <div className="lg:grid lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
                <Reveal>
                  <div style={{ position: "relative", aspectRatio: "4/5", width: "100%", maxWidth: 440, overflow: "hidden", borderRadius: "var(--c-r-xl)", boxShadow: "var(--c-shadow)" }}>
                    <Image src={aboutImage} alt={content.barberName} fill sizes="(min-width:1024px) 440px, 90vw" style={{ objectFit: "cover" }} />
                  </div>
                </Reveal>
                <Reveal delay={90}>
                  <div style={{ marginTop: "clamp(28px,4vw,0)" }}>
                    <p className="cx-eyebrow" style={{ marginBottom: 20 }}>About</p>
                    <h2 className="cx-display cx-display--xl">Young hands.<br /><em>Relentless</em> standard.</h2>
                    <p className="cx-lede" style={{ marginTop: 26, maxWidth: 520 }}>{content.barberBio}</p>
                    {content.specialties.length > 0 && (
                      <div className="flex flex-wrap" style={{ gap: 10, marginTop: 26 }}>
                        {content.specialties.map((s) => (
                          <span key={s} className="cx-chip">{s}</span>
                        ))}
                      </div>
                    )}
                    {aboutQuote && (
                      <blockquote style={{ marginTop: 30, borderLeft: "2px solid var(--c-accent)", paddingLeft: 20 }}>
                        <p className="cx-display cx-display--md" style={{ fontWeight: 440 }}>&ldquo;{aboutQuote.quote}&rdquo;</p>
                        <p className="cx-eyebrow cx-eyebrow--plain" style={{ marginTop: 14 }}>{aboutQuote.name}</p>
                      </blockquote>
                    )}
                    <div className="flex flex-wrap" style={{ gap: 12, marginTop: 34 }}>
                      <Link href="/book" className="cx-btn cx-btn--accent">Reserve the chair <ArrowUpRight size={16} strokeWidth={2.2} /></Link>
                      {social && (
                        <a href={social} target="_blank" rel="noopener noreferrer" className="cx-btn cx-btn--ghost">
                          {content.instagramUrl ? "Instagram" : "TikTok"}
                        </a>
                      )}
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ── Voices ───────────────────────────────────────────────── */}
        {testimonials.length > 0 && (
          <section className="cx-section--tight" style={{ background: "var(--c-raise)", borderBlock: "1px solid var(--c-line)" }}>
            <div className="cx-shell">
              <Reveal><SectionHead eyebrow="In their words" title="Regulars, not one-offs." /></Reveal>
              <div className="grid" style={{ gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 40 }}>
                {testimonials.slice(0, 3).map((t, i) => (
                  <Reveal key={`${t.name}-${i}`} delay={i * 70}>
                    <figure className="cx-card" style={{ padding: "26px 26px 24px", height: "100%", display: "flex", flexDirection: "column" }}>
                      <span style={{ fontFamily: "var(--c-display)", fontSize: 44, lineHeight: 0.7, color: "var(--c-accent)" }}>&ldquo;</span>
                      <blockquote style={{ marginTop: 14, flex: 1, fontSize: 17, lineHeight: 1.5, color: "var(--c-ink)" }}>{t.quote}</blockquote>
                      <figcaption className="cx-eyebrow cx-eyebrow--plain" style={{ marginTop: 22 }}>{t.name}</figcaption>
                    </figure>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Fine print ───────────────────────────────────────────── */}
        <section className="cx-section">
          <div className="cx-shell">
            <Reveal><SectionHead eyebrow="The fine print" title="No surprises before you sit." /></Reveal>
            <Reveal delay={60}>
              <div className="cx-card" style={{ marginTop: 40, padding: "clamp(8px,2vw,20px) clamp(20px,3vw,32px)" }}>
                <InfoRow label="Location" title={content.address} body={content.parkingNote} href={content.mapUrl} action="Open map" />
                <InfoRow label="Payment" title="Pay at the chair or Venmo" body={content.depositNote} />
                <InfoRow label="Changes" title="Reschedule by text" body={content.cancellationPolicy} />
                <InfoRow label="Confirmation" title="You'll get a text" body={content.reminderPolicy} />
                <InfoRow label="Rewards" title={content.loyaltyOffer} body={content.referralOffer} last={!social} />
                {social && (
                  <InfoRow
                    label="Latest"
                    title={`Follow on ${content.instagramUrl ? "Instagram" : "TikTok"}`}
                    body="Fresh work and open slots as they drop."
                    href={social}
                    action={content.instagramUrl ? "Instagram" : "TikTok"}
                    last
                  />
                )}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Final CTA (dark editorial band) ──────────────────────── */}
        <section className="cx-on-dark cx-section">
          <div className="cx-shell">
            <Reveal>
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between" style={{ gap: 32 }}>
                <div>
                  <p className="cx-eyebrow" style={{ marginBottom: 20 }}>Your move</p>
                  <h2 className="cx-display cx-display--hero" style={{ color: "var(--c-on-dark)" }}>Claim the <em style={{ color: "var(--p-400)" }}>chair.</em></h2>
                  <p className="cx-lede" style={{ marginTop: 22, maxWidth: 440 }}>Under a minute to book. Confirmed by text. Pay when you&apos;re in the chair.</p>
                </div>
                <Link href="/book" className="cx-btn cx-btn--accent" style={{ minHeight: 58, paddingInline: 34 }}>
                  Reserve the chair <ArrowUpRight size={18} strokeWidth={2.2} />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer style={{ background: "var(--c-dark-2)", color: "var(--c-on-dark)", paddingBlock: "56px 48px", borderTop: "1px solid var(--c-on-dark-line)" }}>
          <div className="cx-shell">
            <div className="flex flex-col sm:flex-row sm:justify-between" style={{ gap: 40 }}>
              <div style={{ maxWidth: 300 }}>
                <span className="cx-wordmark" style={{ color: "var(--c-on-dark)" }}>SRT <em style={{ color: "var(--p-400)" }}>Cuts</em></span>
                <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.55, color: "var(--c-on-dark-2)" }}>
                  Precision barbering in Herriman, Utah. One chair, by appointment, everything to prove.
                </p>
              </div>
              <nav className="grid grid-cols-2" style={{ gap: "8px 48px", fontSize: 14.5 }}>
                {[
                  ["Home", "/"], ["Work", "/#work"], ["Menu", "/#services"],
                  ["Book", "/book"], ["My bookings", "/bookings"],
                ].map(([label, href]) => (
                  <Link key={label} href={href} style={{ color: "var(--c-on-dark-2)" }}>{label}</Link>
                ))}
                {social && (
                  <a href={social} target="_blank" rel="noopener noreferrer" style={{ color: "var(--c-on-dark-2)" }}>
                    {content.instagramUrl ? "Instagram" : "TikTok"}
                  </a>
                )}
              </nav>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between" style={{ gap: 12, marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--c-on-dark-line)" }}>
              <p style={{ fontSize: 12.5, color: "var(--c-on-dark-2)" }}>© {new Date().getFullYear()} SRT Cuts · Herriman, UT</p>
              <Link href="/book" style={{ fontSize: 13, fontWeight: 600, color: "var(--p-400)" }}>Reserve the chair →</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div style={{ maxWidth: 620 }}>
      <p className="cx-eyebrow" style={{ marginBottom: 18 }}>{eyebrow}</p>
      <h2 className="cx-display cx-display--lg">{title}</h2>
      {sub && <p className="cx-lede" style={{ marginTop: 18 }}>{sub}</p>}
    </div>
  );
}

function ServiceRow({ service, index, popular }: { service: ServiceConfig; index: number; popular?: boolean }) {
  const discounted = hasDiscount(service);
  return (
    <Link
      href="/book"
      className="cx-service-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "clamp(20px,3vw,30px) 4px",
        borderBottom: "1px solid var(--c-line)",
        textDecoration: "none",
      }}
    >
      <span className="cx-num" style={{ fontSize: 13, color: "var(--c-ink-3)", width: 28, flex: "none" }}>{String(index + 1).padStart(2, "0")}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
          <span style={{ fontFamily: "var(--c-display)", fontSize: "clamp(22px,3vw,30px)", fontWeight: 500 }}>{service.name}</span>
          {popular && <span className="cx-chip cx-chip--soft">Most requested</span>}
          {discounted && <span className="cx-chip cx-chip--accent">{clampDiscount(service.discountPercent)}% off</span>}
        </div>
        <p style={{ marginTop: 6, fontSize: 14.5, color: "var(--c-ink-2)" }}>{service.desc}</p>
        <p style={{ marginTop: 3, fontSize: 13, color: "var(--c-ink-3)" }}>{service.duration}</p>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        {discounted && <span style={{ display: "block", fontSize: 13, color: "var(--c-ink-3)", textDecoration: "line-through" }}>{formatPrice(service.amount)}</span>}
        <span className="cx-num" style={{ fontFamily: "var(--c-display)", fontSize: "clamp(20px,2.6vw,26px)", fontWeight: 520, color: discounted ? "var(--c-accent-ink)" : "var(--c-ink)" }}>
          {formatPrice(effectivePrice(service))}
        </span>
      </div>
      <ArrowUpRight size={18} strokeWidth={2} className="cx-service-arrow" style={{ color: "var(--c-ink-3)", flex: "none" }} />
    </Link>
  );
}

function InfoRow({ label, title, body, href, action, last }: { label: string; title: string; body?: string; href?: string; action?: string; last?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 4, padding: "22px 0", borderBottom: last ? "none" : "1px solid var(--c-line)" }}>
      <div className="sm:grid sm:grid-cols-[140px_1fr] sm:gap-6 sm:items-start">
        <p className="cx-eyebrow cx-eyebrow--plain" style={{ marginBottom: 6 }}>{label}</p>
        <div>
          <p style={{ fontSize: 17, fontWeight: 550, color: "var(--c-ink)" }}>{title}</p>
          {body && <p style={{ marginTop: 4, fontSize: 14.5, color: "var(--c-ink-2)", lineHeight: 1.55 }}>{body}</p>}
          {href && action && (
            <a href={href} target="_blank" rel="noopener noreferrer" className="cx-textlink" style={{ marginTop: 8, color: "var(--c-accent-ink)" }}>
              <MapPin size={14} /> {action}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
