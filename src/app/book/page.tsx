"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Navigation from "@/components/Navigation";

const SERVICES = [
  { name: "Fade", price: "$30", desc: "Skin or taper fade" },
  { name: "Haircut", price: "$25", desc: "Precision cut" },
  { name: "Lineup", price: "$15", desc: "Edge up & lines" },
  { name: "Full Service", price: "$40", desc: "Cut + lineup" },
  { name: "Kids Cut", price: "$20", desc: "12 & under" },
];

const TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM",
];

function getMinDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function BookPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.replace("/auth?redirect=/book");
        } else {
          setUser(d.user);
          setLoading(false);
        }
      });
  }, [router]);

  async function submit() {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service, date, time, notes }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Something went wrong.");
      return;
    }
    setDone(true);
  }

  const canNext1 = !!service;
  const canNext2 = !!date && !!time;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"
        />
      </div>
    );
  }

  if (done) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-black flex items-center justify-center px-6">
          <motion.div
            className="text-center max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="w-20 h-20 rounded-full mx-auto mb-8 flex items-center justify-center text-3xl"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}
            >
              ✓
            </div>
            <h1
              className="font-semibold text-white mb-4"
              style={{ fontSize: 36, letterSpacing: "-0.03em" }}
            >
              Booking requested
            </h1>
            <p className="text-base font-light mb-8" style={{ color: "#86868B" }}>
              You'll get a text confirmation once it's approved.
              <br />
              Check your phone for updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                className="btn-primary"
                onClick={() => { setDone(false); setStep(1); setService(""); setDate(""); setTime(""); setNotes(""); }}
              >
                Book another
              </button>
              <Link href="/" className="btn-ghost">
                Home
              </Link>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-black pt-24 pb-16 px-6">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs tracking-[0.35em] uppercase mb-3 font-light" style={{ color: "#8B5CF6" }}>
              Book
            </p>
            <h1
              className="font-semibold text-white mb-1"
              style={{ fontSize: 40, letterSpacing: "-0.03em" }}
            >
              {step === 1 ? "Choose a service" : step === 2 ? "Pick a time" : "Confirm"}
            </h1>
            <p className="text-sm" style={{ color: "#6E6E73" }}>
              Step {step} of 3{user ? ` · Hi ${user.name.split(" ")[0]}` : ""}
            </p>
          </motion.div>

          {/* Progress */}
          <div className="flex gap-1.5 mb-10">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="h-1 flex-1 rounded-full transition-all duration-500"
                style={{
                  background: s <= step ? "#8B5CF6" : "rgba(255,255,255,0.08)",
                }}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Service */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-3"
              >
                {SERVICES.map((s) => (
                  <button
                    key={s.name}
                    className="w-full text-left rounded-2xl p-5 transition-all duration-200 border"
                    style={{
                      background: service === s.name ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)",
                      borderColor: service === s.name ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.07)",
                      boxShadow: service === s.name ? "0 0 0 1px rgba(139,92,246,0.25)" : "none",
                    }}
                    onClick={() => setService(s.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white text-base">{s.name}</p>
                        <p className="text-sm mt-0.5" style={{ color: "#86868B" }}>{s.desc}</p>
                      </div>
                      <span
                        className="text-xl font-semibold ml-4"
                        style={{ color: service === s.name ? "#A78BFA" : "#6E6E73" }}
                      >
                        {s.price}
                      </span>
                    </div>
                  </button>
                ))}

                <div className="pt-4">
                  <button
                    className="btn-primary w-full"
                    disabled={!canNext1}
                    onClick={() => setStep(2)}
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Date & Time */}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs text-white/40 mb-2 tracking-wide uppercase">
                    Date
                  </label>
                  <input
                    type="date"
                    min={getMinDate()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-field"
                    style={{ colorScheme: "dark" }}
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-3 tracking-wide uppercase">
                    Time
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_SLOTS.map((t) => (
                      <button
                        key={t}
                        className="py-2.5 px-3 rounded-xl text-sm transition-all duration-150 border"
                        style={{
                          background: time === t ? "rgba(139,92,246,0.14)" : "rgba(255,255,255,0.03)",
                          borderColor: time === t ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.07)",
                          color: time === t ? "#C4B5FD" : "#86868B",
                        }}
                        onClick={() => setTime(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button className="btn-ghost flex-1" onClick={() => setStep(1)}>
                    Back
                  </button>
                  <button
                    className="btn-primary flex-1"
                    disabled={!canNext2}
                    onClick={() => setStep(3)}
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                {/* Summary card */}
                <div className="glass rounded-2xl p-6 space-y-4">
                  {[
                    { label: "Service", value: service },
                    {
                      label: "Date",
                      value: new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "long", month: "long", day: "numeric",
                      }),
                    },
                    { label: "Time", value: time },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: "#6E6E73" }}>{row.label}</span>
                      <span className="text-sm font-medium text-white">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-2 tracking-wide uppercase">
                    Notes (optional)
                  </label>
                  <textarea
                    className="input-field resize-none"
                    rows={3}
                    placeholder="Any preferences or requests…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <button className="btn-ghost flex-1" onClick={() => setStep(2)}>
                    Back
                  </button>
                  <button
                    className="btn-primary flex-1"
                    disabled={submitting}
                    onClick={submit}
                  >
                    {submitting ? "Booking…" : "Confirm Booking"}
                  </button>
                </div>

                <p className="text-xs text-center" style={{ color: "#6E6E73" }}>
                  You'll receive a text once confirmed.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
