"use client";

/**
 * SRT Cuts — my appointments, in the Barbr client card language: dark
 * chrome, filter chips, white cards with status badges, inline cancel
 * confirm, and a bottom-sheet reschedule with the week-strip calendar.
 */

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { CalendarDays, Check, Clock, RotateCcw, X, CalendarClock, Ban } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import WeekStrip from "@/components/site/WeekStrip";
import { formatPrice } from "@/lib/services";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/site/Toast";

interface Booking {
  id: string;
  service: string;
  booking_date: string;
  booking_time: string;
  status: "pending" | "accepted" | "denied" | "cancelled";
  service_price_cents: number;
  notes: string;
  created_at: string;
}

const STATUS = {
  pending: { label: "Pending", icon: Clock, cls: "cx-badge--warn" },
  accepted: { label: "Confirmed", icon: Check, cls: "cx-badge--ok" },
  denied: { label: "Declined", icon: X, cls: "cx-badge--danger" },
  cancelled: { label: "Cancelled", icon: Ban, cls: "cx-badge--muted" },
} as const;

const CUTOFF_MS = 24 * 60 * 60 * 1000;

function slotTo24h(time: string): string {
  const [raw, period] = time.split(" ");
  const [h, m] = raw.split(":").map(Number);
  const hours = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
  return `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}
function bookingStartMs(date: string, time: string): number {
  return new Date(`${date}T${slotTo24h(time)}`).getTime();
}
function getMinDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);
  const [nowMs] = useState(() => Date.now());
  const minDate = useMemo(() => getMinDate(), []);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth?redirect=/bookings");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/bookings").then((r) => (r.ok ? r.json() : null)).then((d) => { setBookings(d?.bookings ?? []); setLoading(false); }).catch(() => { setBookings([]); setLoading(false); });
    fetch("/api/site-content").then((r) => r.json()).then((d) => setContent(d.content ?? DEFAULT_SITE_CONTENT)).catch(() => {});
  }, [user]);

  const today = new Date(nowMs).toISOString().split("T")[0];
  const filtered = (bookings ?? [])
    .filter((b) => (filter === "upcoming" ? b.booking_date >= today : filter === "past" ? b.booking_date < today : true))
    .sort((a, b) => b.booking_date.localeCompare(a.booking_date));
  const upcomingCount = (bookings ?? []).filter((b) => b.booking_date >= today && b.status !== "cancelled").length;

  function patchBooking(booking: Booking) {
    setBusyId(booking.id);
    return {
      done: (updated: Booking) => { setBookings((prev) => (prev ?? []).map((b) => (b.id === updated.id ? { ...b, ...updated } : b))); setBusyId(null); },
      fail: () => setBusyId(null),
    };
  }

  async function cancelBooking(booking: Booking) {
    const h = patchBooking(booking);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
      const d = await res.json();
      if (!res.ok) { toast(d.error || "Couldn't cancel. Try again.", "error"); h.fail(); return; }
      h.done(d.booking); setConfirmCancel(null); toast("Booking cancelled.", "success");
    } catch { toast("Network error. Try again.", "error"); h.fail(); }
  }

  async function submitReschedule(booking: Booking, date: string, time: string) {
    const h = patchBooking(booking);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reschedule", date, time }) });
      const d = await res.json();
      if (!res.ok) { toast(d.error || "Couldn't reschedule. Try again.", "error"); h.fail(); return; }
      h.done(d.booking); setRescheduling(null); toast("Rescheduled — pending re-confirmation.", "success");
    } catch { toast("Network error. Try again.", "error"); h.fail(); }
  }

  if (authLoading || !user) {
    return (
      <div className="site" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="cx-spin" style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid var(--c-line-2)", borderTopColor: "var(--c-accent)" }} />
      </div>
    );
  }

  return (
    <div className="site" style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <SiteHeader />
      <div style={{ flex: 1, padding: "28px 16px 60px" }}>
        <div style={{ maxWidth: 660, margin: "0 auto", width: "100%" }}>
          <div style={{ marginBottom: 22 }}>
            <h1 className="cx-sectiontitle" style={{ marginBottom: 4 }}>My bookings</h1>
            <p style={{ fontSize: 14.5, color: "var(--c-ink-2)" }}>{user.name} · {upcomingCount} upcoming</p>
          </div>

          <div className="flex" style={{ gap: 8, marginBottom: 20 }}>
            {(["all", "upcoming", "past"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className="cx-chip" style={{ textTransform: "capitalize", background: filter === f ? "var(--c-ink)" : "transparent", color: filter === f ? "#fff" : "var(--c-ink-2)", borderColor: filter === f ? "transparent" : "var(--c-line-2)" }}>{f}</button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="cx-card" style={{ padding: 20 }}>
                  <div className="cx-shimmer" style={{ height: 16, width: 130, borderRadius: 999, marginBottom: 12 }} />
                  <div className="cx-shimmer" style={{ height: 12, width: 190, borderRadius: 999 }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="cx-card" style={{ padding: "clamp(36px,6vw,56px)", textAlign: "center" }}>
              <div style={{ margin: "0 auto 18px", display: "flex", height: 54, width: 54, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--c-accent-soft)", color: "var(--c-accent-ink)" }}><CalendarDays size={24} /></div>
              <p className="cx-display cx-display--md">{filter === "upcoming" ? "Nothing upcoming" : "No bookings yet"}</p>
              <p style={{ margin: "8px 0 22px", fontSize: 14.5, color: "var(--c-ink-2)" }}>{filter === "upcoming" ? "Ready for your next cut?" : "Your appointments show up here once you book."}</p>
              <Link href="/#services" className="cx-btn cx-btn--accent" style={{ display: "inline-flex" }}>Book now</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((b, i) => {
                const cfg = STATUS[b.status];
                const Icon = cfg.icon;
                const displayDate = new Date(b.booking_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
                const isPast = b.booking_date < today;
                const isCancelled = b.status === "cancelled";
                const canManage = !isPast && !isCancelled && b.status !== "denied";
                const withinCutoff = bookingStartMs(b.booking_date, b.booking_time) - nowMs < CUTOFF_MS;
                const busy = busyId === b.id;
                return (
                  <motion.div
                    key={b.id}
                    className="cx-card"
                    style={{ padding: 20, opacity: isPast || isCancelled ? 0.66 : 1 }}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: isPast || isCancelled ? 0.66 : 1, y: 0 }}
                    transition={{ duration: 0.45, delay: Math.min(i, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="flex items-start justify-between" style={{ gap: 16 }}>
                      <div>
                        <p style={{ fontSize: 16.5, fontWeight: 700 }}>{b.service}</p>
                        <p className="cx-num" style={{ marginTop: 5, fontSize: 13.5, color: "var(--c-ink-2)" }}>{displayDate} · {b.booking_time}</p>
                      </div>
                      <span className={`cx-badge ${cfg.cls}`}><Icon size={12} strokeWidth={3} /> {cfg.label}</span>
                    </div>

                    <div className="flex items-center justify-between" style={{ gap: 12, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--c-line)" }}>
                      <span className="cx-num" style={{ fontSize: 15.5, fontWeight: 700, color: "var(--c-accent-ink)" }}>{formatPrice(b.service_price_cents)}</span>
                      {isPast && b.status === "accepted" ? (
                        <Link href="/#services" className="cx-textlink"><RotateCcw size={14} /> Book again</Link>
                      ) : canManage ? (
                        withinCutoff ? (
                          <span style={{ textAlign: "right", fontSize: 12, lineHeight: 1.3, color: "var(--c-ink-3)" }}>Under 24h — text us<br />for changes</span>
                        ) : (
                          <div className="flex items-center" style={{ gap: 16 }}>
                            <button disabled={busy} onClick={() => setRescheduling(b)} className="cx-textlink" style={{ opacity: busy ? 0.4 : 1, background: "none", border: 0 }}><CalendarClock size={14} /> Reschedule</button>
                            <button disabled={busy} onClick={() => setConfirmCancel(b.id)} className="cx-textlink" style={{ opacity: busy ? 0.4 : 1, background: "none", border: 0 }}><X size={14} /> Cancel</button>
                          </div>
                        )
                      ) : null}
                    </div>

                    <AnimatePresence>
                      {confirmCancel === b.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                          <div style={{ marginTop: 14, borderRadius: 12, border: "1px solid rgba(207,63,52,0.3)", background: "var(--c-danger-soft)", padding: 16 }}>
                            <p style={{ fontSize: 15.5, fontWeight: 700 }}>Cancel this appointment?</p>
                            <p style={{ marginTop: 4, fontSize: 14, color: "var(--c-ink-2)" }}>This frees the slot for others. We&apos;ll be notified.</p>
                            <div className="flex" style={{ gap: 12, marginTop: 14 }}>
                              <button disabled={busy} onClick={() => cancelBooking(b)} className="cx-btn cx-btn--sm" style={{ background: "var(--c-danger)", color: "#fff" }}>{busy ? "Cancelling…" : "Yes, cancel"}</button>
                              <button disabled={busy} onClick={() => setConfirmCancel(null)} className="cx-btn cx-btn--ghost cx-btn--sm">Keep it</button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {b.notes && !isCancelled && <p style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--c-line)", fontSize: 13.5, color: "var(--c-ink-2)" }}>{b.notes}</p>}
                  </motion.div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 28, textAlign: "center" }}>
            <Link href="/#services" className="cx-btn cx-btn--accent" style={{ display: "inline-flex" }}>Book an appointment</Link>
          </div>
        </div>
      </div>

      <SiteFooter instagramUrl={content.instagramUrl} tiktokUrl={content.tiktokUrl} />

      <AnimatePresence>
        {rescheduling && (
          <RescheduleModal booking={rescheduling} content={content} minDate={minDate} busy={busyId === rescheduling.id} onClose={() => setRescheduling(null)} onSubmit={(date, time) => submitReschedule(rescheduling, date, time)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function RescheduleModal({ booking, content, minDate, busy, onClose, onSubmit }: { booking: Booking; content: SiteContent; minDate: string; busy: boolean; onClose: () => void; onSubmit: (date: string, time: string) => void }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [nowMs] = useState(() => Date.now());
  const blockedDates = useMemo(() => content.scheduleBlocks.map((b) => b.date), [content]);
  const dow = date ? String(new Date(date + "T00:00:00").getDay()) : null;
  const allTimes = date ? (date in content.dateAvailability ? content.dateAvailability[date] : dow ? content.weeklyAvailability[dow] ?? [] : []) : [];
  const times = allTimes.filter((t) => bookingStartMs(date, t) - nowMs >= CUTOFF_MS);

  return (
    <motion.div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(20,17,25,0.5)", backdropFilter: "blur(3px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh", width: "100%", maxWidth: 520, overflowY: "auto", borderTopLeftRadius: 22, borderTopRightRadius: 22, background: "var(--c-bg)", padding: 20, paddingBottom: "calc(20px + env(safe-area-inset-bottom))", boxShadow: "var(--c-shadow)" }}
        initial={{ y: 40, opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-start justify-between" style={{ gap: 16, marginBottom: 16 }}>
          <div>
            <h2 className="cx-sectiontitle" style={{ marginBottom: 4 }}>Reschedule</h2>
            <p style={{ fontSize: 14, color: "var(--c-ink-2)" }}>{booking.service} — pick a new day and time. It goes back to pending for re-confirmation.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="cx-roundbtn" style={{ flex: "none" }}><X size={16} /></button>
        </div>

        <WeekStrip value={date} onChange={(d) => { setDate(d); setTime(""); }} minDate={minDate} blockedDates={blockedDates} weeklyAvailability={content.weeklyAvailability} dateAvailability={content.dateAvailability} />

        {date && (
          <div className="cx-card" style={{ marginTop: 12, padding: "16px" }}>
            <p className="cx-slotgroup" style={{ marginBottom: 10 }}>Times</p>
            {times.length === 0 ? (
              <p className="cx-slot-empty">No open times that day — pick another.</p>
            ) : (
              <div className="flex flex-wrap" style={{ gap: 8 }}>
                {times.map((t) => (
                  <button key={t} className="cx-slot" data-selected={t === time} onClick={() => setTime(t)}>{t}</button>
                ))}
              </div>
            )}
          </div>
        )}

        <button disabled={!date || !time || busy} onClick={() => onSubmit(date, time)} className="cx-btn cx-btn--accent cx-btn--block" style={{ marginTop: 18 }}>{busy ? "Rescheduling…" : "Confirm new time"}</button>
      </motion.div>
    </motion.div>
  );
}
