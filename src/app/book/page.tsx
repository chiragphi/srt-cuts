"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, CalendarPlus, Check, Copy, Gift, Zap } from "lucide-react";
import Navigation from "@/components/Navigation";
import CalendarPicker from "@/components/CalendarPicker";
import LoyaltyCard from "@/components/LoyaltyCard";
import { formatPrice } from "@/lib/services";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/Toast";

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

const STEPS = ["Cut", "Time", "Confirm"];

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
  const [done, setDone] = useState(() => searchParams.get("payment") === "success");
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
      toast("Booking requested. You'll get a text once it's confirmed.", "success");
    } catch {
      const msg = "Network error. Check your connection and try again.";
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
      weekday: "long",
      month: "long",
      day: "numeric",
    })} at ${time}\nHerriman, Utah`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast("Appointment details copied.", "success");
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
      const slots = iso in content.dateAvailability ? content.dateAvailability[iso] : content.weeklyAvailability[dow] ?? [];
      if (slots.length > 0) {
        setDate(iso);
        setTime(slots[0]);
        toast(
          `Next open: ${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${slots[0]}`,
          "success"
        );
        return;
      }
    }
    toast("No open slots in the next 60 days.", "info");
  }

  const services = content.serviceConfigs;
  const canNext1 = !!service;
  const selectedDow = date ? String(new Date(date + "T00:00:00").getDay()) : null;
  const availableTimes = date
    ? date in content.dateAvailability
      ? content.dateAvailability[date]
      : selectedDow
      ? content.weeklyAvailability[selectedDow] ?? []
      : []
    : [];
  const canNext2 = !!date && !!time && availableTimes.includes(time);
  const selectedService = services.find((s) => s.name === service);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="spin h-6 w-6 rounded-full border-2 border-[var(--line-strong)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!user) return null;

  // ── Confirmation payoff ──────────────────────────────────────────
  if (done) {
    const displayDate = date
      ? new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : "";
    const calUrl = date && time && service ? buildGoogleCalendarUrl(service, date, time) : null;

    return (
      <>
        <Navigation />
        <div className="flex min-h-screen items-center justify-center px-5 pb-24 pt-24">
          <motion.div
            className="w-full max-w-md text-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-[6px] bg-[var(--accent)] text-[#1a0c05]"
              initial={{ scale: 0.7, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            >
              <Check size={30} strokeWidth={3} />
            </motion.div>

            <p className="idx mb-4">[ BOOKING REQUESTED ]</p>
            <h1 className="display display--lg">
              You&apos;re on <span className="hot">the list.</span>
            </h1>
            <p className="mt-4 text-[var(--mute)]">A text confirmation lands once it&apos;s approved. Keep your phone close.</p>

            {service && date && time && (
              <div className="panel-fill mt-7 p-5 text-left">
                <SummaryRow label="Service" value={service} />
                {selectedService && <SummaryRow label="Price" value={formatPrice(selectedService.amount)} />}
                <SummaryRow label="Date" value={displayDate} />
                <SummaryRow label="Time" value={time} last />
              </div>
            )}

            <div className="panel-fill mt-4 flex items-start gap-3 p-4 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-[var(--accent)]/14 text-[var(--accent-deep)]">
                <Gift size={16} />
              </span>
              <div>
                <p className="font-display text-lg uppercase leading-none">Refer a friend, get $5 off</p>
                <p className="mt-1.5 text-xs text-[var(--mute)]">Share SRT Cuts. When they book, you both save.</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {calUrl && (
                <a href={calUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
                  <CalendarPlus size={16} /> Add to calendar
                </a>
              )}
              <button onClick={copyBookingInfo} className="btn btn--ghost">
                <Copy size={15} /> {copied ? "Copied" : "Copy details"}
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                className="btn btn--accent"
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
              <Link href="/bookings" className="btn btn--ink">
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
      <div className="has-tabbar min-h-screen px-5 pb-28 pt-24 sm:pb-16">
        <div className="mx-auto w-full max-w-xl">
          <LoyaltyCard className="mb-6" />

          <div className="mb-7">
            <p className="idx mb-3">[ RESERVE / STEP {step} OF 3 ]</p>
            <h1 className="display display--lg">
              {step === 1 ? "Choose your cut" : step === 2 ? "Pick a time" : "Lock it in"}
            </h1>
            {user && <p className="mt-2 text-sm text-[var(--mute)]">Hey {user.name.split(" ")[0]} — almost there.</p>}
          </div>

          {/* Progress */}
          <div className="mb-8 grid grid-cols-3 gap-2">
            {STEPS.map((label, i) => {
              const s = i + 1;
              return (
                <div key={label}>
                  <div
                    className="h-1 rounded-full transition-colors duration-500"
                    style={{ background: s <= step ? "var(--accent)" : "var(--line-strong)" }}
                  />
                  <p
                    className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: s <= step ? "var(--accent-deep)" : "var(--mute)" }}
                  >
                    {String(s).padStart(2, "0")} {label}
                  </p>
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1 — Service */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3"
              >
                {services.map((s) => {
                  const active = service === s.name;
                  return (
                    <button
                      key={s.name}
                      onClick={() => setService(s.name)}
                      onKeyDown={(e) => handleKeyDown(e, () => { setService(s.name); setStep(2); })}
                      className="flex w-full items-center gap-4 rounded-[4px] border p-4 text-left transition-colors"
                      style={{
                        borderColor: active ? "var(--accent)" : "var(--line-strong)",
                        background: active ? "rgba(255,74,28,0.07)" : "transparent",
                      }}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                        style={{ borderColor: active ? "var(--accent)" : "var(--line-strong)", background: active ? "var(--accent)" : "transparent" }}
                      >
                        {active && <Check size={12} strokeWidth={3} className="text-[#1a0c05]" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-xl uppercase leading-none">{s.name}</p>
                        <p className="mt-1.5 text-sm text-[var(--mute)]">{s.desc}</p>
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--mute)]">{s.duration}</p>
                      </div>
                      <span className="spec shrink-0 text-lg text-[var(--accent-deep)]">{formatPrice(s.amount)}</span>
                    </button>
                  );
                })}
                <div className="pt-3">
                  <button className="btn btn--accent btn--block" disabled={!canNext1} onClick={() => setStep(2)}>
                    Continue <ArrowUpRight size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2 — Date & Time */}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
                <button
                  onClick={selectNextAvailable}
                  className="flex w-full items-center gap-3 rounded-[4px] border border-[var(--line-strong)] p-4 text-left transition-colors hover:border-[var(--accent)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-[var(--accent)] text-[#1a0c05]">
                    <Zap size={16} fill="currentColor" />
                  </span>
                  <div className="flex-1">
                    <p className="font-display text-lg uppercase leading-none">Next open slot</p>
                    <p className="mt-1 text-xs text-[var(--mute)]">Auto-pick the soonest time</p>
                  </div>
                  <ArrowUpRight size={16} strokeWidth={2.5} className="text-[var(--mute)]" />
                </button>

                <div>
                  <label className="field-label">Date</label>
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
                  <label className="field-label">Time</label>
                  {!date ? (
                    <p className="text-sm text-[var(--mute)]">Pick a date to see open times.</p>
                  ) : availableTimes.length === 0 ? (
                    <p className="text-sm text-[var(--mute)]">
                      No times set for this day. Try another date or tap &ldquo;Next open slot&rdquo; above.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {availableTimes.map((t) => {
                          const active = time === t;
                          return (
                            <button
                              key={t}
                              onClick={() => setTime(t)}
                              onKeyDown={(e) => handleKeyDown(e, () => { setTime(t); setStep(3); })}
                              className="min-h-12 rounded-[4px] border px-2 font-mono text-sm font-bold transition-colors"
                              style={{
                                borderColor: active ? "var(--accent)" : "var(--line-strong)",
                                background: active ? "var(--accent)" : "transparent",
                                color: active ? "#1a0c05" : "var(--ink)",
                              }}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--mute)]">
                        Final confirmation comes by SMS after review.
                      </p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button className="btn btn--ghost" onClick={() => setStep(1)}>Back</button>
                  <button className="btn btn--accent" disabled={!canNext2} onClick={() => setStep(3)}>Continue</button>
                </div>
              </motion.div>
            )}

            {/* Step 3 — Confirm */}
            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
                <div className="panel-fill p-5">
                  <SummaryRow label="Service" value={service} />
                  <SummaryRow label="Duration" value={selectedService?.duration ?? "Appointment"} />
                  <SummaryRow label="Price" value={selectedService ? formatPrice(selectedService.amount) : "TBD"} />
                  <SummaryRow
                    label="Date"
                    value={new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  />
                  <SummaryRow label="Time" value={time} last />
                </div>

                <div>
                  <label className="field-label">Notes (optional)</label>
                  <textarea
                    className="field resize-none"
                    rows={3}
                    placeholder="Any preferences or requests…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Referral code (optional)</label>
                  <input
                    className="field"
                    type="text"
                    placeholder="Enter a referral code if you have one"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Payment</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { id: "in_store", title: "Pay in store", desc: "Full price at your appointment — cash or Venmo." },
                      { id: "online", title: "Pay with Venmo", desc: "Send payment on Venmo right after booking." },
                    ].map((option) => {
                      const active = paymentMethod === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setPaymentMethod(option.id as "in_store" | "online")}
                          className="rounded-[4px] border p-4 text-left transition-colors"
                          style={{
                            borderColor: active ? "var(--accent)" : "var(--line-strong)",
                            background: active ? "rgba(255,74,28,0.07)" : "transparent",
                          }}
                        >
                          <p className="font-display text-lg uppercase leading-none">{option.title}</p>
                          <p className="mt-1.5 text-sm text-[var(--mute)]">{option.desc}</p>
                          {option.id === "online" && content.venmoUrl && (
                            <p className="spec mt-1.5 text-xs text-[var(--accent-deep)]">
                              {content.venmoUrl.replace("https://venmo.com/", "@")}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="panel-fill space-y-2 p-5">
                  <p className="text-sm">No deposits. Choose Venmo full payment or pay in store.</p>
                  <p className="text-sm text-[var(--mute)]">{content.cancellationPolicy}</p>
                  <p className="text-sm text-[var(--mute)]">{content.reminderPolicy}</p>
                </div>

                {error && (
                  <div className="rounded-[4px] border border-[var(--accent)] bg-[rgba(255,74,28,0.08)] p-4">
                    <p className="text-sm text-[var(--accent-deep)]">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button className="btn btn--ghost" onClick={() => setStep(2)}>Back</button>
                  <button className="btn btn--accent" disabled={submitting} onClick={submit}>
                    {submitting ? "Booking…" : "Confirm booking"}
                  </button>
                </div>

                <p className="text-center font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--mute)]">
                  You&apos;ll get a text once confirmed · Reschedule by text
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-2.5"
      style={last ? undefined : { borderBottom: "1px solid var(--line)" }}
    >
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--mute)]">{label}</span>
      <span className="spec text-right text-sm">{value}</span>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="spin h-6 w-6 rounded-full border-2 border-[var(--line-strong)] border-t-[var(--accent)]" />
        </div>
      }
    >
      <BookPageInner />
    </Suspense>
  );
}
