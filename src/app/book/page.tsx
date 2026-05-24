"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import CalendarPicker from "@/components/CalendarPicker";
import { formatPrice } from "@/lib/services";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { TIME_SLOTS } from "@/lib/schedule";

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
  const [paymentMethod, setPaymentMethod] = useState<"in_store" | "online">("in_store");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

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

  useEffect(() => {
    fetch("/api/site-content")
      .then((r) => r.json())
      .then((d) => setContent(d.content ?? DEFAULT_SITE_CONTENT))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.get("payment") === "success") setDone(true);
  }, []);

  async function submit() {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service, date, time, notes, paymentMethod }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Something went wrong.");
      return;
    }
    const d = await res.json();
    if (d.paymentUrl) {
      window.location.href = d.paymentUrl;
      return;
    }
    setDone(true);
  }

  const services = content.serviceConfigs;
  const canNext1 = !!service;
  const selectedDow = date ? String(new Date(date + "T00:00:00").getDay()) : null;
  const availableTimes = selectedDow ? (content.weeklyAvailability[selectedDow] ?? []) : [];
  const canNext2 = !!date && !!time && availableTimes.includes(time);
  const selectedService = services.find((s) => s.name === service);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-6 h-6 rounded-full border-2 border-[#7657ff]/30 border-t-[#7657ff] animate-spin"
        />
      </div>
    );
  }

  if (done) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center mobile-page-pad">
          <motion.div
            className="app-shell text-center max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="w-20 h-20 rounded-[2rem] mx-auto mb-7 flex items-center justify-center text-3xl text-[#4d35d8]"
              style={{ background: "rgba(239,234,255,0.9)", border: "1px solid rgba(118,87,255,0.16)" }}
            >
              ✓
            </div>
            <h1
              className="font-semibold text-[#17151f] mb-4"
              style={{ fontSize: 36, letterSpacing: "-0.03em" }}
            >
              Booking requested
            </h1>
            <p className="text-base font-light mb-8" style={{ color: "#6f6a7c" }}>
              You&apos;ll get a text confirmation once it&apos;s approved.
              <br />
              Check your phone for updates and save the appointment once confirmed.
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
      <div className="min-h-screen pt-24 pb-28 sm:pb-16 booking-page-pad">
        <div className="app-shell max-w-full sm:max-w-lg">
          <motion.div
            className="mb-7"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="mobile-section-label mb-3">Book</p>
            <h1
              className="app-title font-semibold text-[#17151f] mb-2"
            >
              {step === 1 ? "Choose a service" : step === 2 ? "Pick a time" : "Confirm"}
            </h1>
            <p className="text-sm" style={{ color: "#6f6a7c" }}>
              Step {step} of 3{user ? ` · Hi ${user.name.split(" ")[0]}` : ""}
            </p>
          </motion.div>

          <div className="grid grid-cols-3 gap-2 mb-7">
            {["Cut", "Time", "Confirm"].map((label, i) => {
              const s = i + 1;
              return (
                <div key={label} className="min-w-0">
                  <div
                    className="h-1 rounded-full transition-all duration-500"
                    style={{
                      background: s <= step ? "#7657ff" : "rgba(66,56,104,0.1)",
                    }}
                  />
                  <p className="mt-2 text-[11px] font-semibold" style={{ color: s <= step ? "#4d35d8" : "#6f6a7c" }}>{label}</p>
                </div>
              );
            })}
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
                {services.map((s) => (
                  <button
                    key={s.name}
                    className="w-full text-left app-card service-card p-4"
                    style={{
                      background: service === s.name ? "rgba(239,234,255,0.9)" : "rgba(255,255,255,0.76)",
                      borderColor: service === s.name ? "rgba(118,87,255,0.35)" : "rgba(66,56,104,0.1)",
                      boxShadow: service === s.name ? "0 16px 36px rgba(96,72,231,0.14)" : "0 10px 30px rgba(52,43,94,0.08)",
                    }}
                    onClick={() => setService(s.name)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#17151f] text-base">{s.name}</p>
                        <p className="text-sm mt-0.5" style={{ color: "#6f6a7c" }}>{s.desc}</p>
                        <p className="text-xs mt-2" style={{ color: "#7c748c" }}>
                          {s.duration} · {s.detail}
                        </p>
                      </div>
                      <span
                        className="text-lg font-semibold shrink-0"
                        style={{ color: "#4d35d8" }}
                      >
                        {formatPrice(s.amount)}
                      </span>
                    </div>
                  </button>
                ))}

                <div className="pt-4 desktop-only">
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
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs text-[#6f6a7c] mb-3 tracking-wide uppercase font-bold">
                    Date
                  </label>
                  <CalendarPicker
                    value={date}
                    onChange={(d) => { setDate(d); setTime(""); }}
                    blockedDates={content.scheduleBlocks.map((b) => b.date)}
                    minDate={getMinDate()}
                    weeklyAvailability={content.weeklyAvailability}
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#6f6a7c] mb-3 tracking-wide uppercase font-bold">
                    Time
                  </label>
                  {!date ? (
                    <p className="text-sm text-[#9c90b8]">Select a date above to see available times.</p>
                  ) : availableTimes.length === 0 ? (
                    <p className="text-sm text-[#9c90b8]">No availability set for this day. Try another date.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 min-[390px]:grid-cols-3 gap-2">
                        {availableTimes.map((t) => (
                          <button
                            key={t}
                            className="min-h-12 px-3 rounded-lg text-sm transition-all duration-150 border"
                            style={{
                              background: time === t ? "rgba(239,234,255,0.95)" : "rgba(255,255,255,0.72)",
                              borderColor: time === t ? "rgba(118,87,255,0.36)" : "rgba(66,56,104,0.1)",
                              color: time === t ? "#4d35d8" : "#5d566e",
                            }}
                            onClick={() => setTime(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs mt-3" style={{ color: "#6f6a7c" }}>
                        Final confirmation comes by SMS after review.
                      </p>
                    </>
                  )}
                </div>

                <div className="hidden sm:grid grid-cols-2 gap-3 pt-2">
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
                <div className="app-card p-5 space-y-4">
                  {[
                    { label: "Service", value: service },
                    { label: "Duration", value: selectedService?.duration ?? "Appointment" },
                    { label: "Price", value: selectedService ? formatPrice(selectedService.amount) : "TBD" },
                    {
                      label: "Date",
                      value: new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "long", month: "long", day: "numeric",
                      }),
                    },
                    { label: "Time", value: time },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center gap-4">
                      <span className="text-sm" style={{ color: "#6f6a7c" }}>{row.label}</span>
                      <span className="text-sm font-semibold text-[#17151f] text-right">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs text-[#6f6a7c] mb-2 tracking-wide uppercase font-bold">
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

                <div>
                  <label className="block text-xs text-[#6f6a7c] mb-3 tracking-wide uppercase font-bold">
                    Payment
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { id: "in_store", title: "Pay in store", desc: "Pay the full price at your appointment." },
                      { id: "online", title: "Pay with Venmo", desc: "Book now, then send the full price on Venmo." },
                    ].map((option) => (
                      <button
                        key={option.id}
                        className="text-left app-card p-4 transition-all duration-200"
                        style={{
                          background: paymentMethod === option.id ? "rgba(239,234,255,0.95)" : "rgba(255,255,255,0.72)",
                          borderColor: paymentMethod === option.id ? "rgba(118,87,255,0.36)" : "rgba(66,56,104,0.1)",
                        }}
                        onClick={() => setPaymentMethod(option.id as "in_store" | "online")}
                      >
                        <p className="text-[#17151f] font-semibold">{option.title}</p>
                        <p className="text-sm mt-1" style={{ color: "#6f6a7c" }}>{option.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="app-card p-5 space-y-3">
                  <p className="text-sm text-[#2b2638]">No deposits. Choose Venmo full payment or pay the full price in store.</p>
                  <p className="text-sm" style={{ color: "#6f6a7c" }}>{content.cancellationPolicy}</p>
                  <p className="text-sm" style={{ color: "#6f6a7c" }}>{content.reminderPolicy}</p>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="hidden sm:grid grid-cols-2 gap-3 pt-1">
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

                <p className="text-xs text-center" style={{ color: "#6f6a7c" }}>
                  You&apos;ll receive a text once confirmed. Cancel and reschedule support is handled by text.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="mobile-only mobile-booking-actions">
        <div className="grid grid-cols-2 gap-2 rounded-[1.4rem] border p-2 backdrop-blur-xl">
          {step > 1 ? (
            <button className="btn-ghost min-h-12 text-sm" onClick={() => setStep(step === 3 ? 2 : 1)}>
              Back
            </button>
          ) : (
            <Link href="/" className="btn-ghost min-h-12 text-sm">
              Home
            </Link>
          )}
          {step === 1 && (
            <button className="btn-primary min-h-12 text-sm" disabled={!canNext1} onClick={() => setStep(2)}>
              Continue
            </button>
          )}
          {step === 2 && (
            <button className="btn-primary min-h-12 text-sm" disabled={!canNext2} onClick={() => setStep(3)}>
              Continue
            </button>
          )}
          {step === 3 && (
            <button className="btn-primary min-h-12 text-sm" disabled={submitting} onClick={submit}>
              {submitting ? "Booking..." : "Confirm"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
