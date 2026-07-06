"use client";

/**
 * SRT Cuts — booking flow, Barbr client structure. Arrives with the chosen
 * service in the query string (?service=Fade). Time screen: centered barber
 * identity, week-strip calendar, slots grouped Morning / Afternoon / Evening.
 * Auth is deferred like Barbr — picking a slot while signed out routes to
 * /auth and returns here with the full selection intact. Then a confirm
 * screen (notes, referral, payment) posts to the unchanged bookings API.
 */

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, CalendarPlus, Check, Copy, Gift } from "lucide-react";
import { SiteHeader, Avatar, FullSpinner, InstagramIcon } from "@/components/site/chrome";
import WeekStrip from "@/components/site/WeekStrip";
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
function slotHour(time: string) {
  const [raw, period] = time.split(" ");
  const h = Number(raw.split(":")[0]);
  return period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
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

const SLOT_GROUPS: { label: string; test: (h: number) => boolean }[] = [
  { label: "Morning", test: (h) => h < 12 },
  { label: "Afternoon", test: (h) => h >= 12 && h < 17 },
  { label: "Evening", test: (h) => h >= 17 },
];

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

  const service = searchParams.get("service") ?? "";
  const [date, setDate] = useState(() => searchParams.get("date") ?? "");
  const [time, setTime] = useState(() => searchParams.get("time") ?? "");
  const [step, setStep] = useState<"time" | "confirm">(() =>
    searchParams.get("date") && searchParams.get("time") ? "confirm" : "time"
  );
  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"in_store" | "online">("in_store");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(() => searchParams.get("payment") === "success");
  const [error, setError] = useState("");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [copied, setCopied] = useState(false);

  const minDate = useMemo(() => getMinDate(), []);

  useEffect(() => {
    fetch("/api/site-content")
      .then((r) => r.json())
      .then((d) => setContent(d.content ?? DEFAULT_SITE_CONTENT))
      .catch(() => setContent(DEFAULT_SITE_CONTENT));
  }, []);

  // No service chosen — the profile page is where services are picked.
  useEffect(() => {
    if (!service && !done) router.replace("/#services");
  }, [service, done, router]);

  // Confirm step needs a session (query state survives the auth round-trip).
  useEffect(() => {
    if (step === "confirm" && !authLoading && !user) {
      router.replace(`/auth?redirect=${encodeURIComponent(`/book?service=${encodeURIComponent(service)}&date=${date}&time=${encodeURIComponent(time)}`)}`);
    }
  }, [step, authLoading, user, router, service, date, time]);

  // Default the calendar to the first bookable day.
  useEffect(() => {
    if (!content || date) return;
    const today = new Date();
    for (let i = 1; i <= 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      if (content.scheduleBlocks.some((b) => b.date === iso)) continue;
      const slots = iso in content.dateAvailability ? content.dateAvailability[iso] : content.weeklyAvailability[String(d.getDay())] ?? [];
      if (slots.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDate(iso);
        return;
      }
    }
  }, [content, date]);

  const availableTimes = useMemo(() => {
    if (!content || !date) return [];
    if (content.scheduleBlocks.some((b) => b.date === date)) return [];
    return date in content.dateAvailability
      ? content.dateAvailability[date]
      : content.weeklyAvailability[String(new Date(date + "T00:00:00").getDay())] ?? [];
  }, [content, date]);

  const selectedService = content?.serviceConfigs.find((s) => s.name === service);

  function pickSlot(t: string) {
    setTime(t);
    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent(`/book?service=${encodeURIComponent(service)}&date=${date}&time=${encodeURIComponent(t)}`)}`);
      return;
    }
    setStep("confirm");
  }

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
        window.location.assign(d.paymentUrl);
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

  if (!content) return <FullSpinner />;

  const avatar = content.barberPhotoUrl || "/srt-logo.png";
  const displayDate = date ? new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";

  // ── Done ─────────────────────────────────────────────────────────
  if (done) {
    const calUrl = date && time && service ? buildGoogleCalendarUrl(service, date, time) : null;
    return (
      <div className="site">
        <SiteHeader />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 20px 80px" }}>
          <motion.div style={{ width: "100%", maxWidth: 440, textAlign: "center" }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <motion.div
              style={{ margin: "0 auto 24px", display: "flex", height: 64, width: 64, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--c-accent)", color: "#fff" }}
              initial={{ scale: 0.7, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            >
              <Check size={30} strokeWidth={3} />
            </motion.div>
            <h1 className="cx-display cx-display--lg">Booking requested</h1>
            <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.5, color: "var(--c-ink-2)" }}>
              A text confirmation lands once it&apos;s approved. Keep your phone close.
            </p>

            {service && date && time && (
              <div className="cx-card" style={{ marginTop: 26, padding: "6px 20px", textAlign: "left" }}>
                <SummaryRow label="Service" value={service} />
                {selectedService && <SummaryRow label="Price" value={formatPrice(effectivePrice(selectedService))} />}
                <SummaryRow label="Date" value={displayDate} />
                <SummaryRow label="Time" value={time} last />
              </div>
            )}

            {content.referralOffer && (
              <div className="cx-promo" style={{ marginTop: 14, textAlign: "left" }}>
                <Gift size={17} style={{ flex: "none" }} />
                <span>{content.referralOffer}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-center" style={{ gap: 12, marginTop: 24 }}>
              {calUrl && <a href={calUrl} target="_blank" rel="noopener noreferrer" className="cx-btn cx-btn--ghost cx-btn--sm"><CalendarPlus size={16} /> Add to calendar</a>}
              <button onClick={copyBookingInfo} className="cx-btn cx-btn--ghost cx-btn--sm"><Copy size={15} /> {copied ? "Copied" : "Copy details"}</button>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-center" style={{ gap: 12, marginTop: 12 }}>
              <Link href="/" className="cx-btn cx-btn--accent cx-btn--sm">Book another</Link>
              <Link href="/bookings" className="cx-btn cx-btn--ghost cx-btn--sm">My bookings</Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="site">
      <SiteHeader />
      <div style={{ padding: "20px 16px 80px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", width: "100%" }}>
          <button
            onClick={() => (step === "confirm" ? setStep("time") : router.push("/#services"))}
            aria-label="Back"
            style={{ background: "none", border: 0, cursor: "pointer", color: "var(--c-ink)", padding: 4, marginLeft: -4 }}
          >
            <ArrowLeft size={22} />
          </button>

          <div style={{ textAlign: "center", marginTop: 4, marginBottom: 22 }}>
            <Avatar src={avatar} alt={content.barberName} size={62} />
            <h1 style={{ fontFamily: "var(--c-display)", fontSize: "clamp(21px,4vw,26px)", fontWeight: 560, letterSpacing: "-0.02em", marginTop: 10 }}>
              {content.barberName}
            </h1>
            <p style={{ marginTop: 4, fontSize: 14.5, color: "var(--c-ink-2)" }}>
              {step === "time" ? "Please choose a time for your service" : "Review and confirm your booking"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === "time" && (
              <motion.div key="time" {...stepAnim}>
                <WeekStrip
                  value={date}
                  onChange={(d) => { setDate(d); setTime(""); }}
                  minDate={minDate}
                  blockedDates={content.scheduleBlocks.map((b) => b.date)}
                  weeklyAvailability={content.weeklyAvailability}
                  dateAvailability={content.dateAvailability}
                />

                <div className="cx-card" style={{ marginTop: 14, padding: "18px 16px" }}>
                  {SLOT_GROUPS.map(({ label, test }) => {
                    const slots = availableTimes.filter((t) => test(slotHour(t)));
                    return (
                      <div key={label} style={{ marginBottom: 18 }}>
                        <p className="cx-slotgroup" style={{ marginBottom: 10 }}>{label}</p>
                        {slots.length === 0 ? (
                          <p className="cx-slot-empty">Sorry! No {label.toLowerCase()} slots this day.</p>
                        ) : (
                          <div className="flex flex-wrap" style={{ gap: 8 }}>
                            {slots.map((t) => (
                              <button key={t} className="cx-slot" data-selected={time === t} onClick={() => pickSlot(t)}>
                                {t}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <p className="cx-slotgroup" style={{ margin: "4px 0 10px" }}>Don&apos;t see a slot?</p>
                  {content.instagramUrl || content.tiktokUrl ? (
                    <a
                      href={content.instagramUrl || content.tiktokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cx-btn cx-btn--dark cx-btn--sm"
                      style={{ display: "inline-flex" }}
                    >
                      <InstagramIcon size={15} /> Message me
                    </a>
                  ) : (
                    <p className="cx-slot-empty">Greyed-out days have no openings — try the next week.</p>
                  )}
                </div>

                <p style={{ textAlign: "center", marginTop: 18, fontSize: 12.5, color: "var(--c-ink-3)" }}>
                  Powered by <span style={{ fontWeight: 650, color: "var(--c-accent-ink)" }}>SRT Cuts</span>
                </p>
              </motion.div>
            )}

            {step === "confirm" && (
              <motion.div key="confirm" {...stepAnim} className="space-y-5">
                <div className="cx-card" style={{ padding: "6px 20px" }}>
                  <SummaryRow label="Service" value={service} />
                  <SummaryRow label="Duration" value={selectedService?.duration ?? "Appointment"} />
                  <SummaryRow
                    label="Price"
                    value={
                      selectedService
                        ? hasDiscount(selectedService)
                          ? `${formatPrice(effectivePrice(selectedService))} (${clampDiscount(selectedService.discountPercent)}% off)`
                          : formatPrice(effectivePrice(selectedService))
                        : "TBD"
                    }
                  />
                  <SummaryRow label="Date" value={displayDate} />
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
                  <div style={{ display: "grid", gap: 10 }}>
                    {[
                      { id: "in_store", title: "Pay in store", desc: "Full price at your appointment — cash or Venmo." },
                      { id: "online", title: "Pay with Venmo", desc: "Send payment on Venmo right after booking." },
                    ].map((option) => {
                      const active = paymentMethod === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setPaymentMethod(option.id as "in_store" | "online")}
                          className="cx-service"
                          data-selected={active}
                          style={{ padding: 16 }}
                        >
                          <div>
                            <p style={{ fontSize: 15.5, fontWeight: 700 }}>{option.title}</p>
                            <p style={{ marginTop: 4, fontSize: 13.5, color: "var(--c-ink-2)" }}>{option.desc}</p>
                            {option.id === "online" && content.venmoUrl && (
                              <p className="cx-num" style={{ marginTop: 6, fontSize: 12.5, color: "var(--c-accent-ink)" }}>{content.venmoUrl.replace("https://venmo.com/", "@")}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="cx-card" style={{ padding: 16 }}>
                  <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--c-ink-2)" }}>{content.depositNote}</p>
                  <p style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.5, color: "var(--c-ink-2)" }}>{content.cancellationPolicy}</p>
                </div>

                {error && (
                  <div style={{ borderRadius: 12, border: "1px solid rgba(207,63,52,0.35)", background: "var(--c-danger-soft)", padding: 16 }}>
                    <p style={{ fontSize: 14, color: "var(--c-danger)" }}>{error}</p>
                  </div>
                )}

                <button className="cx-btn cx-btn--accent cx-btn--block" disabled={submitting} onClick={submit}>
                  {submitting ? "Booking…" : "Confirm booking"}
                </button>
                <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--c-ink-3)" }}>You&apos;ll get a text once confirmed · Reschedule anytime from My bookings</p>
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
      <span style={{ fontSize: 15, fontWeight: 600, color: "var(--c-ink)", textAlign: "right" }}>{value}</span>
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
