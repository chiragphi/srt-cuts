"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import Navigation from "@/components/Navigation";
import { formatPrice } from "@/lib/services";
import {
  DEFAULT_SITE_CONTENT,
  isPlaceholderGalleryItem,
  isPlaceholderTestimonial,
  type SiteContent,
} from "@/lib/site-content";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: "easeOut" },
  }),
};

export default function HomePage() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  useEffect(() => {
    fetch("/api/site-content")
      .then((r) => r.json())
      .then((d) => setContent(d.content ?? DEFAULT_SITE_CONTENT))
      .catch(() => {});
  }, []);

  const publicGallery = content.gallery.filter((item) => !isPlaceholderGalleryItem(item));
  const publicTestimonials = content.testimonials.filter((item) => !isPlaceholderTestimonial(item));
  const hasSocialLinks = Boolean(content.instagramUrl || content.tiktokUrl);

  return (
    <>
      <Navigation />
      <motion.div className="mobile-page-pad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
        <section className="relative min-h-[calc(100svh-28px)] sm:min-h-screen flex flex-col justify-center overflow-hidden px-0 pt-20 pb-28 sm:pb-0">
          <div className="hero-glow absolute inset-0 pointer-events-none" />

          <motion.div
            className="app-shell relative text-left sm:text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-7 flex items-center gap-3 sm:justify-center">
              <Image
                src="/srt-logo.png"
                alt="SRT"
                width={54}
                height={54}
                className="object-contain"
                style={{ filter: "drop-shadow(0 0 18px rgba(94,234,212,0.42))" }}
              />
              <div>
                <p className="mobile-section-label">Herriman, Utah</p>
                <p className="text-sm text-white/45">Private barber booking</p>
              </div>
            </div>
            <h1
              className="headline-gradient font-semibold leading-none mb-5"
              style={{ fontSize: "clamp(42px, 12vw, 118px)", letterSpacing: 0 }}
            >
              SRT Cuts.
            </h1>
            <p className="text-lg sm:text-xl mb-8 max-w-[21rem] sm:max-w-xl sm:mx-auto leading-relaxed" style={{ color: "#D1D5DB" }}>
              Precision fades. Clean edges. An experience you&apos;ll come back for.
            </p>
            <div className="mobile-cta">
              <Link href="/book" className="btn-primary">
                Book Appointment
              </Link>
              <a href="#services" className="btn-ghost">
                View Services
              </a>
            </div>
          </motion.div>

          <div className="app-shell absolute bottom-4 sm:bottom-6 left-0 right-0 grid grid-cols-3 gap-2 sm:gap-3 text-left">
            {["No waiting around", "Text before you arrive", "Always on time"].map((item) => (
              <div key={item} className="border-t border-white/15 pt-3 text-[11px] leading-tight text-white/65 sm:px-4 sm:py-3 sm:text-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="app-section">
          <div className="app-shell">
            <SectionHeader eyebrow="What we offer" title="Services" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {content.serviceConfigs.map((s, i) => (
                <motion.div
                  key={s.name}
                  className="app-card service-card p-4 sm:p-6 flex flex-col gap-4"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i + 1}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "#5EEAD4" }}>
                        {s.name}
                      </p>
                      <p className="text-sm mt-2 leading-relaxed" style={{ color: "#86868B" }}>
                        {s.desc}
                      </p>
                    </div>
                    <span className="text-2xl font-semibold tracking-tight text-white">{formatPrice(s.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-4">
                    <span className="text-sm text-white/45">{s.duration}</span>
                    <span className="text-sm text-white/55">{s.detail}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {publicGallery.length > 0 && (
          <section id="gallery" className="app-section border-t border-white/5">
            <div className="app-shell">
              <SectionHeader eyebrow="Proof" title="Recent Work" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {publicGallery.map((item, i) => (
                  <motion.article
                    key={`${item.title}-${i}`}
                    className="app-card"
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    custom={i}
                  >
                    <div className="relative aspect-[4/5] bg-white/[0.03]">
                      <Image src={item.imageUrl} alt={item.title} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
                    </div>
                    <div className="p-5">
                      <h3 className="text-white font-medium">{item.title}</h3>
                      <p className="text-sm mt-2 leading-relaxed" style={{ color: "#86868B" }}>{item.caption}</p>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="app-section border-t border-white/5">
          <div className="app-shell grid lg:grid-cols-[0.8fr_1.2fr] gap-7 sm:gap-10 items-center">
            <div className="relative aspect-[4/5] sm:aspect-square max-w-sm mx-auto lg:mx-0 app-card">
              <Image src={content.barberPhotoUrl || "/srt-logo.png"} alt={content.barberName} fill sizes="400px" className="object-cover" />
            </div>
            <div>
              <p className="app-chip mb-4">The barber</p>
              <h2 className="app-title font-semibold text-white mb-5">
                {content.barberName}
              </h2>
              <p className="text-lg leading-relaxed max-w-2xl" style={{ color: "#A1A1AA" }}>{content.barberBio}</p>
              <div className="flex flex-wrap gap-2 mt-6">
                {content.specialties.map((s) => (
                  <span key={s} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {publicTestimonials.length > 0 && (
          <section className="app-section border-t border-white/5">
            <div className="app-shell grid gap-3 md:grid-cols-3">
              {publicTestimonials.map((t, i) => (
                <motion.div key={`${t.name}-${i}`} className="app-card p-5 sm:p-6" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}>
                  <p className="text-lg leading-relaxed text-white/85">&ldquo;{t.quote}&rdquo;</p>
                  <p className="text-sm mt-5" style={{ color: "#5EEAD4" }}>{t.name}</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <section className="app-section border-t border-white/5">
          <div className="app-shell grid md:grid-cols-2 gap-3 sm:gap-5">
            <InfoBlock title="Location" body={content.address} detail={content.parkingNote} href={content.mapUrl} action="Open map" />
            <InfoBlock title="Rewards" body={content.loyaltyOffer} detail={content.referralOffer} href="/book" action="Book now" />
            <InfoBlock title="Booking Policy" body="No deposits. Pay the full price with Venmo or in store." detail={content.cancellationPolicy} href="/book" action="Start booking" />
            {hasSocialLinks && (
              <InfoBlock title="Stay Connected" body="Follow the latest cuts and openings." detail="Fresh work, schedule updates, and quick announcements." href={content.instagramUrl || content.tiktokUrl} action={content.instagramUrl ? "Instagram" : "TikTok"} />
            )}
          </div>
        </section>

        <footer className="py-10 border-t border-white/5">
          <div className="app-shell flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm" style={{ color: "#6E6E73" }}>© {new Date().getFullYear()} SRT Cuts · Herriman, Utah</p>
            <Link href="/book" className="text-sm hover:text-white transition-colors" style={{ color: "#5EEAD4" }}>Book an appointment →</Link>
          </div>
        </footer>
      </motion.div>
    </>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div className="mb-8 sm:mb-12" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={0}>
      <p className="app-chip mb-4">{eyebrow}</p>
      <h2 className="app-title font-semibold text-white">{title}</h2>
    </motion.div>
  );
}

function InfoBlock({ title, body, detail, href, action }: { title: string; body: string; detail: string; href: string; action: string }) {
  return (
    <div className="app-card p-6">
      <h3 className="text-white font-semibold text-xl mb-3">{title}</h3>
      <p className="text-base leading-relaxed" style={{ color: "#A1A1AA" }}>{body}</p>
      <p className="text-sm mt-3 leading-relaxed" style={{ color: "#6E6E73" }}>{detail}</p>
      <Link href={href} className="inline-flex mt-6 text-sm text-teal-200 hover:text-white transition-colors">
        {action} →
      </Link>
    </div>
  );
}
