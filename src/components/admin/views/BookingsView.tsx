"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X, Trash2, Phone, MessageSquare, CalendarClock, DollarSign, Inbox } from "lucide-react";
import { isActive, type Booking } from "@/lib/analytics";
import { formatPhone } from "@/lib/analytics";
import { TIME_SLOTS } from "@/lib/schedule";
import { money } from "../format";
import { longDate } from "../format";
import { useAdmin } from "../data";
import { Avatar, StatusBadge, EmptyState } from "../primitives";

// tel:/sms: want bare digits; the app stores phones already-normalized but we
// strip just in case a formatted value slips through.
const dialable = (phone: string) => phone.replace(/[^\d+]/g, "");

const TABS = ["All", "Pending", "Accepted", "Denied", "Cancelled"] as const;
type Tab = (typeof TABS)[number];

export function BookingsView() {
  const { bookings, acting, act, del, setPaymentStatus, reschedule } = useAdmin();
  const [tab, setTab] = useState<Tab>("Pending");

  const counts = useMemo(
    () => ({
      All: bookings.length,
      Pending: bookings.filter((b) => b.status === "pending").length,
      Accepted: bookings.filter((b) => b.status === "accepted").length,
      Denied: bookings.filter((b) => b.status === "denied").length,
      Cancelled: bookings.filter((b) => b.status === "cancelled").length,
    }),
    [bookings]
  );

  const filtered = useMemo(() => {
    const list =
      tab === "All" ? bookings : bookings.filter((b) => b.status === tab.toLowerCase());
    return [...list].sort((a, b) => {
      const d = b.booking_date.localeCompare(a.booking_date);
      return d !== 0 ? d : b.booking_time.localeCompare(a.booking_time);
    });
  }, [bookings, tab]);

  return (
    <div className="space-y-6">
      <div className="ax-seg" role="tablist" aria-label="Booking status" style={{ maxWidth: "100%", overflowX: "auto" }}>
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} data-active={tab === t} onClick={() => setTab(t)}>
            {t}
            {counts[t] > 0 && <span className="ax-num" style={{ marginLeft: 6, opacity: 0.6 }}>{counts[t]}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox size={20} />}
          title={tab === "Pending" ? "Queue is clear" : "Nothing here"}
          body={tab === "Pending" ? "No bookings are waiting on you right now." : `No ${tab.toLowerCase()} bookings.`}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((b) => (
              <BookingCard
                key={b.id}
                b={b}
                bookings={bookings}
                acting={acting}
                act={act}
                del={del}
                setPaymentStatus={setPaymentStatus}
                reschedule={reschedule}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function BookingCard({
  b,
  bookings,
  acting,
  act,
  del,
  setPaymentStatus,
  reschedule,
}: {
  b: Booking;
  bookings: Booking[];
  acting: string | null;
  act: (id: string, status: "accepted" | "denied") => void;
  del: (id: string) => void;
  setPaymentStatus: (id: string, paymentStatus: "unpaid" | "paid" | "refunded") => void;
  reschedule: (id: string, bookingDate: string, bookingTime: string, notify: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const isPaid = b.payment_status === "paid";
  const busy = Boolean(acting);

  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="ax-card"
      style={{ padding: "18px 20px", opacity: isActive(b) ? 1 : 0.72 }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Avatar name={b.user_name} size={42} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate" style={{ fontSize: 16, fontWeight: 600 }}>
                {b.user_name}
              </span>
              <StatusBadge status={b.status} />
            </div>
            <div
              className="ax-num"
              style={{ marginTop: 4, fontSize: 13, color: "var(--a-text-3)", display: "flex", flexWrap: "wrap", gap: 8 }}
            >
              <span>{b.service}</span>
              <span aria-hidden>·</span>
              <span>{longDate(b.booking_date)}</span>
              <span aria-hidden>·</span>
              <span>{b.booking_time}</span>
              <span aria-hidden>·</span>
              <span style={{ color: "var(--a-text-2)" }}>{money(b.service_price_cents ?? 0)}</span>
              <span aria-hidden>·</span>
              <span>
                {b.payment_method === "online" ? "Venmo" : "In store"} · {b.payment_status.replace(/_/g, " ")}
              </span>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a
                href={`tel:${dialable(b.user_phone)}`}
                className="ax-btn ax-btn--sm ax-btn--soft"
                aria-label={`Call ${b.user_name}`}
              >
                <Phone size={14} /> Call
              </a>
              <a
                href={`sms:${dialable(b.user_phone)}`}
                className="ax-btn ax-btn--sm ax-btn--soft"
                aria-label={`Text ${b.user_name}`}
              >
                <MessageSquare size={14} /> Text
              </a>
              <span
                className="ax-num"
                style={{ fontSize: 12.5, color: "var(--a-text-3)", alignSelf: "center" }}
              >
                {formatPhone(b.user_phone)}
              </span>
            </div>
            {b.notes && (
              <p style={{ marginTop: 8, fontSize: 13.5, fontStyle: "italic", color: "var(--a-text-3)" }}>
                “{b.notes}”
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {confirmDelete ? (
            <>
              <button
                className="ax-btn ax-btn--sm ax-btn--danger"
                disabled={busy}
                onClick={() => {
                  del(b.id);
                  setConfirmDelete(false);
                }}
              >
                {acting === b.id + "delete" ? "…" : "Delete for good"}
              </button>
              <button className="ax-btn ax-btn--sm" onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
            </>
          ) : (
            <>
              {b.payment_method === "online" && (
                <button
                  className="ax-btn ax-btn--sm ax-btn--soft"
                  disabled={busy}
                  onClick={() => setPaymentStatus(b.id, isPaid ? "unpaid" : "paid")}
                >
                  <DollarSign size={14} />
                  {acting === b.id + "paid" || acting === b.id + "unpaid" ? "…" : isPaid ? "Mark unpaid" : "Mark paid"}
                </button>
              )}
              {b.status === "pending" && (
                <>
                  <button
                    className="ax-btn ax-btn--sm ax-btn--primary"
                    disabled={busy}
                    onClick={() => act(b.id, "accepted")}
                  >
                    <Check size={14} /> {acting === b.id + "accepted" ? "…" : "Accept"}
                  </button>
                  <button className="ax-btn ax-btn--sm" disabled={busy} onClick={() => act(b.id, "denied")}>
                    <X size={14} /> {acting === b.id + "denied" ? "…" : "Deny"}
                  </button>
                </>
              )}
              {(b.status === "pending" || b.status === "accepted") && (
                <button
                  className="ax-btn ax-btn--sm"
                  disabled={busy}
                  onClick={() => setEditing((e) => !e)}
                  data-active={editing}
                >
                  <CalendarClock size={14} /> Change time
                </button>
              )}
              <button
                className="ax-btn ax-btn--sm"
                aria-label="Delete booking"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                style={{ padding: 0, width: 36, height: 36, minHeight: 36 }}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <RescheduleEditor
            b={b}
            bookings={bookings}
            acting={acting}
            reschedule={reschedule}
            onClose={() => setEditing(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RescheduleEditor({
  b,
  bookings,
  acting,
  reschedule,
  onClose,
}: {
  b: Booking;
  bookings: Booking[];
  acting: string | null;
  reschedule: (id: string, bookingDate: string, bookingTime: string, notify: boolean) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const [date, setDate] = useState(b.booking_date);
  const [time, setTime] = useState(b.booking_time);
  const busy = acting === b.id + "reschedule";
  const unchanged = date === b.booking_date && time === b.booking_time;

  // Flag times already taken by other active bookings on the chosen day so the
  // operator doesn't accidentally stack two clients in one slot.
  const takenTimes = useMemo(() => {
    const set = new Set<string>();
    for (const other of bookings) {
      if (other.id === b.id) continue;
      if (other.booking_date !== date) continue;
      if (other.status === "denied" || other.status === "cancelled") continue;
      set.add(other.booking_time);
    }
    return set;
  }, [bookings, date, b.id]);

  async function submit(notify: boolean) {
    await reschedule(b.id, date, time, notify);
    onClose();
  }

  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, height: 0 }}
      animate={reduce ? undefined : { opacity: 1, height: "auto" }}
      exit={reduce ? undefined : { opacity: 0, height: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflow: "hidden" }}
    >
      <div
        className="ax-card ax-card--quiet"
        style={{ marginTop: 16, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <p className="ax-eyebrow">Move this appointment</p>
        <div className="flex flex-wrap items-end" style={{ gap: 12 }}>
          <label style={{ display: "block" }}>
            <span className="ax-label">Date</span>
            <input
              className="ax-field"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: 180 }}
            />
          </label>
          <label style={{ display: "block" }}>
            <span className="ax-label">Time</span>
            <select className="ax-select" value={time} onChange={(e) => setTime(e.target.value)}>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                  {takenTimes.has(t) ? " · booked" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {takenTimes.has(time) && time !== b.booking_time && (
          <p style={{ fontSize: 12.5, color: "var(--s-danger)" }}>
            Heads up — another booking is already at {time} that day.
          </p>
        )}

        <div className="flex flex-wrap" style={{ gap: 8 }}>
          <button
            className="ax-btn ax-btn--sm ax-btn--primary"
            disabled={busy || unchanged}
            onClick={() => submit(true)}
          >
            {busy ? "Saving…" : "Save & text them"}
          </button>
          <button
            className="ax-btn ax-btn--sm"
            disabled={busy || unchanged}
            onClick={() => submit(false)}
          >
            Save, don&apos;t text
          </button>
          <button className="ax-btn ax-btn--sm" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}
