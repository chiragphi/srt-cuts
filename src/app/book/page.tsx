"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CalendarPlus, CheckCircle2, Copy, Gift, Zap } from "lucide-react";
import Navigation from "@/components/Navigation";
import CalendarPicker from "@/components/CalendarPicker";
import LoyaltyCard from "@/components/LoyaltyCard";
import { formatPrice } from "@/lib/services";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/Toast";
import { Suspense } from "react";

function getMinDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function buildGoogleCalendarUrl(service: string, date: string, time: string) {
  const base = new Date(`${date}T${convertTo24h(time)}`);
  const end = new Date(base.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `SRT Cuts — ${service}`,
    dates: `${fmt(base)}/${fmt(end)}`,
    details: "Appointment at SRT Cuts in Herriman, Utah.",
    location: "Herriman, Utah",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function convertTo24h(time: string) {
  const [raw, period] = time.split(" ");
  const [h, m] = raw.split(":").map(Number);
  const hours = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
  return `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function BookPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"in_store" | "online">("in_store");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [copied, setCopied] = useState(false);

  const minDate = useMemo(() => getMinDate(), []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth?redirect=/book");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetch("/api/site-content")
      .then((r) => r.json())
      .then((d) => setContent(d.content ?? DEFAULT_SITE_CONTENT))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get("payment") === "success") setDone(true);
  }, [searchParams]);

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, date, time, notes, paymentMethod }),
      });
      if (!res.ok) {
        const d = await res.json();
        const msg = d.error || "Something went wrong.";
        setError(msg);
        toast(msg, "error");
        return;
      }
      const d = await res.json();
      if (d.paymentUrl) {
        window.location.href = d.paymentUrl;
        return;
      }
      setDone(true);
      toast("Booking requested! You'll get a text once confirmed.", "success");
    } catch {
      const msg = "Network error. Please check your connection and try again.";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, action: () => void) {
    if (e.key === "Enter") action();
  }

  function copyBookingInfo() {
    const text = `${service} at SRT Cuts\n${new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    })} at ${time}\nHerriman, Utah`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast("Appointment details copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function selectNextAvailable() {
    const today = new Date();
    for (let i = 1; i <= 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      const dow = String(d.getDay());
      const blocked = content.scheduleBlocks.some((b) => b.date === iso);
      if (blocked) continue;
      const slots =
        iso in content.dateAvailability
          ? content.dateAvailability[iso]
          : content.weeklyAvailability[dow] ?? [];
      if (slots.length > 0) {
        setDate(iso);
        setTime(slots[0]);
        toast(`Next available: ${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${slots[0]}`, "success");
        return;
      }
    }
    toast("No available slots found in the next 60 days.", "info");
  }

  const services = content.serviceConfigs;
  const canNext1 = !!service;
  const selectedDow = date ? String(new Date(date + "T00:00:00").getDay()) : null;
  const availableTimes = date
    ? date in content.dateAvailability
      ? content.dateAvailability[date]
      : selectedDow
      ? (content.weeklyAvailability[selectedDow] ?? [])
      : []
    : [];
  const canNext2 = !!date && !!time && availableTimes.includes(time);
  const selectedService = services.find((s) => s.name === service);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-[#e8b84b] animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (done) {
    const displayDate = date
      ? new Date(date + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric",
        })
      : "";
    const calUrl = date && time && service ? buildGoogleCalendarUrl(service, date, time) : null;

    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center mobile-page-pad px-5">
          <motion.div
            className="app-shell max-w-md w-full text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="w-20 h-20 rounded-[2rem] mx-auto mb-7 flex items-center justify-center text-3xl text-[#e8b84b]"
              style={{ background: "rgba(212,160,23,0.14)", border: "1px solid rgba(212,160,23,0.3)" }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h1
              className="font-semibold text-[#f5f0e6] mb-4"
              style={{ fontSize: 36, letterSpacing: "-0.03em" }}
            >
              Booking requested
            </h1>
            <p className="text-base font-light mb-6" style={{ color: "#8c857a" }}>
              You&apos;ll get a text confirmation once it&apos;s approved.
              <br />
              Check your phone for updates.
            </p>

            {/* Booking summary */}
            {service && date && time && (
              <div className="app-card p-5 mb-6 text-left space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#8c857a]">Service</span>
                  <span className="text-sm font-semibold text-[#f5f0e6]">{service}</span>
                </div>
                {selectedService && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#8c857a]">Price</span>
                    <span className="text-sm font-semibold text-[#f5f0e6]">{formatPrice(selectedService.amount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#8c857a]">Date</span>
                  <span className="text-sm font-semibold text-[#f5f0e6]">{displayDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#8c857a]">Time</span>
                  <span className="text-sm font-semibold text-[#f5f0e6]">{time}</span>
                </div>
              </div>
            )}

            {/* Referral promo */}
            <div className="app-card p-4 mb-6 flex items-start gap-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8b84b]/12 text-[#e8b84b]">
                <Gift size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#f5f0e6] mb-0.5">Refer a friend, get $5 off</p>
                <p className="text-xs text-[#8c857a]">Share SRT Cuts with a friend. When they book, you both save.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {calUrl && (
                <a
                  href={calUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost inline-flex items-center gap-2"
                >
                  <CalendarPlus size={16} /> Add to Calendar
                </a>
              )}
              <button
                onClick={copyBookingInfo}
                className="btn-ghost inline-flex items-center gap-2"
              >
                <Copy size={15} /> {copied ? "Copied!" : "Copy details"}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-3">
              <button
                className="btn-primary"
                onClick={() => {
                  setDone(false);
                  setStep(1);
                  setService("");
                  setDate("");
                  setTime("");
                  setNotes("");
                  setReferralCode("");
                }}
              >
                Book another
              </button>
              <Link href="/bookings" className="btn-ghost">
                My bookings
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
          <LoyaltyCard className="mb-6" />

          <motion.div
            className="mb-7"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="mobile-section-label mb-3">Book</p>
            <h1 className="app-title font-semibold text-[#f5f0e6] mb-2">
              {step === 1 ? "Choose a service" : step === 2 ? "Pick a time" : "Confirm"}
            </h1>
            <p className="text-sm" style={{ color: "#8c857a" }}>
              Step {step} of 3{user ? ` · Hi ${user.name.split(" ")[0]}` : ""}
            </p>
          </motion.div>

          {/* Progress bar */}
          <div className="grid grid-cols-3 gap-2 mb-7">
            {["Cut", "Time", "Confirm"].map((label, i) => {
              const s = i + 1;
              return (
                <div key={label} className="min-w-0">
                  <div
                    className="h-1 rounded-full transition-all duration-500"
                    style={{ background: s <= step ? "#e8b84b" : "rgba(255,255,255,0.1)" }}
                  />
                  <p className="mt-2 text-[11px] font-semibold" style={{ color: s <= step ? "#e8b84b" : "#8c857a" }}>{label}</p>
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
                      background: service === s.name ? "rgba(212,160,23,0.14)" : "rgba(255,255,255,0.04)",
                      borderColor: service === s.name ? "rgba(212,160,23,0.45)" : "rgba(255,255,255,0.1)",
                      boxShadow: service === s.name ? "0 16px 36px rgba(212,160,23,0.16)" : "0 10px 30px rgba(0,0,0,0.45)",
                    }}
                    onClick={() => { setService(s.name); }}
                    onKeyDown={(e) => handleKeyDown(e, () => { setService(s.name); setStep(2); })}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#f5f0e6] text-base">{s.name}</p>
                        <p className="text-sm mt-0.5" style={{ color: "#8c857a" }}>{s.desc}</p>
                        <p className="text-xs mt-2" style={{ color: "#8c857a" }}>
                          {s.duration} · {s.detail}
                        </p>
                      </div>
                      <span className="text-lg font-semibold shrink-0" style={{ color: "#e8b84b" }}>
                        {formatPrice(s.amount)}
                      </span>
                    </div>
                  </button>
                ))}

                <div className="pt-4 desktop-only">
                  <button className="btn-primary w-full" disabled={!canNext1} onClick={() => setStep(2)}>
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
                {/* Next available quick-select */}
                <button
                  className="w-full flex items-center gap-3 app-card p-4 text-left hover:border-[rgba(212,160,23,0.4)] transition-colors"
                  onClick={selectNextAvailable}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8b84b]/12 text-[#e8b84b]">
                    <Zap size={16} />
                  </span>
                  <div>
                    <p className="font-semibold text-[#f5f0e6] text-sm">Next available slot</p>
                    <p className="text-xs text-[#8c857a]">Auto-select the soonest open time</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-[#8c857a] shrink-0" />
                </button>

                <div>
                  <label className="block text-xs text-[#8c857a] mb-3 tracking-wide uppercase font-bold">
                    Date
                  </label>
                  <CalendarPicker
                    value={date}
                    onChange={(d) => { setDate(d); setTime(""); }}
                    blockedDates={content.scheduleBlocks.map((b) => b.date)}
                    minDate={minDate}
                    weeklyAvailability={content.weeklyAvailability}
                    dateAvailability={content.dateAvailability}
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#8c857a] mb-3 tracking-wide uppercase font-bold">
                    Time
                  </label>
                  {!date ? (
                    <p className="text-sm text-[#8c857a]">Select a date above to see available times.</p>
                  ) : availableTimes.length === 0 ? (
                    <p className="text-sm text-[#8c857a]">No availability set for this day. Try another date or use &ldquo;Next available slot&rdquo; above.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 min-[390px]:grid-cols-3 gap-2">
                        {availableTimes.map((t) => (
                          <button
                            key={t}
                            className="min-h-12 px-3 rounded-lg text-sm transition-all duration-150 border"
                            style={{
                              background: time === t ? "rgba(212,160,23,0.16)" : "rgba(255,255,255,0.04)",
                              borderColor: time === t ? "rgba(212,160,23,0.45)" : "rgba(255,255,255,0.1)",
                              color: time === t ? "#e8b84b" : "#cfc8ba",
                            }}
                            onClick={() => setTime(t)}
                            onKeyDown={(e) => handleKeyDown(e, () => { setTime(t); setStep(3); })}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs mt-3" style={{ color: "#8c857a" }}>
                        Final confirmation comes by SMS after review.
                      </p>
                    </>
                  )}
                </div>

                <div className="hidden sm:grid grid-cols-2 gap-3 pt-2">
                  <button className="btn-ghost flex-1" onClick={() => setStep(1)}>Back</button>
                  <button className="btn-primary flex-1" disabled={!canNext2} onClick={() => setStep(3)}>Continue</button>
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
                      <span className="text-sm" style={{ color: "#8c857a" }}>{row.label}</span>
                      <span className="text-sm font-semibold text-[#f5f0e6] text-right">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs text-[#8c857a] mb-2 tracking-wide uppercase font-bold">
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
                  <label className="block text-xs text-[#8c857a] mb-2 tracking-wide uppercase font-bold">
                    Referral Code (optional)
                  </label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Enter a referral code if you have one"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#8c857a] mb-3 tracking-wide uppercase font-bold">
                    Payment
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { id: "in_store", title: "Pay in store", desc: "Pay the full price at your appointment with cash or Venmo." },
                      { id: "online", title: "Pay with Venmo", desc: "Send payment on Venmo right after booking." },
                    ].map((option) => (
                      <button
                        key={option.id}
                        className="text-left app-card p-4 transition-all duration-200"
                        style={{
                          background: paymentMethod === option.id ? "rgba(212,160,23,0.16)" : "rgba(255,255,255,0.04)",
                          borderColor: paymentMethod === option.id ? "rgba(212,160,23,0.45)" : "rgba(255,255,255,0.1)",
                        }}
                        onClick={() => setPaymentMethod(option.id as "in_store" | "online")}
                      >
                        <p className="text-[#f5f0e6] font-semibold">{option.title}</p>
                        <p className="text-sm mt-1" style={{ color: "#8c857a" }}>{option.desc}</p>
                        {option.id === "online" && content.venmoUrl && (
                          <p className="text-xs mt-1.5 font-semibold text-[#e8b84b]">
                            {content.venmoUrl.replace("https://venmo.com/", "@")}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="app-card p-5 space-y-3">
                  <p className="text-sm text-[#f5f0e6]">No deposits. Choose Venmo full payment or pay in store.</p>
                  <p className="text-sm" style={{ color: "#8c857a" }}>{content.cancellationPolicy}</p>
                  <p className="text-sm" style={{ color: "#8c857a" }}>{content.reminderPolicy}</p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <div className="hidden sm:grid grid-cols-2 gap-3 pt-1">
                  <button className="btn-ghost flex-1" onClick={() => setStep(2)}>Back</button>
                  <button className="btn-primary flex-1" disabled={submitting} onClick={submit}>
                    {submitting ? "Booking…" : "Confirm Booking"}
                  </button>
                </div>

                <p className="text-xs text-center" style={{ color: "#8c857a" }}>
                  You&apos;ll receive a text once confirmed. Cancel and reschedule by text.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile bottom action bar */}
      <div className="mobile-only mobile-booking-actions">
        <div className="grid grid-cols-2 gap-2 rounded-[1.4rem] border p-2 backdrop-blur-xl">
          {step > 1 ? (
            <button className="btn-ghost min-h-12 text-sm" onClick={() => setStep(step === 3 ? 2 : 1)}>
              Back
            </button>
          ) : (
            <Link href="/" className="btn-ghost min-h-12 text-sm inline-flex items-center justify-center">
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

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-[#e8b84b] animate-spin" />
      </div>
    }>
      <BookPageInner />
    </Suspense>
  );
}
