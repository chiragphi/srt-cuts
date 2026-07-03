"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, Clock, RotateCcw, X, CalendarClock, Ban } from "lucide-react";
import Navigation from "@/components/Navigation";
import CalendarPicker from "@/components/CalendarPicker";
import { formatPrice } from "@/lib/services";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/Toast";

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
  pending: { label: "Pending", icon: Clock, color: "var(--warn)", bg: "var(--warn-bg)" },
  accepted: { label: "Confirmed", icon: Check, color: "var(--ok)", bg: "var(--ok-bg)" },
  denied: { label: "Declined", icon: X, color: "var(--danger)", bg: "var(--danger-bg)" },
  cancelled: { label: "Cancelled", icon: Ban, color: "var(--mute)", bg: "transparent" },
};

const CUTOFF_MS = 24 * 60 * 60 * 1000;

/** Convert a slot label ("9:00 AM") to 24h "HH:MM:SS". */
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

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const } }),
};

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  // Cancel confirmation + reschedule modal state.
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);

  // Capture "now" once at mount — render stays pure, and the 24h gate is a
  // soft UX hint anyway (the server is authoritative).
  const [nowMs] = useState(() => Date.now());
  const minDate = useMemo(() => getMinDate(), []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth?redirect=/bookings");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/bookings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setBookings(d?.bookings ?? []);
        setLoading(false);
      })
      .catch(() => {
        setBookings([]);
        setLoading(false);
      });
    fetch("/api/site-content")
      .then((r) => r.json())
      .then((d) => setContent(d.content ?? DEFAULT_SITE_CONTENT))
      .catch(() => {});
  }, [user]);

  const today = new Date(nowMs).toISOString().split("T")[0];

  const filtered = (bookings ?? [])
    .filter((b) => {
      if (filter === "upcoming") return b.booking_date >= today;
      if (filter === "past") return b.booking_date < today;
      return true;
    })
    .sort((a, b) => b.booking_date.localeCompare(a.booking_date));

  const upcomingCount = (bookings ?? []).filter(
    (b) => b.booking_date >= today && b.status !== "cancelled"
  ).length;

  function patchBooking(booking: Booking) {
    setBusyId(booking.id);
    return {
      done: (updated: Booking) => {
        setBookings((prev) => (prev ?? []).map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
        setBusyId(null);
      },
      fail: () => setBusyId(null),
    };
  }

  async function cancelBooking(booking: Booking) {
    const h = patchBooking(booking);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast(d.error || "Couldn't cancel. Try again.", "error");
        h.fail();
        return;
      }
      h.done(d.booking);
      setConfirmCancel(null);
      toast("Booking cancelled.", "success");
    } catch {
      toast("Network error. Try again.", "error");
      h.fail();
    }
  }

  async function submitReschedule(booking: Booking, date: string, time: string) {
    const h = patchBooking(booking);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", date, time }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast(d.error || "Couldn't reschedule. Try again.", "error");
        h.fail();
        return;
      }
      h.done(d.booking);
      setRescheduling(null);
      toast("Rescheduled — pending re-confirmation.", "success");
    } catch {
      toast("Network error. Try again.", "error");
      h.fail();
    }
  }

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="spin h-6 w-6 rounded-full border-2 border-[var(--line-strong)] border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="has-tabbar min-h-screen px-5 pb-28 pt-24 sm:pb-16">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-7">
            <p className="idx mb-3">[ ACCOUNT ]</p>
            <h1 className="display display--lg">My bookings</h1>
            {user && (
              <p className="mt-2 text-sm text-[var(--mute)]">
                {user.name} · {upcomingCount} upcoming
              </p>
            )}
          </div>

          <div className="mb-6 flex gap-2">
            {(["all", "upcoming", "past"] as const).map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="rounded-full border px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.1em] transition-colors"
                  style={{
                    borderColor: active ? "transparent" : "var(--line-strong)",
                    background: active ? "var(--accent)" : "transparent",
                    color: active ? "#ffffff" : "var(--mute)",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="panel-fill p-5">
                  <div className="space-y-3">
                    <div className="shimmer h-4 w-32 rounded-full" />
                    <div className="shimmer h-3 w-48 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="panel-fill p-12 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[6px] bg-[var(--accent)]/14 text-[var(--accent-deep)]">
                <CalendarDays size={26} />
              </div>
              <p className="font-display text-2xl uppercase">
                {filter === "upcoming" ? "Nothing upcoming" : "No bookings yet"}
              </p>
              <p className="mb-6 mt-2 text-sm text-[var(--mute)]">
                {filter === "upcoming" ? "Ready for your next cut?" : "Your appointments show up here once you book."}
              </p>
              <Link href="/book" className="btn btn--accent inline-flex">
                Book now <ArrowUpRight size={16} strokeWidth={2.5} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((b, i) => {
                const cfg = STATUS[b.status];
                const Icon = cfg.icon;
                const displayDate = new Date(b.booking_date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                });
                const isPast = b.booking_date < today;
                const isCancelled = b.status === "cancelled";
                const canManage =
                  !isPast && !isCancelled && b.status !== "denied";
                const withinCutoff = bookingStartMs(b.booking_date, b.booking_time) - nowMs < CUTOFF_MS;
                const busy = busyId === b.id;

                return (
                  <motion.div
                    key={b.id}
                    className="panel-fill p-5"
                    initial="hidden"
                    animate="show"
                    variants={fadeUp}
                    custom={i}
                    style={{ opacity: isPast || isCancelled ? 0.62 : 1 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-xl uppercase leading-none">{b.service}</p>
                        <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.06em] text-[var(--mute)]">
                          {displayDate} · {b.booking_time}
                        </p>
                      </div>
                      <span
                        className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em]"
                        style={{
                          background: cfg.bg,
                          color: cfg.color,
                          border: isCancelled ? "1px solid var(--line-strong)" : "none",
                        }}
                      >
                        <Icon size={12} strokeWidth={3} /> {cfg.label}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                      <span className="spec text-[var(--accent-deep)]">{formatPrice(b.service_price_cents)}</span>

                      {isPast && b.status === "accepted" ? (
                        <Link
                          href="/book"
                          className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--mute)] transition-colors hover:text-[var(--accent-deep)]"
                        >
                          <RotateCcw size={13} /> Book again
                        </Link>
                      ) : canManage ? (
                        withinCutoff ? (
                          <span className="text-right font-mono text-[10px] uppercase leading-tight tracking-[0.06em] text-[var(--mute)]">
                            Under 24h — text us
                            <br />
                            for changes
                          </span>
                        ) : (
                          <div className="flex items-center gap-4">
                            <button
                              disabled={busy}
                              onClick={() => setRescheduling(b)}
                              className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--mute)] transition-colors hover:text-[var(--accent-deep)] disabled:opacity-40"
                            >
                              <CalendarClock size={13} /> Reschedule
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => setConfirmCancel(b.id)}
                              className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--mute)] transition-colors hover:text-[var(--danger)] disabled:opacity-40"
                            >
                              <X size={13} /> Cancel
                            </button>
                          </div>
                        )
                      ) : null}
                    </div>

                    {/* Inline cancel confirmation */}
                    <AnimatePresence>
                      {confirmCancel === b.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 rounded-[4px] border border-[var(--danger-line)] bg-[var(--danger-bg)] p-4">
                            <p className="font-display text-lg uppercase leading-none">Cancel this appointment?</p>
                            <p className="mt-1.5 text-sm text-[var(--mute)]">
                              This frees the slot for others. We&apos;ll be notified.
                            </p>
                            <div className="mt-4 flex gap-3">
                              <button
                                disabled={busy}
                                onClick={() => cancelBooking(b)}
                                className="btn btn--accent !min-h-[42px] !bg-[var(--danger)] !shadow-none"
                                style={{ background: "var(--danger)" }}
                              >
                                {busy ? "Cancelling…" : "Yes, cancel"}
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => setConfirmCancel(null)}
                                className="btn btn--ghost !min-h-[42px]"
                              >
                                Keep it
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {b.notes && !isCancelled && (
                      <p className="mt-3 border-t border-[var(--line)] pt-3 text-xs text-[var(--mute)]">{b.notes}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/book" className="btn btn--accent inline-flex">
              Book an appointment <ArrowUpRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {rescheduling && (
          <RescheduleModal
            booking={rescheduling}
            content={content}
            minDate={minDate}
            busy={busyId === rescheduling.id}
            onClose={() => setRescheduling(null)}
            onSubmit={(date, time) => submitReschedule(rescheduling, date, time)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function RescheduleModal({
  booking,
  content,
  minDate,
  busy,
  onClose,
  onSubmit,
}: {
  booking: Booking;
  content: SiteContent;
  minDate: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (date: string, time: string) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [nowMs] = useState(() => Date.now());

  const blockedDates = useMemo(() => content.scheduleBlocks.map((b) => b.date), [content]);
  const dow = date ? String(new Date(date + "T00:00:00").getDay()) : null;
  const allTimes = date
    ? date in content.dateAvailability
      ? content.dateAvailability[date]
      : dow
      ? content.weeklyAvailability[dow] ?? []
      : []
    : [];
  // Hide slots inside the 24h window so the server never rejects the pick.
  const times = allTimes.filter((t) => bookingStartMs(date, t) - nowMs >= CUTOFF_MS);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[14px] border-t border-[var(--line-strong)] bg-[var(--paper)] p-5 sm:rounded-[8px] sm:border"
        initial={{ y: 40, opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="idx mb-2">[ RESCHEDULE ]</p>
            <h2 className="font-display text-2xl uppercase leading-none">{booking.service}</h2>
            <p className="mt-2 text-sm text-[var(--mute)]">Pick a new day and time. It goes back to pending for re-confirmation.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--line-strong)] text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
          >
            <X size={16} />
          </button>
        </div>

        <CalendarPicker
          value={date}
          onChange={(d) => {
            setDate(d);
            setTime("");
          }}
          blockedDates={blockedDates}
          minDate={minDate}
          weeklyAvailability={content.weeklyAvailability}
          dateAvailability={content.dateAvailability}
        />

        {date && (
          <div className="mt-4">
            <p className="field-label">Time</p>
            {times.length === 0 ? (
              <p className="text-sm text-[var(--mute)]">No open times that day — pick another.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {times.map((t) => {
                  const active = t === time;
                  return (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className="rounded-[4px] border px-3 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.06em] transition-colors"
                      style={{
                        borderColor: active ? "transparent" : "var(--line-strong)",
                        background: active ? "var(--accent)" : "transparent",
                        color: active ? "#ffffff" : "var(--ink)",
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          disabled={!date || !time || busy}
          onClick={() => onSubmit(date, time)}
          className="btn btn--accent mt-6 w-full"
        >
          {busy ? "Rescheduling…" : "Confirm new time"}
        </button>
      </motion.div>
    </motion.div>
  );
}
