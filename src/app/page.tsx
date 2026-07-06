"use client";

/**
 * SRT Cuts — customer home, structured as a Barbr-style barber profile page:
 * dark chrome → brand banner with rating badge → identity card → promos →
 * address/hours rows → Work carousel → Location map card → Services (inline
 * single-select) → Opening Hours → Reviews → sticky Book bar. All content
 * comes from Supabase via /api/site-content; selecting a service hands off
 * to /book with the choice in the query string.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Gift, Info, MapPin, Navigation, X } from "lucide-react";
import { useAuth } from "@/context/auth";
import { SiteHeader, SiteFooter, Stars, Avatar, StickyBookBar, InstagramIcon, TikTokIcon } from "@/components/site/chrome";
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
import { DAYS_OF_WEEK } from "@/lib/schedule";

function hoursLabel(slots: string[] | undefined) {
  if (!slots || slots.length === 0) return "Closed";
  return `${slots[0]} – ${slots[slots.length - 1]}`;
}

export default function HomePage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [selected, setSelected] = useState<string>("");
  const [hoursOpen, setHoursOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // The owner's home base is the cockpit — when the signed-in admin lands on
  // the storefront, send them to /admin unless they explicitly hopped over
  // with ?site=1 (remembered per tab). Impersonation reads as non-admin.
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

  const todayInfo = useMemo(() => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const blocked = content.scheduleBlocks.some((b) => b.date === iso);
    const slots = iso in content.dateAvailability ? content.dateAvailability[iso] : content.weeklyAvailability[String(now.getDay())] ?? [];
    return { open: !blocked && slots.length > 0, label: !blocked && slots.length > 0 ? `${slots[0]} – ${slots[slots.length - 1]}` : "Closed today" };
  }, [content]);

  if (redirecting) {
    return <div className="site" style={{ minHeight: "100dvh" }} />;
  }

  const gallery = content.gallery.filter((g) => !isPlaceholderGalleryItem(g));
  const reviews = content.testimonials.filter((t) => !isPlaceholderTestimonial(t));
  const services = content.serviceConfigs;
  const heroImage = content.heroImageUrl || "/barber.jpg";
  const avatar = content.barberPhotoUrl || "/srt-logo.png";

  const onSale = services.filter(hasDiscount);
  const maxDiscount = onSale.reduce((m, s) => Math.max(m, clampDiscount(s.discountPercent)), 0);
  const selectedService = services.find((s) => s.name === selected);

  function scrollCarousel(dir: 1 | -1) {
    carouselRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  }

  return (
    <div className="site cx-has-stickybar">
      <SiteHeader />

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

      <main>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="cx-banner">
          <div className="cx-banner-media">
            <Image src={heroImage} alt={content.barberName} fill priority sizes="100vw" style={{ objectFit: "cover", opacity: 0.92 }} />
          </div>
          {reviews.length > 0 && (
            <div className="cx-banner-rating">
              <p className="cx-num" style={{ fontSize: 15, fontWeight: 750 }}>5.0</p>
              <p style={{ fontSize: 11.5, opacity: 0.85 }}>{reviews.length} review{reviews.length === 1 ? "" : "s"}</p>
            </div>
          )}
        </div>

        <div className="cx-shell">
          {/* ── Identity card ──────────────────────────────────────── */}
          <div className="cx-card cx-idcard">
            <div className="flex items-center" style={{ gap: 14 }}>
              <Avatar src={avatar} alt={content.barberName} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontFamily: "var(--c-display)", fontSize: "clamp(20px, 4vw, 25px)", fontWeight: 560, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  {content.barberName}
                </h1>
                {reviews.length > 0 && (
                  <p className="flex items-center" style={{ gap: 6, marginTop: 4 }}>
                    <Stars size={13} />
                    <span className="cx-num" style={{ fontSize: 13.5, fontWeight: 650, color: "var(--c-accent-ink)" }}>5.0</span>
                    <span style={{ fontSize: 13, color: "var(--c-ink-3)" }}>({reviews.length})</span>
                  </p>
                )}
              </div>
              <div className="flex" style={{ gap: 8 }}>
                {content.instagramUrl && (
                  <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className="cx-social" aria-label="Instagram">
                    <InstagramIcon size={16} />
                  </a>
                )}
                {content.tiktokUrl && (
                  <a href={content.tiktokUrl} target="_blank" rel="noopener noreferrer" className="cx-social" aria-label="TikTok">
                    <TikTokIcon size={15} />
                  </a>
                )}
              </div>
            </div>

            {content.barberBio && (
              <p style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--c-line)", fontSize: 14.5, lineHeight: 1.55, color: "var(--c-ink-2)" }}>
                {content.barberBio}
              </p>
            )}

            {(maxDiscount > 0 || content.loyaltyOffer) && (
              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                {maxDiscount > 0 && (
                  <div className="cx-promo">
                    <Gift size={17} style={{ flex: "none" }} />
                    <span>
                      {maxDiscount}% off {onSale.map((s) => s.name).join(", ")} — applied automatically when you book.
                    </span>
                  </div>
                )}
                {content.loyaltyOffer && (
                  <div className="cx-promo" style={{ borderColor: "var(--c-line-2)", background: "var(--c-raise)", color: "var(--c-ink-2)" }}>
                    <Gift size={17} style={{ flex: "none", color: "var(--c-accent-ink)" }} />
                    <span>{content.loyaltyOffer}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 14, borderTop: "1px solid var(--c-line)" }}>
              <div className="cx-inforow">
                <MapPin size={16} className="cx-inforow-icon" />
                <span>{content.address}</span>
                <a href={content.mapUrl} target="_blank" rel="noopener noreferrer" className="cx-inforow-action">
                  Map
                </a>
              </div>
              <button
                className="cx-inforow"
                style={{ width: "100%", background: "none", border: 0, borderTop: "1px solid var(--c-line)", cursor: "pointer", textAlign: "left", font: "inherit" }}
                onClick={() => setHoursOpen((o) => !o)}
                aria-expanded={hoursOpen}
              >
                <Clock size={16} className="cx-inforow-icon" />
                <span style={{ color: todayInfo.open ? "var(--c-ink)" : "var(--c-ink-3)" }}>
                  {todayInfo.open ? `Open today · ${todayInfo.label}` : "Closed today"}
                </span>
                <span className="cx-inforow-action" style={{ color: "var(--c-ink-3)" }}>
                  <ChevronDown size={16} style={{ transform: hoursOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s var(--c-ease-out)" }} />
                </span>
              </button>
              {hoursOpen && (
                <div style={{ paddingLeft: 26, paddingBottom: 8 }}>
                  {DAYS_OF_WEEK.map((day, i) => (
                    <div key={day} className="flex items-center justify-between" style={{ padding: "5px 0", fontSize: 13.5 }}>
                      <span style={{ color: "var(--c-ink-2)" }}>{day}</span>
                      <span className="cx-num" style={{ color: (content.weeklyAvailability[String(i)] ?? []).length ? "var(--c-ink)" : "var(--c-ink-3)" }}>
                        {hoursLabel(content.weeklyAvailability[String(i)])}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {content.parkingNote && (
                <div className="cx-inforow" style={{ borderTop: "1px solid var(--c-line)" }}>
                  <Info size={16} className="cx-inforow-icon" />
                  <span style={{ color: "var(--c-ink-2)", fontSize: 13.5 }}>{content.parkingNote}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Work ───────────────────────────────────────────────── */}
          {gallery.length > 0 && (
            <Reveal className="cx-section">
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <h2 className="cx-sectiontitle" style={{ margin: 0 }}>Work</h2>
                <div className="flex" style={{ gap: 8 }}>
                  <button className="cx-roundbtn" onClick={() => scrollCarousel(-1)} aria-label="Scroll work back">
                    <ChevronLeft size={17} />
                  </button>
                  <button className="cx-roundbtn" onClick={() => scrollCarousel(1)} aria-label="Scroll work forward">
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
              <div className="cx-carousel" ref={carouselRef}>
                {gallery.map((item, i) => (
                  <button key={`${item.title}-${i}`} className="cx-carousel-item" onClick={() => setLightbox(item.imageUrl)} aria-label={item.title}>
                    <Image src={item.imageUrl} alt={item.title} fill sizes="240px" style={{ objectFit: "cover" }} unoptimized />
                  </button>
                ))}
              </div>
            </Reveal>
          )}

          {/* ── Location ───────────────────────────────────────────── */}
          <Reveal className="cx-section">
            <h2 className="cx-sectiontitle">Location</h2>
            <div className="cx-mapwrap">
              <iframe
                title="Map"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(content.address)}&z=12&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="cx-mapcard">
                <Avatar src={avatar} alt={content.barberName} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14.5 }}>{content.barberName}</p>
                  <p style={{ fontSize: 13, color: "var(--c-ink-2)" }}>{content.address}</p>
                </div>
                <a href={content.mapUrl} target="_blank" rel="noopener noreferrer" aria-label="Directions" className="cx-roundbtn" style={{ flex: "none" }}>
                  <Navigation size={15} />
                </a>
              </div>
            </div>
            {content.parkingNote && (
              <p style={{ marginTop: 10, fontSize: 13, color: "var(--c-ink-3)" }}>{content.parkingNote}</p>
            )}
          </Reveal>

          {/* ── Services ───────────────────────────────────────────── */}
          <Reveal className="cx-section" >
            <h2 className="cx-sectiontitle" id="services">Services</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {services.map((s) => (
                <ServiceCard key={s.name} service={s} selected={selected === s.name} onSelect={() => setSelected(selected === s.name ? "" : s.name)} />
              ))}
            </div>
          </Reveal>

          {/* ── Opening hours ──────────────────────────────────────── */}
          <Reveal className="cx-section">
            <h2 className="cx-sectiontitle">Opening Hours</h2>
            <div className="cx-card" style={{ padding: "6px 20px" }}>
              {DAYS_OF_WEEK.map((day, i) => {
                const label = hoursLabel(content.weeklyAvailability[String(i)]);
                return (
                  <div key={day} className="cx-hourrow">
                    <span style={{ color: "var(--c-ink-2)", fontWeight: 550 }}>{day}</span>
                    <span className="cx-num" style={{ fontWeight: 600, color: label === "Closed" ? "var(--c-ink-3)" : "var(--c-ink)" }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </Reveal>

          {/* ── Reviews ────────────────────────────────────────────── */}
          {reviews.length > 0 && (
            <Reveal className="cx-section">
              <h2 className="cx-sectiontitle">Reviews</h2>
              <div className="flex items-end justify-between" style={{ gap: 16, marginBottom: 16 }}>
                <p className="cx-avg cx-num">
                  5.0<span style={{ fontFamily: "var(--c-sans)", fontSize: 13, fontWeight: 650, letterSpacing: "0.06em", color: "var(--c-ink-3)", marginLeft: 6 }}>AVG</span>
                </p>
                <div style={{ textAlign: "right" }}>
                  <Stars size={20} />
                  <p style={{ marginTop: 4, fontSize: 13, color: "var(--c-ink-2)" }}>
                    Based on <span style={{ color: "var(--c-accent-ink)", fontWeight: 650 }}>{reviews.length} Review{reviews.length === 1 ? "" : "s"}</span>
                  </p>
                </div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {reviews.map((t, i) => (
                  <div key={`${t.name}-${i}`} className="cx-card" style={{ padding: "14px 16px" }}>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <Stars size={13} />
                      <span style={{ fontSize: 13.5, fontWeight: 650, color: "var(--c-ink-2)" }}>{t.name}</span>
                    </div>
                    <p style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.5 }}>{t.quote}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {/* ── Policies ───────────────────────────────────────────── */}
          <Reveal className="cx-section">
            <div className="cx-card" style={{ padding: "6px 20px" }}>
              {[
                ["Payment", content.depositNote],
                ["Changes", content.cancellationPolicy],
                ["Confirmation", content.reminderPolicy],
                ["Referrals", content.referralOffer],
              ]
                .filter(([, body]) => body)
                .map(([label, body], i, arr) => (
                  <div key={label} style={{ padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--c-line)" : "none" }}>
                    <p className="cx-kicker" style={{ marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--c-ink-2)" }}>{body}</p>
                  </div>
                ))}
            </div>
          </Reveal>

          <div className="cx-section" style={{ textAlign: "center" }}>
            <p style={{ fontSize: 12.5, color: "var(--c-ink-3)" }}>
              Powered by <Link href="/" style={{ fontWeight: 650, color: "var(--c-accent-ink)" }}>SRT Cuts</Link>
            </p>
          </div>
        </div>

        <SiteFooter instagramUrl={content.instagramUrl} tiktokUrl={content.tiktokUrl} />
      </main>

      <StickyBookBar
        show={!!selectedService}
        avatarSrc={avatar}
        name={content.barberName}
        detail={selectedService ? `1 service selected · ${formatPrice(effectivePrice(selectedService))}` : ""}
        cta="Book"
        onBook={() => selectedService && router.push(`/book?service=${encodeURIComponent(selectedService.name)}`)}
      />
    </div>
  );
}

function ServiceCard({ service, selected, onSelect }: { service: ServiceConfig; selected: boolean; onSelect: () => void }) {
  const discounted = hasDiscount(service);
  return (
    <button className="cx-service" data-selected={selected} onClick={onSelect} aria-pressed={selected}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{service.name}</span>
          {discounted && <span className="cx-chip cx-chip--accent" style={{ padding: "4px 9px", fontSize: 11, cursor: "default" }}>{clampDiscount(service.discountPercent)}% off</span>}
          {selected && (
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: "var(--c-accent)", color: "#fff", flex: "none" }}>
              <Check size={11} strokeWidth={3.2} />
            </span>
          )}
        </div>
        <p style={{ marginTop: 5, fontSize: 13.5, lineHeight: 1.45, color: "var(--c-ink-2)" }}>{service.desc}</p>
        <p className="cx-num" style={{ marginTop: 8, fontSize: 14.5, fontWeight: 650 }}>
          {discounted && (
            <span style={{ color: "var(--c-ink-3)", textDecoration: "line-through", fontWeight: 500, marginRight: 8 }}>{formatPrice(service.amount)}</span>
          )}
          <span style={{ color: discounted ? "var(--c-accent-ink)" : "var(--c-ink)" }}>{formatPrice(effectivePrice(service))}</span>
          <span style={{ color: "var(--c-ink-3)", fontWeight: 500 }}> ~ {service.duration}</span>
        </p>
      </div>
    </button>
  );
}
