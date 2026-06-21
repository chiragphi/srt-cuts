"use client";

/**
 * SRT Cuts — Homepage · "Dusk in the Pines"
 * ────────────────────────────────────────────────────────────────────────
 * A one-chair grooming room hidden where the pavement gives way to pine.
 *   • Deep evergreen canvas, warm bone serif type, amber light through trees.
 *   • Asymmetric editorial layout with generous negative space.
 *   • Ridge-line treeline dividers, scroll reveals, organic photo masks.
 *   • Ambient fog / embers / fireflies + sound toggle live in the layout.
 *
 * All copy, prices, gallery, hero, about and policy content remain driven by
 * Supabase (`/api/site-content`) — nothing here is hardcoded over the data.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  MessageCircle,
  Phone,
  Scissors,
  Star,
  X,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import LoyaltyCard from "@/components/LoyaltyCard";
import TreelineDivider from "@/components/TreelineDivider";
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
    transition: { duration: 0.85, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

// Cursor-following light pool: writes pointer position into CSS vars the
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

// Truthful descriptors (not invented review counts) for the hero trio.
const HERO_STATS = [
  { value: "One chair", label: "all yours" },
  { value: "No deposits", label: "pay at the chair" },
  { value: "By text", label: "confirmed fast" },
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
        setTimeout(() => setLoading(false), 600);
      });
  }, []);

  const publicGallery = content.gallery.filter((item) => !isPlaceholderGalleryItem(item));
  const publicTestimonials = content.testimonials.filter((item) => !isPlaceholderTestimonial(item));
  const hasSocialLinks = Boolean(content.instagramUrl || content.tiktokUrl);
  const heroImage = content.heroImageUrl || "/srt-logo.png";

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  // Asymmetric gallery layout (12-col), cycling spans + offsets like the
  // editorial reference, but driven by however many real photos exist.
  const gallerySpans = [
    { span: 5, mt: 0 },
    { span: 4, mt: 48 },
    { span: 3, mt: 0 },
    { span: 4, mt: 0 },
    { span: 5, mt: -32 },
    { span: 3, mt: 0 },
  ];

  return (
    <MotionConfig reducedMotion="user">
      {/* ── Sunrise-through-the-trees intro ── */}
      {loading && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0f0b] transition-opacity duration-[600ms]"
          style={{ opacity: fadeOut ? 0 : 1, pointerEvents: fadeOut ? "none" : "auto" }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(60% 50% at 50% 60%, rgba(224,164,88,0.22), rgba(224,164,88,0) 70%)" }}
          />
          <div className="relative flex flex-col items-center text-center">
            <div
              className="mb-6 h-9 w-9 rounded-full border-2 border-[rgba(224,164,88,0.25)] border-t-[#e0a458]"
              style={{ animation: "srt-spin 0.9s linear infinite" }}
            />
            <p className="font-display text-[13px] uppercase tracking-[0.5em] text-[#cbb389]">
              Dusk in the pines
            </p>
          </div>
          <style>{`@keyframes srt-spin { to { transform: rotate(360deg); } }`}</style>
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
      <div className="mobile-page-pad forest-content">

        {/* ── Hero ── */}
        <section id="top" className="relative min-h-[calc(100svh-28px)] sm:min-h-screen flex flex-col justify-center overflow-hidden px-0 pt-24 pb-28 sm:pb-16">
          <div className="hero-glow absolute inset-0 pointer-events-none" />

          <motion.div
            className="app-shell relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          >
            {/* text column */}
            <motion.div className="text-left" variants={fadeUp} custom={0}>
              <div className="mb-6 flex items-center gap-3">
                <span className="h-px w-10" style={{ background: "linear-gradient(90deg,#e0a458,transparent)" }} />
                <span className="text-[11px] sm:text-xs uppercase tracking-[0.28em] text-[#9aab93]">
                  Herriman, Utah · A grooming room in the trees
                </span>
              </div>

              <motion.h1
                className="headline-gradient leading-[0.86] mb-6"
                initial={{ opacity: 0, y: 18, filter: "blur(16px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.05, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="block" style={{ fontSize: "clamp(54px, 9vw, 116px)", fontWeight: 300 }}>The cut</span>
                <span className="display-accent block" style={{ fontSize: "clamp(54px, 9vw, 116px)", fontWeight: 600 }}>
                  that finds you
                </span>
              </motion.h1>

              <p className="text-base sm:text-lg mb-8 max-w-md leading-relaxed text-[#b8c4b1]" style={{ textWrap: "pretty" }}>
                Precision fades, clean lineups, and a booking experience that feels effortless — a private chair where the pavement gives way to pine.
              </p>

              <div className="mobile-cta sm:justify-start">
                <Link href="/book" className="btn-gold">
                  Reserve a chair
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
                  See the menu
                </a>
              </div>

              {/* truthful trio */}
              <div className="flex gap-8 sm:gap-10 mt-9">
                {HERO_STATS.map((s) => (
                  <div key={s.value}>
                    <div className="font-display text-xl sm:text-2xl text-[#e6c690]">{s.value}</div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[#7d8c79] mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* social quick links */}
              {hasSocialLinks && (
                <div className="flex flex-wrap gap-4 mt-7">
                  {content.instagramUrl && (
                    <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7d8c79] hover:text-[#e0a458] transition-colors">
                      <Scissors size={14} /> Instagram
                    </a>
                  )}
                  {content.tiktokUrl && (
                    <a href={content.tiktokUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7d8c79] hover:text-[#e0a458] transition-colors">
                      <Scissors size={14} /> TikTok
                    </a>
                  )}
                </div>
              )}
            </motion.div>

            {/* photo column — organic arched mask */}
            <motion.div className="relative flex items-center" variants={fadeUp} custom={1}>
              <div className="relative w-full max-w-sm mx-auto lg:mx-0 lg:ml-auto">
                <div
                  className="absolute -inset-3 pointer-events-none"
                  style={{
                    borderRadius: "220px 220px 28px 28px",
                    background: "radial-gradient(60% 50% at 50% 30%, rgba(224,164,88,0.22), rgba(224,164,88,0) 70%)",
                    filter: "blur(8px)",
                  }}
                />
                <div
                  className="photo-blend relative w-full overflow-hidden"
                  style={{
                    aspectRatio: "4 / 5",
                    borderRadius: "200px 200px 24px 24px",
                    boxShadow: "0 40px 90px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(224,164,88,0.18)",
                  }}
                >
                  <Image src={heroImage} alt="SRT Cuts" fill sizes="(min-width: 1024px) 384px, 90vw" className="object-cover" />
                </div>
                <div className="absolute left-1/2 bottom-4 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap rounded-full border border-[rgba(224,164,88,0.3)] bg-[rgba(10,16,11,0.72)] px-4 py-2 backdrop-blur-md">
                  <span className="h-[7px] w-[7px] rounded-full bg-[#7ec98a]" style={{ boxShadow: "0 0 8px #7ec98a" }} />
                  <span className="text-xs tracking-[0.08em] text-[#dfe6d8]">{todayLabel} · booking open</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* scroll cue */}
          <div className="app-shell mt-10 sm:mt-14 flex justify-center">
            <div className="flex flex-col items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#7d8c79]">
              <span>Scroll into the woods</span>
              <span className="h-10 w-px" style={{ background: "linear-gradient(180deg,#7d8c79,transparent)" }} />
            </div>
          </div>
        </section>

        {/* ── Loyalty Card (logged in) ── */}
        {!authLoading && user && (
          <section className="pb-2 pt-2">
            <div className="app-shell">
              <LoyaltyCard dark />
            </div>
          </section>
        )}

        <TreelineDivider />

        {/* ── Services ── */}
        <section id="services" className="app-section">
          <div className="app-shell">
            <motion.div
              className="flex items-end justify-between flex-wrap gap-5 mb-10 sm:mb-14"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <div>
                <p className="eyebrow mb-3.5">— The menu</p>
                <h2 className="app-title max-w-2xl">
                  Rituals, not <span className="display-accent">transactions</span>
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-[#9aab93]">
                Every visit is one chair, no rush, and a clean finish. Take the long way.
              </p>
            </motion.div>

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
                    whileHover={{ y: -6, transition: { type: "spring", stiffness: 320, damping: 22 } }}
                    whileTap={{ scale: 0.985 }}
                  >
                    {isPopular && (
                      <span className="inline-flex items-center gap-1 self-start rounded-full bg-[#e0a458] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0c130e]">
                        <Star size={9} fill="currentColor" /> Most Loved
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-2xl text-[#f1ece0]">{s.name}</p>
                        <p className="text-sm mt-3 leading-relaxed text-[#9aab93]">{s.desc}</p>
                      </div>
                      <span className="font-display text-2xl shrink-0 text-[#e0a458]">{formatPrice(s.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[rgba(120,150,110,0.16)] pt-4">
                      <span className="rounded-full bg-[rgba(224,164,88,0.12)] px-3 py-1.5 text-sm font-semibold text-[#e0a458]">{s.duration}</span>
                      <span className="text-sm text-[#7d8c79]">{s.detail}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-10 text-center">
              <Link href="/book" className="btn-gold inline-flex">
                Reserve a chair
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <TreelineDivider />

        {/* ── Gallery ── */}
        {publicGallery.length > 0 && (
          <section id="gallery" className="app-section">
            <div className="app-shell">
              <SectionHeader eyebrow="— From the chair" title={<>Work, <span className="display-accent">grown out loud</span></>} />
              <div className="grid grid-cols-2 md:grid-cols-12 gap-4">
                {publicGallery.map((item, i) => {
                  const layout = gallerySpans[i % gallerySpans.length];
                  return (
                    <motion.article
                      key={`${item.title}-${i}`}
                      className="app-card spotlight cursor-pointer group md:[grid-column:span_var(--span)]"
                      style={{ ["--span" as string]: layout.span, marginTop: layout.mt }}
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
                        <h3 className="font-display text-lg text-[#f1ece0] group-hover:text-[#e0a458] transition-colors">{item.title}</h3>
                        <p className="text-sm mt-2 leading-relaxed text-[#9aab93]">{item.caption}</p>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <TreelineDivider />

        {/* ── Barber profile ── */}
        <section className="app-section">
          <div className="app-shell grid lg:grid-cols-[0.85fr_1.15fr] gap-8 sm:gap-12 items-center">
            <motion.div
              className="relative"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <div
                className="absolute -inset-3 pointer-events-none rounded-3xl"
                style={{ background: "radial-gradient(70% 60% at 40% 30%, rgba(224,164,88,0.18), rgba(224,164,88,0) 70%)", filter: "blur(6px)" }}
              />
              <div className="photo-blend relative aspect-[4/5] sm:aspect-square max-w-sm mx-auto lg:mx-0 rounded-3xl overflow-hidden border border-[rgba(224,164,88,0.16)]">
                <Image src={content.barberPhotoUrl || "/srt-logo.png"} alt={content.barberName} fill sizes="400px" className="object-cover" />
              </div>
            </motion.div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <p className="eyebrow mb-4">— The barber</p>
              <h2 className="app-title mb-5">{content.barberName}</h2>
              <p className="text-base sm:text-lg leading-relaxed max-w-xl text-[#b8c4b1]" style={{ textWrap: "pretty" }}>
                {content.barberBio}
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                {content.specialties.map((s) => (
                  <span key={s} className="rounded-full border border-[rgba(224,164,88,0.3)] bg-[rgba(20,30,22,0.4)] px-4 py-2 text-sm font-semibold text-[#e0a458]">{s}</span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/book" className="btn-gold min-h-0 py-3 px-5 text-sm">
                  Book Now <ArrowRight size={15} />
                </Link>
                {content.instagramUrl && (
                  <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-0 py-3 px-5 text-sm inline-flex items-center gap-2">
                    <MessageCircle size={15} /> Follow
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        {publicTestimonials.length > 0 && (
          <>
            <TreelineDivider />
            <section className="app-section">
              <div className="app-shell">
                <SectionHeader eyebrow="— In their words" title={<>Worth the <span className="display-accent">drive out</span></>} />
                <div className="grid gap-4 md:grid-cols-3">
                  {publicTestimonials.map((t, i) => (
                    <motion.div key={`${t.name}-${i}`} className="app-card p-6 sm:p-7" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}>
                      <div className="font-display text-5xl leading-[0.4] text-[#e0a458] opacity-50">&ldquo;</div>
                      <p className="font-display text-lg leading-relaxed text-[#eef0e6] mt-3" style={{ fontWeight: 300, fontStyle: "italic" }}>
                        {t.quote}
                      </p>
                      <p className="text-xs uppercase tracking-[0.16em] mt-5 text-[#9aab93]">{t.name}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        <TreelineDivider />

        {/* ── FAQ ── */}
        <section id="faq" className="app-section">
          <div className="app-shell">
            <SectionHeader eyebrow="— Before you come" title={<>Everything you need <span className="display-accent">to know</span></>} />
            <div className="max-w-2xl mx-auto space-y-2">
              {FAQ_ITEMS.map((item, i) => (
                <motion.div key={i} className="app-card" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}>
                  <button
                    className="w-full text-left flex items-center justify-between gap-4 p-5"
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    aria-expanded={expandedFaq === i}
                  >
                    <span className="font-semibold text-[#f1ece0] text-base">{item.q}</span>
                    <motion.span
                      className="shrink-0 text-[#e0a458]"
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
                          <p className="text-[#b8c4b1] leading-relaxed">{item.a}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <TreelineDivider />

        {/* ── Info grid ── */}
        <section className="app-section">
          <div className="app-shell grid md:grid-cols-2 gap-4 sm:gap-5">
            <InfoBlock title="Location" body={content.address} detail={content.parkingNote} href={content.mapUrl} action="Open map" external />
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
        <section className="pb-2">
          <div className="app-shell">
            <div className="app-card p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5">
              <div>
                <p className="font-display text-2xl text-[#f1ece0] mb-1">Ready for a fresh cut?</p>
                <p className="text-[#b8c4b1]">Reserve your chair in under a minute.</p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <Link href="/book" className="btn-gold whitespace-nowrap">
                  Book Now <ArrowRight size={16} />
                </Link>
                {content.instagramUrl && (
                  <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex items-center gap-2 whitespace-nowrap">
                    <Phone size={15} /> Follow us
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="pt-16 pb-10 mt-10 border-t border-[rgba(120,150,110,0.12)]">
          <div className="app-shell">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-8">
              <div className="max-w-xs">
                <div className="flex items-baseline gap-0.5 mb-3">
                  <span className="font-display font-semibold text-2xl text-[#f1ece0]">SRT</span>
                  <span className="font-display italic font-light text-2xl text-[#e0a458]">cuts</span>
                  <span className="text-[11px] tracking-[0.2em] text-[#7d8c79] ml-1">.hair</span>
                </div>
                <p className="text-sm text-[#9aab93] leading-relaxed">
                  Precision barbering where the pavement gives way to pine. Private studio in Herriman, Utah — clean cuts, easy booking.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
                <Link href="/" className="text-[#7d8c79] hover:text-[#f1ece0] transition-colors">Home</Link>
                <Link href="/#services" className="text-[#7d8c79] hover:text-[#f1ece0] transition-colors">Services</Link>
                <Link href="/book" className="text-[#7d8c79] hover:text-[#f1ece0] transition-colors">Book</Link>
                <Link href="/#faq" className="text-[#7d8c79] hover:text-[#f1ece0] transition-colors">FAQ</Link>
                <Link href="/bookings" className="text-[#7d8c79] hover:text-[#f1ece0] transition-colors">My Bookings</Link>
                {content.instagramUrl && (
                  <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[#7d8c79] hover:text-[#f1ece0] transition-colors">Instagram</a>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-[rgba(120,150,110,0.1)]">
              <p className="text-sm text-[#7d8c79]">© {new Date().getFullYear()} SRT Cuts · Dusk in the Pines · Herriman, Utah</p>
              <Link href="/book" className="inline-flex items-center gap-1 text-sm font-semibold text-[#e0a458] hover:text-[#f1ece0] transition-colors">
                Reserve a chair <ArrowRight size={15} />
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
      <div className="relative aspect-[4/5] bg-[rgba(20,30,22,0.5)] flex items-center justify-center transition-opacity duration-300">
        <span className="text-[#7d8c79] text-sm font-medium">Photo coming soon</span>
      </div>
    );
  }

  return (
    <div className="photo-blend relative aspect-[4/5] bg-[rgba(20,30,22,0.5)]">
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

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: React.ReactNode }) {
  return (
    <motion.div className="mb-10 sm:mb-14" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={0}>
      <p className="eyebrow mb-3.5">{eyebrow}</p>
      <h2 className="app-title max-w-3xl">{title}</h2>
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
      <h3 className="font-display text-xl mb-3 text-[#f1ece0]">{title}</h3>
      <p className="text-base leading-relaxed text-[#b8c4b1]">{body}</p>
      <p className="text-sm mt-3 leading-relaxed text-[#7d8c79]">{detail}</p>
      {external ? (
        <a href={href} {...linkProps} className="inline-flex items-center gap-1 mt-6 text-sm font-semibold text-[#e0a458] hover:text-[#f1ece0] transition-colors">
          {action} <ArrowRight size={15} />
        </a>
      ) : (
        <Link href={href} className="inline-flex items-center gap-1 mt-6 text-sm font-semibold text-[#e0a458] hover:text-[#f1ece0] transition-colors">
          {action} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
