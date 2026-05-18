"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import HeroAnimation from "@/components/HeroAnimation";
import Navigation from "@/components/Navigation";

const SERVICES = [
  {
    name: "Fade",
    desc: "Skin or taper fade tailored to your structure.",
    price: "$30",
    icon: "✦",
  },
  {
    name: "Haircut",
    desc: "Classic precision cut, shaped to perfection.",
    price: "$25",
    icon: "✦",
  },
  {
    name: "Lineup",
    desc: "Clean edges, sharp lines. Instant upgrade.",
    price: "$15",
    icon: "✦",
  },
  {
    name: "Full Service",
    desc: "Cut plus lineup. The complete experience.",
    price: "$40",
    icon: "✦",
  },
  {
    name: "Kids Cut",
    desc: "For the young ones. 12 and under.",
    price: "$20",
    icon: "✦",
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: "easeOut" },
  }),
};

export default function HomePage() {
  const [animDone, setAnimDone] = useState(false);
  const [skipped] = useState(() =>
    typeof window !== "undefined" && sessionStorage.getItem("srt_seen") === "1"
  );

  useEffect(() => {
    if (skipped) setAnimDone(true);
  }, [skipped]);

  function handleAnimComplete() {
    sessionStorage.setItem("srt_seen", "1");
    setAnimDone(true);
  }

  return (
    <>
      <AnimatePresence>{!animDone && <HeroAnimation onComplete={handleAnimComplete} />}</AnimatePresence>

      <AnimatePresence>
        {animDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <Navigation />

            {/* Hero */}
            <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
              {/* Background purple glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(109,40,217,0.18) 0%, rgba(76,29,149,0.08) 50%, transparent 100%)",
                }}
              />
              {/* Subtle grid */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                  backgroundSize: "60px 60px",
                }}
              />

              <motion.div
                className="relative max-w-4xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.p
                  className="text-xs tracking-[0.4em] uppercase mb-6 font-light"
                  style={{ color: "#A78BFA" }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.8 }}
                >
                  Herriman, Utah
                </motion.p>

                <motion.h1
                  className="headline-gradient font-semibold leading-none tracking-tight mb-6"
                  style={{ fontSize: "clamp(64px, 10vw, 120px)", letterSpacing: "-0.04em" }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.9 }}
                >
                  SRT Cuts.
                </motion.h1>

                <motion.p
                  className="text-xl mb-10 max-w-lg mx-auto font-light leading-relaxed"
                  style={{ color: "#86868B", letterSpacing: "-0.01em" }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                >
                  Precision fades. Clean edges. An experience you'll come back for.
                </motion.p>

                <motion.div
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                >
                  <Link href="/book" className="btn-primary text-base px-8 py-4">
                    Book Appointment
                  </Link>
                  <a href="#services" className="btn-ghost text-base px-8 py-4">
                    View Services
                  </a>
                </motion.div>
              </motion.div>

              {/* Scroll hint */}
              <motion.div
                className="absolute bottom-10 flex flex-col items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              >
                <span className="text-xs tracking-widest uppercase text-white/20">Scroll</span>
                <motion.div
                  className="w-px h-12 bg-gradient-to-b from-white/20 to-transparent"
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            </section>

            {/* Services */}
            <section id="services" className="py-32 px-6">
              <div className="max-w-6xl mx-auto">
                <motion.div
                  className="text-center mb-16"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={0}
                >
                  <p className="text-xs tracking-[0.4em] uppercase mb-4 font-light" style={{ color: "#8B5CF6" }}>
                    What we offer
                  </p>
                  <h2
                    className="font-semibold tracking-tight text-white"
                    style={{ fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-0.03em" }}
                  >
                    Services
                  </h2>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SERVICES.map((s, i) => (
                    <motion.div
                      key={s.name}
                      className="glass rounded-2xl p-7 flex flex-col gap-3 group cursor-default"
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true }}
                      variants={fadeUp}
                      custom={i + 1}
                      whileHover={{ y: -4, transition: { duration: 0.25 } }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-medium tracking-widest uppercase"
                          style={{ color: "#8B5CF6" }}
                        >
                          {s.icon} {s.name}
                        </span>
                        <span
                          className="text-2xl font-semibold tracking-tight text-white"
                        >
                          {s.price}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: "#86868B" }}>
                        {s.desc}
                      </p>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  className="mt-12 text-center"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={6}
                >
                  <Link href="/book" className="btn-primary text-base px-8 py-4">
                    Book Now
                  </Link>
                </motion.div>
              </div>
            </section>

            {/* About strip */}
            <section className="py-24 px-6 border-t border-white/5">
              <div className="max-w-4xl mx-auto text-center">
                <motion.h2
                  className="text-white font-semibold mb-5 tracking-tight"
                  style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={0}
                >
                  Walk out different.
                </motion.h2>
                <motion.p
                  className="text-lg font-light leading-relaxed max-w-xl mx-auto"
                  style={{ color: "#86868B" }}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={1}
                >
                  SRT Cats brings precision barbering to Herriman. Every cut is intentional.
                  Every visit is an experience.
                </motion.p>
              </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/5">
              <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm" style={{ color: "#6E6E73" }}>
                  © {new Date().getFullYear()} SRT Cuts · Herriman, Utah
                </p>
                <Link
                  href="/book"
                  className="text-sm hover:text-white transition-colors"
                  style={{ color: "#8B5CF6" }}
                >
                  Book an appointment →
                </Link>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
