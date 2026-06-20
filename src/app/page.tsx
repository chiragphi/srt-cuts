"use client";

/**
 * SRT Cuts — Homepage
 * ────────────────────────────────────────────────────────────────────────
 * Design: "Apple precision meets warm barber craftsmanship."
 *   • Near-black (#0A0A0A) canvas, cream (#F5F0E6) type, sparing gold (#D4A017).
 *   • Generous vertical rhythm, large confident hero, refined glass surfaces.
 *   • Subtle film grain + warm glows for organic, hand-crafted depth.
 *   • Scroll-triggered fades/slides (framer-motion), reduced-motion respected.
 *
 * The dark theme is scoped to this page via the `.srt-dark` wrapper + the
 * overrides in globals.css, so /book, /auth, /admin, /bookings stay light.
 * All copy, prices, gallery, hero, about and policy content remain driven by
 * Supabase (`/api/site-content`) — nothing here is hardcoded over the data.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  ChevronDown,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Scissors,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import LoyaltyCard from "@/components/LoyaltyCard";
import { formatPrice } from "@/lib/services";
import {
  DEFAULT_SITE_CONTENT,
  isPlaceholderGalleryItem,
  isPlaceholderTestimonial,
  type SiteContent,
} from "@/lib/site-content";
import { useAuth } from "@/context/auth";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.75, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

// Cursor-following spotlight: writes pointer position into CSS vars the
// `.spotlight` class reads. Cheap, no re-renders.
function handleSpotlight(e: React.MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

const FAQ_ITEMS = [
  {
    q: "Do I need to put a deposit down?",
    a: "No deposits. Pay the full price at your appointment with Venmo or in store. Simple as that.",
  },
  {
    q: "How do I cancel or reschedule?",
    a: "Just text ahead. Cancellation and reschedule support is handled directly by text message.",
  },
  {
    q: "How long does a typical appointment take?",
    a: "A fade is around 45 minutes, a lineup is 20 minutes, and a full service is about 60 minutes. Exact durations are listed with each service.",
  },
  {
    q: "Is this a home-based barbershop?",
    a: "Yes — SRT Cuts is a private barbershop in Herriman, Utah. Exact location details are sent after your booking is confirmed.",
  },
  {
    q: "How does the loyalty program work?",
    a: "Book 5 accepted cuts and earn a free lineup. Your progress is tracked automatically and shown when you log in.",
  },
  {
    q: "Can I refer friends?",
    a: "Refer a friend and get $5 off your next cut. Mention the referral when booking or by text.",
  },
];

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/site-content")
      .then((r) => r.json())
      .catch(() => null)
      .then((siteData) => {
        if (siteData?.content) setContent(siteData.content);
      })
      .finally(() => {
        setFadeOut(true);
        setTimeout(() => setLoading(false), 500);
      });
  }, []);

  const publicGallery = content.gallery.filter((item) => !isPlaceholderGalleryItem(item));
  const publicTestimonials = content.testimonials.filter((item) => !isPlaceholderTestimonial(item));
  const hasSocialLinks = Boolean(content.instagramUrl || content.tiktokUrl);
  const heroImage = content.heroImageUrl || "/srt-logo.png";

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <MotionConfig reducedMotion="user">
      {/* ── Loading screen ── */}
      {loading && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0a] transition-opacity duration-500"
          style={{ opacity: fadeOut ? 0 : 1, pointerEvents: fadeOut ? "none" : "auto" }}
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative h-16 w-16">
              <Image src="/srt-logo.png" alt="SRT Cuts" fill className="object-contain rounded-2xl" />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-[#f5f0e6]">SRT Cuts</p>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-[#d4a017]"
                  style={{ animation: `srt-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
          <style>{`
            @keyframes srt-bounce {
              0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
              40% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* ── Gallery lightbox ── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-5 right-5 text-white/80 hover:text-white"
            onClick={() => setLightboxSrc(null)}
            aria-label="Close image"
          >
            <X size={28} />
          </button>
          <div
            className="relative max-w-2xl w-full aspect-[4/5] rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={lightboxSrc} alt="Gallery" fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
          </div>
        </div>
      )}

      <Navigation />
      <div className="mobile-page-pad">

        {/* ── Hero ── */}
        <section className="relative min-h-[calc(100svh-28px)] sm:min-h-screen flex flex-col justify-center overflow-hidden px-0 pt-24 pb-32 sm:pb-16">
          <div className="hero-glow absolute inset-0 pointer-events-none" />
          <div className="hero-orbit hidden sm:block w-80 h-80 -right-24 top-28" />
          <div className="hero-orbit hidden sm:block w-44 h-44 left-10 bottom-24" />

          <motion.div
            className="app-shell relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.1 } },
            }}
          >
            <motion.div className="text-left" variants={fadeUp} custom={0}>
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] py-2 pl-2 pr-4 shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d4a017]/15 text-[#e8b84b]">
                  <Sparkles size={18} />
                </span>
                <div>
                  <p className="mobile-section-label">Herriman, Utah</p>
                  <p className="text-sm text-[#8c857a]">Private barber booking</p>
                </div>
              </div>
              <motion.h1
                className="headline-gradient font-semibold leading-none mb-5"
                style={{ fontSize: "clamp(52px, 10.5vw, 132px)", letterSpacing: "-0.035em" }}
                initial={{ opacity: 0, y: 18, filter: "blur(16px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.05, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                SRT Cuts.
              </motion.h1>
              <p className="text-lg sm:text-2xl mb-8 max-w-2xl leading-relaxed text-[#cfc8ba]">
                Precision fades, clean edges, and a booking experience that feels effortless from the first tap.
              </p>
              <div className="mobile-cta sm:justify-start">
                <Link href="/book" className="btn-gold">
                  Book Appointment
                  <ArrowRight size={18} />
                </Link>
                <a
                  href="#services"
                  className="btn-outline"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  View Services
                </a>
              </div>

              {/* Contact quick links */}
              <div className="flex flex-wrap gap-3 mt-6">
                {content.instagramUrl && (
                  <a
                    href={content.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8c857a] hover:text-[#e8b84b] transition-colors"
                  >
                    <Scissors size={14} /> Instagram
                  </a>
                )}
                {content.tiktokUrl && (
                  <a
                    href={content.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8c857a] hover:text-[#e8b84b] transition-colors"
                  >
                    <Scissors size={14} /> TikTok
                  </a>
                )}
              </div>
            </motion.div>

            <motion.div className="hero-panel relative p-4 sm:p-7" variants={fadeUp} custom={1}>
              <div className="absolute right-4 top-4 sm:right-6 sm:top-6 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-[#e8b84b] shadow-[0_10px_24px_rgba(0,0,0,0.4)]">
                {todayLabel}
              </div>
              <div className="relative flex flex-col justify-end">
                <div className="mb-4 sm:mb-6 flex justify-center pt-8 sm:pt-0">
                  <div className="photo-blend relative flex h-24 w-24 sm:h-40 sm:w-40 items-center justify-center overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] bg-white/[0.05] border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
                    <Image
                      src={heroImage}
                      alt="SRT"
                      fill
                      sizes="(min-width: 640px) 160px, 96px"
                      className="rounded-[1.5rem] sm:rounded-[2rem] object-cover"
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:gap-3">
                  {[
                    { icon: CalendarCheck, title: "Choose a service", text: "Fades, lineups, full service." },
                    { icon: Clock3, title: "Pick a time", text: "Clean slots with SMS confirmation." },
                    { icon: MapPin, title: "Arrive ready", text: "Location details sent after approval." },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.title}
                        className="flex items-center gap-3 rounded-2xl sm:rounded-3xl border border-white/[0.07] bg-white/[0.04] p-3 sm:p-4 shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
                        variants={fadeUp}
                        custom={i + 2}
                      >
                        <span className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-[#d4a017]/15 text-[#e8b84b]">
                          <Icon size={16} className="sm:hidden" />
                          <Icon size={19} className="hidden sm:block" />
                        </span>
                        <div>
                          <p className="text-sm sm:text-base font-semibold text-[#f5f0e6]">{item.title}</p>
                          <p className="text-xs sm:text-sm text-[#8c857a]">{item.text}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Loyalty Card (logged in) ── */}
        {!authLoading && user && (
          <section className="pb-2 pt-2">
            <div className="app-shell">
              <LoyaltyCard dark />
            </div>
          </section>
        )}

        {/* ── Trust strip ── */}
        <section className="py-10 sm:py-16 lg:py-20">
          <div className="flex gap-3 overflow-x-auto px-5 pb-1 sm:px-0 sm:overflow-visible sm:grid sm:grid-cols-3 sm:gap-4 app-shell-sm">
            {["No waiting around", "Text before you arrive", "Always on time"].map((item) => (
              <div key={item} className="shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-4 text-sm font-semibold leading-tight text-[#cfc8ba] shadow-[0_10px_24px_rgba(0,0,0,0.35)] sm:shrink">
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* ── Services ── */}
        <section id="services" className="app-section">
          <div className="app-shell">
            <SectionHeader eyebrow="What we offer" title="Services that feel precise before the cut starts" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.serviceConfigs.map((s, i) => {
                const isPopular = s.name === "Full Service";
                return (
                  <motion.div
                    key={s.name}
                    className="app-card service-card spotlight p-5 sm:p-6 flex flex-col gap-5 relative"
                    onMouseMove={handleSpotlight}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    custom={i + 1}
                    whileHover={{ y: -5, transition: { type: "spring", stiffness: 320, damping: 22 } }}
                    whileTap={{ scale: 0.985 }}
                  >
                    {isPopular && (
                      <span className="inline-flex items-center gap-1 self-start rounded-full bg-[#d4a017] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1c1402]">
                        <Star size={9} fill="currentColor" /> Most Popular
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold tracking-widest uppercase text-[#e8b84b]">
                          {s.name}
                        </p>
                        <p className="text-sm mt-3 leading-relaxed text-[#8c857a]">
                          {s.desc}
                        </p>
                      </div>
                      <span className="text-3xl font-semibold tracking-tight text-[#f5f0e6]">{formatPrice(s.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                      <span className="rounded-full bg-[#d4a017]/15 px-3 py-1.5 text-sm font-semibold text-[#e8b84b]">{s.duration}</span>
                      <span className="text-sm text-[#8c857a]">{s.detail}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Book CTA under services */}
            <div className="mt-10 text-center">
              <Link href="/book" className="btn-gold inline-flex">
                Book an Appointment
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Gallery ── */}
        {publicGallery.length > 0 && (
          <section id="gallery" className="app-section border-t border-white/[0.07]">
            <div className="app-shell">
              <SectionHeader eyebrow="Proof" title="Recent work, framed cleanly" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {publicGallery.map((item, i) => (
                  <motion.article
                    key={`${item.title}-${i}`}
                    className="app-card spotlight cursor-pointer group"
                    onMouseMove={handleSpotlight}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    custom={i}
                    onClick={() => setLightboxSrc(item.imageUrl)}
                    whileHover={{ y: -5, transition: { type: "spring", stiffness: 320, damping: 22 } }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <GalleryImage src={item.imageUrl} alt={item.title} />
                    <div className="p-5">
                      <h3 className="font-semibold text-[#f5f0e6] group-hover:text-[#e8b84b] transition-colors">{item.title}</h3>
                      <p className="text-sm mt-2 leading-relaxed text-[#8c857a]">{item.caption}</p>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Barber profile ── */}
        <section className="app-section border-t border-white/[0.07]">
          <div className="app-shell grid lg:grid-cols-[0.8fr_1.2fr] gap-7 sm:gap-10 items-center">
            <div className="photo-blend relative aspect-[4/5] sm:aspect-square max-w-sm mx-auto lg:mx-0 app-card bg-white/[0.04]">
              <Image src={content.barberPhotoUrl || "/srt-logo.png"} alt={content.barberName} fill sizes="400px" className="object-cover" />
            </div>
            <div>
              <p className="app-chip mb-4">The barber</p>
              <h2 className="app-title font-semibold text-[#f5f0e6] mb-5">
                {content.barberName}
              </h2>
              <p className="text-lg leading-relaxed max-w-2xl text-[#cfc8ba]">{content.barberBio}</p>
              <div className="flex flex-wrap gap-2 mt-6">
                {content.specialties.map((s) => (
                  <span key={s} className="rounded-full border border-[#d4a017]/30 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[#e8b84b]">{s}</span>
                ))}
              </div>

              {/* SMS / Contact CTA */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/book" className="btn-gold min-h-0 py-3 px-5 text-sm">
                  Book Now <ArrowRight size={15} />
                </Link>
                {content.instagramUrl && (
                  <a
                    href={content.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline min-h-0 py-3 px-5 text-sm inline-flex items-center gap-2"
                  >
                    <MessageCircle size={15} /> Follow
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        {publicTestimonials.length > 0 && (
          <section className="app-section border-t border-white/[0.07]">
            <div className="app-shell">
              <SectionHeader eyebrow="Reviews" title="What clients say" />
              <div className="grid gap-4 md:grid-cols-3">
                {publicTestimonials.map((t, i) => (
                  <motion.div key={`${t.name}-${i}`} className="app-card p-5 sm:p-6" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}>
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} size={14} className="text-[#e8b84b]" fill="currentColor" />
                      ))}
                    </div>
                    <p className="text-lg leading-relaxed text-[#f5f0e6]">&ldquo;{t.quote}&rdquo;</p>
                    <p className="text-sm font-semibold mt-5 text-[#e8b84b]">{t.name}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── FAQ ── */}
        <section id="faq" className="app-section border-t border-white/[0.07]">
          <div className="app-shell">
            <SectionHeader eyebrow="Got questions" title="Everything you need to know" />
            <div className="max-w-2xl mx-auto space-y-2">
              {FAQ_ITEMS.map((item, i) => (
                <motion.div
                  key={i}
                  className="app-card"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                >
                  <button
                    className="w-full text-left flex items-center justify-between gap-4 p-5"
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    aria-expanded={expandedFaq === i}
                  >
                    <span className="font-semibold text-[#f5f0e6] text-base">{item.q}</span>
                    <motion.span
                      className="shrink-0 text-[#e8b84b]"
                      animate={{ rotate: expandedFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <ChevronDown size={18} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {expandedFaq === i && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="px-5 pb-5">
                          <p className="text-[#cfc8ba] leading-relaxed">{item.a}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Info grid ── */}
        <section className="app-section border-t border-white/[0.07]">
          <div className="app-shell grid md:grid-cols-2 gap-4 sm:gap-5">
            <InfoBlock
              title="Location"
              body={content.address}
              detail={content.parkingNote}
              href={content.mapUrl}
              action="Open map"
              external
            />
            <InfoBlock title="Rewards" body={content.loyaltyOffer} detail={content.referralOffer} href="/book" action="Book now" />
            <InfoBlock title="Booking Policy" body="No deposits. Pay the full price with Venmo or in store." detail={content.cancellationPolicy} href="/book" action="Start booking" />
            {hasSocialLinks && (
              <InfoBlock
                title="Stay Connected"
                body="Follow the latest cuts and openings."
                detail="Fresh work, schedule updates, and quick announcements."
                href={(content.instagramUrl || content.tiktokUrl) as string}
                action={content.instagramUrl ? "Instagram" : "TikTok"}
                external
              />
            )}
          </div>
        </section>

        {/* ── Contact bar ── */}
        <section className="py-10 border-t border-white/[0.07]">
          <div className="app-shell">
            <div className="app-card p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5">
              <div>
                <p className="font-semibold text-xl text-[#f5f0e6] mb-1">Ready for a fresh cut?</p>
                <p className="text-[#cfc8ba]">Book your appointment in under a minute.</p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <Link href="/book" className="btn-gold whitespace-nowrap">
                  Book Now <ArrowRight size={16} />
                </Link>
                {content.instagramUrl && (
                  <a
                    href={content.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <Phone size={15} /> Follow us
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="py-10 border-t border-white/[0.07]">
          <div className="app-shell">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <Image src="/srt-logo.png" alt="SRT Cuts" width={28} height={28} className="object-contain rounded-lg" />
                  <span className="font-semibold text-[#f5f0e6]">SRT Cuts</span>
                </div>
                <p className="text-sm text-[#8c857a] max-w-xs">Precision barbering in Herriman, Utah. Private studio, clean cuts, easy booking.</p>
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
                <Link href="/" className="text-[#8c857a] hover:text-[#f5f0e6] transition-colors">Home</Link>
                <Link href="/#services" className="text-[#8c857a] hover:text-[#f5f0e6] transition-colors">Services</Link>
                <Link href="/book" className="text-[#8c857a] hover:text-[#f5f0e6] transition-colors">Book</Link>
                <Link href="/#faq" className="text-[#8c857a] hover:text-[#f5f0e6] transition-colors">FAQ</Link>
                <Link href="/bookings" className="text-[#8c857a] hover:text-[#f5f0e6] transition-colors">My Bookings</Link>
                {content.instagramUrl && (
                  <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[#8c857a] hover:text-[#f5f0e6] transition-colors">Instagram</a>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-white/[0.07]">
              <p className="text-sm text-[#8c857a]">© {new Date().getFullYear()} SRT Cuts · Herriman, Utah</p>
              <Link href="/book" className="inline-flex items-center gap-1 text-sm font-semibold text-[#e8b84b] hover:text-[#f5f0e6] transition-colors">
                Book an appointment <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}

function GalleryImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (errored) {
    return (
      <div className="relative aspect-[4/5] bg-white/[0.04] flex items-center justify-center transition-opacity duration-300">
        <span className="text-[#8c857a] text-sm font-medium">Photo coming soon</span>
      </div>
    );
  }

  return (
    <div className="photo-blend relative aspect-[4/5] bg-white/[0.04]">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 768px) 33vw, 100vw"
        className="gallery-zoom object-cover"
        style={{ opacity: loaded ? 1 : 0 }}
        unoptimized
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div className="mb-8 sm:mb-12" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={0}>
      <p className="app-chip mb-4">{eyebrow}</p>
      <h2 className="app-title max-w-3xl font-semibold text-[#f5f0e6]">{title}</h2>
    </motion.div>
  );
}

function InfoBlock({
  title, body, detail, href, action, external,
}: {
  title: string; body: string; detail: string; href: string; action: string; external?: boolean;
}) {
  const linkProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <div className="app-card spotlight p-6" onMouseMove={handleSpotlight}>
      <h3 className="font-semibold text-xl mb-3 text-[#f5f0e6]">{title}</h3>
      <p className="text-base leading-relaxed text-[#cfc8ba]">{body}</p>
      <p className="text-sm mt-3 leading-relaxed text-[#8c857a]">{detail}</p>
      {external ? (
        <a
          href={href}
          {...linkProps}
          className="inline-flex items-center gap-1 mt-6 text-sm font-semibold text-[#e8b84b] hover:text-[#f5f0e6] transition-colors"
        >
          {action} <ArrowRight size={15} />
        </a>
      ) : (
        <Link href={href} className="inline-flex items-center gap-1 mt-6 text-sm font-semibold text-[#e8b84b] hover:text-[#f5f0e6] transition-colors">
          {action} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
