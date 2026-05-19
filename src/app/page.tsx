"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import Navigation from "@/components/Navigation";
import { formatPrice } from "@/lib/services";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";

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

  return (
    <>
      <Navigation />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(109,40,217,0.24) 0%, rgba(0,0,0,0.78) 58%, rgba(0,0,0,0.96) 100%)",
            }}
          />

          <motion.div
            className="relative max-w-4xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xs tracking-[0.4em] uppercase mb-6 font-light" style={{ color: "#A78BFA" }}>
              Herriman, Utah
            </p>
            <h1
              className="headline-gradient font-semibold leading-none tracking-tight mb-6"
              style={{ fontSize: "clamp(64px, 10vw, 120px)", letterSpacing: "-0.04em" }}
            >
              SRT Cuts.
            </h1>
            <p className="text-xl mb-10 max-w-xl mx-auto font-light leading-relaxed" style={{ color: "#A1A1AA" }}>
              Precision fades, clean edges, verified booking, text confirmations, and a cut you can actually plan around.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/book" className="btn-primary text-base px-8 py-4">
                Book Appointment
              </Link>
              <a href="#gallery" className="btn-ghost text-base px-8 py-4">
                See The Work
              </a>
            </div>
          </motion.div>

          <div className="absolute bottom-8 left-6 right-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto text-left">
            {["SMS confirmations", "Admin-managed availability", "Cancellation and reschedule support"].map((item) => (
              <div key={item} className="glass rounded-xl px-4 py-3 text-sm text-white/70">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="py-28 px-6">
          <div className="max-w-6xl mx-auto">
            <SectionHeader eyebrow="What we offer" title="Services" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {content.serviceConfigs.map((s, i) => (
                <motion.div
                  key={s.name}
                  className="glass rounded-2xl p-7 flex flex-col gap-4"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i + 1}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "#8B5CF6" }}>
                        {s.name}
                      </p>
                      <p className="text-sm mt-2 leading-relaxed" style={{ color: "#86868B" }}>
                        {s.desc}
                      </p>
                    </div>
                    <span className="text-2xl font-semibold tracking-tight text-white">{formatPrice(s.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <span className="text-sm text-white/45">{s.duration}</span>
                    <span className="text-sm text-white/55">{s.detail}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="gallery" className="py-24 px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <SectionHeader eyebrow="Proof" title="Recent Work" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {content.gallery.map((item, i) => (
                <motion.article
                  key={`${item.title}-${i}`}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                >
                  <div className="relative aspect-[4/5] bg-white/[0.03]">
                    <Image src={item.imageUrl || "/srt-logo.png"} alt={item.title} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
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

        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-center">
            <div className="relative aspect-square max-w-sm mx-auto lg:mx-0 rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]">
              <Image src={content.barberPhotoUrl || "/srt-logo.png"} alt={content.barberName} fill sizes="400px" className="object-cover" />
            </div>
            <div>
              <p className="text-xs tracking-[0.4em] uppercase mb-4 font-light" style={{ color: "#8B5CF6" }}>The barber</p>
              <h2 className="font-semibold tracking-tight text-white mb-5" style={{ fontSize: "clamp(34px, 5vw, 58px)", letterSpacing: "-0.03em" }}>
                {content.barberName}
              </h2>
              <p className="text-lg leading-relaxed max-w-2xl" style={{ color: "#A1A1AA" }}>{content.barberBio}</p>
              <div className="flex flex-wrap gap-2 mt-6">
                {content.specialties.map((s) => (
                  <span key={s} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
            {content.testimonials.map((t, i) => (
              <motion.div key={`${t.name}-${i}`} className="glass rounded-2xl p-7" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}>
                <p className="text-lg leading-relaxed text-white/85">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-sm mt-5" style={{ color: "#8B5CF6" }}>{t.name}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
            <InfoBlock title="Location" body={content.address} detail={content.parkingNote} href={content.mapUrl} action="Open map" />
            <InfoBlock title="Rewards" body={content.loyaltyOffer} detail={content.referralOffer} href="/book" action="Book now" />
            <InfoBlock title="Booking Policy" body="No deposits. Pay the full price online or in store." detail={content.cancellationPolicy} href="/book" action="Start booking" />
            <InfoBlock title="Stay Connected" body={content.instagramUrl ? "Follow the latest cuts and openings." : "Add Instagram and TikTok links in admin."} detail={content.tiktokUrl ? "Short-form cut videos are linked too." : content.googleCalendarNote} href={content.instagramUrl || "/admin"} action={content.instagramUrl ? "Instagram" : "Update admin"} />
          </div>
        </section>

        <footer className="py-12 px-6 border-t border-white/5 pb-28 sm:pb-12">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm" style={{ color: "#6E6E73" }}>© {new Date().getFullYear()} SRT Cuts · Herriman, Utah</p>
            <Link href="/book" className="text-sm hover:text-white transition-colors" style={{ color: "#8B5CF6" }}>Book an appointment →</Link>
          </div>
        </footer>
      </motion.div>
    </>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div className="text-center mb-14" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={0}>
      <p className="text-xs tracking-[0.4em] uppercase mb-4 font-light" style={{ color: "#8B5CF6" }}>{eyebrow}</p>
      <h2 className="font-semibold tracking-tight text-white" style={{ fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-0.03em" }}>{title}</h2>
    </motion.div>
  );
}

function InfoBlock({ title, body, detail, href, action }: { title: string; body: string; detail: string; href: string; action: string }) {
  return (
    <div className="glass rounded-2xl p-7">
      <h3 className="text-white font-semibold text-xl mb-3">{title}</h3>
      <p className="text-base leading-relaxed" style={{ color: "#A1A1AA" }}>{body}</p>
      <p className="text-sm mt-3 leading-relaxed" style={{ color: "#6E6E73" }}>{detail}</p>
      <Link href={href} className="inline-flex mt-6 text-sm text-purple-300 hover:text-white transition-colors">
        {action} →
      </Link>
    </div>
  );
}
