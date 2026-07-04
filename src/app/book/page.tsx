"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, CalendarPlus, Check, Copy, Gift, Zap } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteCalendar from "@/components/site/SiteCalendar";
import { formatPrice, effectivePrice, hasDiscount, clampDiscount } from "@/lib/services";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/site/Toast";

function getMinDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
function convertTo24h(time: string) {
  const [raw, period] = time.split(" ");
  const [h, m] = raw.split(":").map(Number);
  const hours = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
  return `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
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

const STEPS = ["Cut", "Time", "Confirm"];
const stepAnim = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
};

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
    if (!authLoading && !user) router.replace("/auth?redirect=/book");
  }, [user, authLoading, router]);

  useEffect(() => {
    fetch("/api/site-content").then((r) => r.json()).then((d) => setContent(d.content ?? DEFAULT_SITE_CONTENT)).catch(() => {});
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

  function copyBookingInfo() {
    const text = `${service} at SRT Cuts\n${new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${time}\nHerriman, Utah`;
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
      if (content.scheduleBlocks.some((b) => b.date === iso)) continue;
      const slots = iso in content.dateAvailability ? content.dateAvailability[iso] : content.weeklyAvailability[dow] ?? [];
      if (slots.length > 0) {
        setDate(iso);
        setTime(slots[0]);
        toast(`Next open: ${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${slots[0]}`, "success");
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

  if (authLoading) return <FullSpinner />;
  if (!user) return null;

  // ── Confirmation payoff ─────────────────────────────────────────
  if (done) {
    const displayDate = date ? new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";
    const calUrl = date && time && service ? buildGoogleCalendarUrl(service, date, time) : null;
    return (
      <div className="site">
        <SiteNav />
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 20px 100px" }}>
          <motion.div style={{ width: "100%", maxWidth: 440, textAlign: "center" }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <motion.div
              style={{ margin: "0 auto 26px", display: "flex", height: 64, width: 64, alignItems: "center", justifyContent: "center", borderRadius: 20, background: "var(--c-accent)", color: "#fff" }}
              initial={{ scale: 0.7, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            >
              <Check size={30} strokeWidth={3} />
            </motion.div>
            <p className="cx-eyebrow cx-eyebrow--plain" style={{ marginBottom: 14, justifyContent: "center", display: "flex" }}>Booking requested</p>
            <h1 className="cx-display cx-display--lg">You&apos;re on <em>the list.</em></h1>
            <p className="cx-lede" style={{ marginTop: 16 }}>A text confirmation lands once it&apos;s approved. Keep your phone close.</p>

            {service && date && time && (
              <div className="cx-card" style={{ marginTop: 28, padding: "8px 22px", textAlign: "left" }}>
                <SummaryRow label="Service" value={service} />
                {selectedService && <SummaryRow label="Price" value={formatPrice(effectivePrice(selectedService))} />}
                <SummaryRow label="Date" value={displayDate} />
                <SummaryRow label="Time" value={time} last />
              </div>
            )}

            <div className="cx-card" style={{ marginTop: 16, padding: 18, display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left" }}>
              <span style={{ display: "flex", height: 38, width: 38, flex: "none", alignItems: "center", justifyContent: "center", borderRadius: 11, background: "var(--c-accent-soft)", color: "var(--c-accent-ink)" }}>
                <Gift size={17} />
              </span>
              <div>
                <p style={{ fontFamily: "var(--c-display)", fontSize: 18, fontWeight: 520 }}>Refer a friend, get $5 off</p>
                <p style={{ marginTop: 4, fontSize: 13, color: "var(--c-ink-2)" }}>Share SRT Cuts. When they book, you both save.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-center" style={{ gap: 12, marginTop: 24 }}>
              {calUrl && <a href={calUrl} target="_blank" rel="noopener noreferrer" className="cx-btn cx-btn--ghost cx-btn--sm"><CalendarPlus size={16} /> Add to calendar</a>}
              <button onClick={copyBookingInfo} className="cx-btn cx-btn--ghost cx-btn--sm"><Copy size={15} /> {copied ? "Copied" : "Copy details"}</button>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-center" style={{ gap: 12, marginTop: 12 }}>
              <button className="cx-btn cx-btn--accent cx-btn--sm" onClick={() => { setDone(false); setStep(1); setService(""); setDate(""); setTime(""); setNotes(""); setReferralCode(""); }}>Book another</button>
              <Link href="/bookings" className="cx-btn cx-btn--light cx-btn--sm">My bookings</Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="site">
      <SiteNav />
      <div className="cx-has-tabbar" style={{ minHeight: "100dvh", padding: "clamp(104px, 14vw, 150px) 20px 120px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", width: "100%" }}>
          <div style={{ marginBottom: 34 }}>
            <p className="cx-eyebrow" style={{ marginBottom: 16 }}>Reserve · Step {step} of 3</p>
            <h1 className="cx-display cx-display--lg">{step === 1 ? "Choose your cut" : step === 2 ? "Pick a time" : "Lock it in"}</h1>
            {user && <p style={{ marginTop: 10, fontSize: 15, color: "var(--c-ink-2)" }}>Hey {user.name.split(" ")[0]} — almost there.</p>}
          </div>

          {/* Progress */}
          <div className="grid grid-cols-3" style={{ gap: 10, marginBottom: 36 }}>
            {STEPS.map((label, i) => {
              const s = i + 1;
              return (
                <div key={label}>
                  <div style={{ height: 4, borderRadius: 999, background: s <= step ? "var(--c-accent)" : "var(--c-line-2)", transition: "background 0.5s var(--c-ease-out)" }} />
                  <p className="cx-num" style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: s <= step ? "var(--c-accent-ink)" : "var(--c-ink-3)" }}>
                    {String(s).padStart(2, "0")} {label}
                  </p>
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" {...stepAnim} className="space-y-3">
                {services.map((s) => {
                  const active = service === s.name;
                  return (
                    <button
                      key={s.name}
                      onClick={() => setService(s.name)}
                      className="cx-card"
                      style={{ display: "flex", width: "100%", alignItems: "center", gap: 16, padding: 18, textAlign: "left", cursor: "pointer", borderColor: active ? "var(--c-accent)" : "var(--c-line)", background: active ? "var(--c-accent-soft)" : "var(--c-surface)" }}
                    >
                      <span style={{ display: "flex", height: 22, width: 22, flex: "none", alignItems: "center", justifyContent: "center", borderRadius: "50%", border: `1.5px solid ${active ? "var(--c-accent)" : "var(--c-line-2)"}`, background: active ? "var(--c-accent)" : "transparent" }}>
                        {active && <Check size={12} strokeWidth={3} color="#fff" />}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
                          <span style={{ fontFamily: "var(--c-display)", fontSize: 21, fontWeight: 500 }}>{s.name}</span>
                          {hasDiscount(s) && <span className="cx-chip cx-chip--accent" style={{ padding: "3px 9px", fontSize: 11 }}>{clampDiscount(s.discountPercent)}% off</span>}
                        </div>
                        <p style={{ marginTop: 5, fontSize: 14, color: "var(--c-ink-2)" }}>{s.desc}</p>
                        <p style={{ marginTop: 2, fontSize: 12.5, color: "var(--c-ink-3)" }}>{s.duration}</p>
                      </div>
                      <span style={{ textAlign: "right", flex: "none" }}>
                        {hasDiscount(s) && <span style={{ display: "block", fontSize: 12.5, color: "var(--c-ink-3)", textDecoration: "line-through" }}>{formatPrice(s.amount)}</span>}
                        <span className="cx-num" style={{ fontFamily: "var(--c-display)", fontSize: 19, fontWeight: 520, color: "var(--c-accent-ink)" }}>{formatPrice(effectivePrice(s))}</span>
                      </span>
                    </button>
                  );
                })}
                <div style={{ paddingTop: 10 }}>
                  <button className="cx-btn cx-btn--accent cx-btn--block" disabled={!canNext1} onClick={() => setStep(2)}>Continue <ArrowUpRight size={16} strokeWidth={2.2} /></button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" {...stepAnim} className="space-y-5">
                <button onClick={selectNextAvailable} className="cx-card" style={{ display: "flex", width: "100%", alignItems: "center", gap: 14, padding: 18, textAlign: "left", cursor: "pointer" }}>
                  <span style={{ display: "flex", height: 40, width: 40, flex: "none", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "var(--c-accent)", color: "#fff" }}><Zap size={17} fill="currentColor" /></span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "var(--c-display)", fontSize: 18, fontWeight: 500 }}>Next open slot</p>
                    <p style={{ marginTop: 2, fontSize: 13, color: "var(--c-ink-2)" }}>Auto-pick the soonest time</p>
                  </div>
                  <ArrowUpRight size={17} strokeWidth={2.2} style={{ color: "var(--c-ink-3)" }} />
                </button>

                <div>
                  <label className="cx-label">Date</label>
                  <SiteCalendar value={date} onChange={(d) => { setDate(d); setTime(""); }} blockedDates={content.scheduleBlocks.map((b) => b.date)} minDate={minDate} weeklyAvailability={content.weeklyAvailability} dateAvailability={content.dateAvailability} />
                </div>

                <div>
                  <label className="cx-label">Time</label>
                  {!date ? (
                    <p style={{ fontSize: 14, color: "var(--c-ink-3)" }}>Pick a date to see open times.</p>
                  ) : availableTimes.length === 0 ? (
                    <p style={{ fontSize: 14, color: "var(--c-ink-3)" }}>No times set for this day. Try another date or tap &ldquo;Next open slot&rdquo; above.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3" style={{ gap: 8 }}>
                        {availableTimes.map((t) => {
                          const active = time === t;
                          return (
                            <button key={t} onClick={() => setTime(t)} className="cx-num" style={{ minHeight: 48, borderRadius: 10, border: `1px solid ${active ? "transparent" : "var(--c-line-2)"}`, background: active ? "var(--c-accent)" : "var(--c-surface)", color: active ? "#fff" : "var(--c-ink)", fontSize: 14, fontWeight: 550, cursor: "pointer" }}>{t}</button>
                          );
                        })}
                      </div>
                      <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--c-ink-3)" }}>Final confirmation comes by SMS after review.</p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2" style={{ gap: 12, paddingTop: 4 }}>
                  <button className="cx-btn cx-btn--ghost" onClick={() => setStep(1)}>Back</button>
                  <button className="cx-btn cx-btn--accent" disabled={!canNext2} onClick={() => setStep(3)}>Continue</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" {...stepAnim} className="space-y-6">
                <div className="cx-card" style={{ padding: "8px 22px" }}>
                  <SummaryRow label="Service" value={service} />
                  <SummaryRow label="Duration" value={selectedService?.duration ?? "Appointment"} />
                  <SummaryRow label="Price" value={selectedService ? formatPrice(effectivePrice(selectedService)) : "TBD"} />
                  <SummaryRow label="Date" value={new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} />
                  <SummaryRow label="Time" value={time} last />
                </div>

                <div>
                  <label className="cx-label">Notes (optional)</label>
                  <textarea className="cx-field" rows={3} placeholder="Any preferences or requests…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div>
                  <label className="cx-label">Referral code (optional)</label>
                  <input className="cx-field" type="text" placeholder="Enter a referral code if you have one" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
                </div>

                <div>
                  <label className="cx-label">Payment</label>
                  <div className="grid" style={{ gap: 12 }}>
                    {[
                      { id: "in_store", title: "Pay in store", desc: "Full price at your appointment — cash or Venmo." },
                      { id: "online", title: "Pay with Venmo", desc: "Send payment on Venmo right after booking." },
                    ].map((option) => {
                      const active = paymentMethod === option.id;
                      return (
                        <button key={option.id} onClick={() => setPaymentMethod(option.id as "in_store" | "online")} className="cx-card" style={{ padding: 18, textAlign: "left", cursor: "pointer", borderColor: active ? "var(--c-accent)" : "var(--c-line)", background: active ? "var(--c-accent-soft)" : "var(--c-surface)" }}>
                          <p style={{ fontFamily: "var(--c-display)", fontSize: 18, fontWeight: 500 }}>{option.title}</p>
                          <p style={{ marginTop: 4, fontSize: 14, color: "var(--c-ink-2)" }}>{option.desc}</p>
                          {option.id === "online" && content.venmoUrl && <p className="cx-num" style={{ marginTop: 6, fontSize: 12.5, color: "var(--c-accent-ink)" }}>{content.venmoUrl.replace("https://venmo.com/", "@")}</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="cx-card" style={{ padding: 18 }}>
                  <p style={{ fontSize: 14 }}>No deposits. Choose Venmo full payment or pay in store.</p>
                  <p style={{ marginTop: 6, fontSize: 14, color: "var(--c-ink-2)" }}>{content.cancellationPolicy}</p>
                  <p style={{ marginTop: 6, fontSize: 14, color: "var(--c-ink-2)" }}>{content.reminderPolicy}</p>
                </div>

                {error && (
                  <div style={{ borderRadius: 12, border: "1px solid rgba(207,63,52,0.35)", background: "var(--c-danger-soft)", padding: 16 }}>
                    <p style={{ fontSize: 14, color: "var(--c-danger)" }}>{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-2" style={{ gap: 12, paddingTop: 4 }}>
                  <button className="cx-btn cx-btn--ghost" onClick={() => setStep(2)}>Back</button>
                  <button className="cx-btn cx-btn--accent" disabled={submitting} onClick={submit}>{submitting ? "Booking…" : "Confirm booking"}</button>
                </div>
                <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--c-ink-3)" }}>You&apos;ll get a text once confirmed · Reschedule by text</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: "14px 0", borderBottom: last ? "none" : "1px solid var(--c-line)" }}>
      <span style={{ fontSize: 13.5, color: "var(--c-ink-3)" }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 550, color: "var(--c-ink)" }}>{value}</span>
    </div>
  );
}

function FullSpinner() {
  return (
    <div className="site" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="cx-spin" style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid var(--c-line-2)", borderTopColor: "var(--c-accent)" }} />
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<FullSpinner />}>
      <BookPageInner />
    </Suspense>
  );
}
