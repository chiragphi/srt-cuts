"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, CalendarCheck, Clock3, MapPin, Sparkles } from "lucide-react";
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
      <div className="mobile-page-pad">
        <section className="relative min-h-[calc(100svh-28px)] sm:min-h-screen flex flex-col justify-center overflow-hidden px-0 pt-24 pb-32 sm:pb-16">
          <div className="hero-glow absolute inset-0 pointer-events-none" />
          <div className="hero-orbit hidden sm:block w-80 h-80 -right-24 top-28" />
          <div className="hero-orbit hidden sm:block w-44 h-44 left-10 bottom-24" />

          <motion.div
            className="app-shell relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
          >
            <div className="text-left">
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/70 py-2 pl-2 pr-4 shadow-[0_12px_32px_rgba(52,43,94,0.08)] backdrop-blur-xl">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#efeaff] text-[#4d35d8]">
                  <Sparkles size={18} />
                </span>
                <div>
                  <p className="mobile-section-label">Herriman, Utah</p>
                  <p className="text-sm text-[#6f6a7c]">Private barber booking</p>
                </div>
              </div>
              <h1
                className="headline-gradient font-semibold leading-none mb-5"
                style={{ fontSize: "clamp(50px, 10vw, 126px)", letterSpacing: 0 }}
              >
                SRT Cuts.
              </h1>
              <p className="text-lg sm:text-2xl mb-8 max-w-2xl leading-relaxed text-[#5d566e]">
                Precision fades, clean edges, and a booking experience that feels effortless from the first tap.
              </p>
              <div className="mobile-cta sm:justify-start">
                <Link href="/book" className="btn-primary">
                  Book Appointment
                  <ArrowRight size={18} />
                </Link>
                <a href="#services" className="btn-ghost">
                  View Services
                </a>
              </div>
            </div>

            <div className="hero-panel relative min-h-[420px] p-5 sm:p-7">
              <div className="absolute right-6 top-6 rounded-full bg-white/72 px-4 py-2 text-sm font-semibold text-[#4d35d8] shadow-[0_10px_24px_rgba(52,43,94,0.1)]">
                Today&apos;s flow
              </div>
              <div className="relative flex h-full flex-col justify-end">
                <div className="mb-6 flex justify-center">
                  <div className="relative flex h-40 w-40 items-center justify-center rounded-[2rem] bg-white/80 shadow-[0_24px_70px_rgba(52,43,94,0.14)]">
                    <Image
                      src="/srt-logo.png"
                      alt="SRT"
                      width={112}
                      height={112}
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  {[
                    { icon: CalendarCheck, title: "Choose a service", text: "Fades, lineups, full service." },
                    { icon: Clock3, title: "Pick a time", text: "Clean slots with SMS confirmation." },
                    { icon: MapPin, title: "Arrive ready", text: "Location details sent after approval." },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex items-center gap-3 rounded-3xl border border-black/5 bg-white/76 p-4 shadow-[0_10px_28px_rgba(52,43,94,0.08)]">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#efeaff] text-[#4d35d8]">
                          <Icon size={19} />
                        </span>
                        <div>
                          <p className="font-semibold text-[#17151f]">{item.title}</p>
                          <p className="text-sm text-[#6f6a7c]">{item.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="app-shell relative mt-8 grid grid-cols-3 gap-2 sm:gap-3 text-left">
            {["No waiting around", "Text before you arrive", "Always on time"].map((item) => (
              <div key={item} className="rounded-2xl border border-black/5 bg-white/62 px-3 py-3 text-[11px] font-semibold leading-tight text-[#6f6a7c] shadow-[0_10px_24px_rgba(52,43,94,0.06)] sm:px-4 sm:text-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="app-section">
          <div className="app-shell">
            <SectionHeader eyebrow="What we offer" title="Services that feel precise before the cut starts" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.serviceConfigs.map((s, i) => (
                <motion.div
                  key={s.name}
                  className="app-card service-card p-5 sm:p-6 flex flex-col gap-5"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i + 1}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold tracking-widest uppercase text-[#4d35d8]">
                        {s.name}
                      </p>
                      <p className="text-sm mt-3 leading-relaxed text-[#6f6a7c]">
                        {s.desc}
                      </p>
                    </div>
                    <span className="text-3xl font-semibold tracking-tight text-[#17151f]">{formatPrice(s.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-4">
                    <span className="rounded-full bg-[#efeaff] px-3 py-1.5 text-sm font-semibold text-[#4d35d8]">{s.duration}</span>
                    <span className="text-sm text-[#6f6a7c]">{s.detail}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {publicGallery.length > 0 && (
          <section id="gallery" className="app-section border-t border-black/5">
            <div className="app-shell">
              <SectionHeader eyebrow="Proof" title="Recent work, framed cleanly" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    <div className="relative aspect-[4/5] bg-[#f0ecff]">
                      <Image src={item.imageUrl} alt={item.title} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-[#17151f]">{item.title}</h3>
                      <p className="text-sm mt-2 leading-relaxed text-[#6f6a7c]">{item.caption}</p>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="app-section border-t border-black/5">
          <div className="app-shell grid lg:grid-cols-[0.8fr_1.2fr] gap-7 sm:gap-10 items-center">
            <div className="relative aspect-[4/5] sm:aspect-square max-w-sm mx-auto lg:mx-0 app-card bg-[#efeaff]">
              <Image src={content.barberPhotoUrl || "/srt-logo.png"} alt={content.barberName} fill sizes="400px" className="object-cover" />
            </div>
            <div>
              <p className="app-chip mb-4">The barber</p>
              <h2 className="app-title font-semibold text-[#17151f] mb-5">
                {content.barberName}
              </h2>
              <p className="text-lg leading-relaxed max-w-2xl text-[#5d566e]">{content.barberBio}</p>
              <div className="flex flex-wrap gap-2 mt-6">
                {content.specialties.map((s) => (
                  <span key={s} className="rounded-full border border-[#dcd3ff] bg-white/72 px-4 py-2 text-sm font-semibold text-[#4d35d8]">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {publicTestimonials.length > 0 && (
          <section className="app-section border-t border-black/5">
            <div className="app-shell grid gap-4 md:grid-cols-3">
              {publicTestimonials.map((t, i) => (
                <motion.div key={`${t.name}-${i}`} className="app-card p-5 sm:p-6" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}>
                  <p className="text-lg leading-relaxed text-[#2b2638]">&ldquo;{t.quote}&rdquo;</p>
                  <p className="text-sm font-semibold mt-5 text-[#4d35d8]">{t.name}</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <section className="app-section border-t border-black/5">
          <div className="app-shell grid md:grid-cols-2 gap-4 sm:gap-5">
            <InfoBlock title="Location" body={content.address} detail={content.parkingNote} href={content.mapUrl} action="Open map" />
            <InfoBlock title="Rewards" body={content.loyaltyOffer} detail={content.referralOffer} href="/book" action="Book now" />
            <InfoBlock title="Booking Policy" body="No deposits. Pay the full price with Venmo or in store." detail={content.cancellationPolicy} href="/book" action="Start booking" />
            {hasSocialLinks && (
              <InfoBlock title="Stay Connected" body="Follow the latest cuts and openings." detail="Fresh work, schedule updates, and quick announcements." href={content.instagramUrl || content.tiktokUrl} action={content.instagramUrl ? "Instagram" : "TikTok"} />
            )}
          </div>
        </section>

        <footer className="py-10 border-t border-black/5">
          <div className="app-shell flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[#6f6a7c]">© {new Date().getFullYear()} SRT Cuts · Herriman, Utah</p>
            <Link href="/book" className="inline-flex items-center gap-1 text-sm font-semibold text-[#4d35d8] hover:text-[#17151f] transition-colors">
              Book an appointment <ArrowRight size={15} />
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div className="mb-8 sm:mb-12" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={0}>
      <p className="app-chip mb-4">{eyebrow}</p>
      <h2 className="app-title max-w-3xl font-semibold text-[#17151f]">{title}</h2>
    </motion.div>
  );
}

function InfoBlock({ title, body, detail, href, action }: { title: string; body: string; detail: string; href: string; action: string }) {
  return (
    <div className="app-card p-6">
      <h3 className="font-semibold text-xl mb-3 text-[#17151f]">{title}</h3>
      <p className="text-base leading-relaxed text-[#5d566e]">{body}</p>
      <p className="text-sm mt-3 leading-relaxed text-[#6f6a7c]">{detail}</p>
      <Link href={href} className="inline-flex items-center gap-1 mt-6 text-sm font-semibold text-[#4d35d8] hover:text-[#17151f] transition-colors">
        {action} <ArrowRight size={15} />
              </Link>
    </div>
  );
}
