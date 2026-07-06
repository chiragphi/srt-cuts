"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarClock, Phone, MessageSquare } from "lucide-react";
import { TIME_SLOTS } from "@/lib/schedule";
import { isActive, type Booking } from "@/lib/analytics";
import { useAdmin } from "../data";
import { Card, Avatar, StatusBadge, EmptyState } from "../primitives";
import { longDate } from "../format";
import { Reveal } from "../motion";

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function CalendarView() {
  const { bookings, content } = useAdmin();
  const now = new Date();
  const todayISO = toISO(now.getFullYear(), now.getMonth(), now.getDate());
  const [view, setView] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState<string>(todayISO);

  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      if (!isActive(b)) continue;
      map.set(b.booking_date, [...(map.get(b.booking_date) ?? []), b]);
    }
    return map;
  }, [bookings]);

  const y = view.getFullYear();
  const m = view.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDow = new Date(y, m, 1).getDay();
  const monthLabel = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [...Array(firstDow).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function slotsFor(iso: string): string[] {
    return iso in content.dateAvailability
      ? content.dateAvailability[iso]
      : content.weeklyAvailability[String(new Date(iso + "T00:00:00").getDay())] ?? [];
  }

  const selectedBookings = (byDate.get(selected) ?? []).sort((a, b) =>
    TIME_SLOTS.indexOf(a.booking_time) - TIME_SLOTS.indexOf(b.booking_time)
  );
  const selectedSlots = slotsFor(selected);
  const bookedTimes = new Map(selectedBookings.map((b) => [b.booking_time, b]));
  // agenda = union of available slots and booked times, in slot order
  const agendaTimes = Array.from(new Set([...selectedSlots, ...selectedBookings.map((b) => b.booking_time)])).sort(
    (a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b)
  );

  return (
    <div style={{ display: "grid", gap: "var(--a-gap)", gridTemplateColumns: "minmax(0,1fr)" }} className="lg:grid-cols-[1.35fr_1fr]">
      {/* Month */}
      <Card>
        <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 19, fontWeight: 620 }}>{monthLabel}</h2>
          <div className="flex gap-2">
            <button
              className="ax-btn ax-btn--sm"
              aria-label="Previous month"
              onClick={() => setView(new Date(y, m - 1, 1))}
              style={{ width: 38, height: 38, minHeight: 38, padding: 0 }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="ax-btn ax-btn--sm"
              onClick={() => {
                setView(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelected(todayISO);
              }}
            >
              Today
            </button>
            <button
              className="ax-btn ax-btn--sm"
              aria-label="Next month"
              onClick={() => setView(new Date(y, m + 1, 1))}
              style={{ width: 38, height: 38, minHeight: 38, padding: 0 }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7" style={{ gap: 6 }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center" style={{ fontSize: 11, color: "var(--a-text-3)", paddingBottom: 4 }}>
              {d.slice(0, 1)}
            </div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} style={{ aspectRatio: "1" }} />;
            const iso = toISO(y, m, day);
            const dayBookings = byDate.get(iso) ?? [];
            const open = slotsFor(iso).length > 0;
            const isSel = iso === selected;
            const isToday = iso === todayISO;
            const count = dayBookings.length;
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className="ax-num"
                style={{
                  position: "relative",
                  aspectRatio: "1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 550,
                  background: isSel ? "var(--a-accent-strong)" : count > 0 ? "var(--a-surface-2)" : "transparent",
                  color: isSel ? "#fff" : open || count > 0 ? "var(--a-text)" : "var(--a-text-3)",
                  border: `1px solid ${isToday && !isSel ? "var(--a-accent-line)" : "transparent"}`,
                  cursor: "pointer",
                  transition: "background 0.14s var(--a-ease-out)",
                }}
              >
                {day}
                {count > 0 && (
                  <span
                    style={{
                      display: "flex",
                      gap: 2,
                      position: "absolute",
                      bottom: 6,
                    }}
                  >
                    {Array.from({ length: Math.min(count, 3) }).map((_, k) => (
                      <span
                        key={k}
                        style={{ width: 4, height: 4, borderRadius: "50%", background: isSel ? "#fff" : "var(--a-accent)" }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Agenda */}
      <Reveal key={selected}>
        <Card>
          <div style={{ marginBottom: 16 }}>
            <p className="ax-eyebrow">Agenda</p>
            <h3 style={{ fontSize: 18, fontWeight: 620, marginTop: 4 }}>{longDate(selected)}</h3>
            <p style={{ fontSize: 13, color: "var(--a-text-3)", marginTop: 2 }}>
              {selectedBookings.length} booked · {selectedSlots.length} open slot{selectedSlots.length === 1 ? "" : "s"}
            </p>
          </div>

          {agendaTimes.length === 0 ? (
            <EmptyState icon={<CalendarClock size={20} />} title="Closed" body="No availability set for this day. Open it in Schedule." />
          ) : (
            <div className="space-y-1.5" style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {agendaTimes.map((time) => {
                const b = bookedTimes.get(time);
                return (
                  <div
                    key={time}
                    className="flex items-center gap-3"
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--a-r-sm)",
                      background: b ? "var(--a-surface-2)" : "transparent",
                      border: b ? "1px solid transparent" : "1px dashed var(--a-line-strong)",
                    }}
                  >
                    <span className="ax-num" style={{ fontSize: 12.5, fontWeight: 600, width: 62, color: "var(--a-text-2)" }}>
                      {time}
                    </span>
                    {b ? (
                      <>
                        <Avatar name={b.user_name} size={30} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate" style={{ fontSize: 14, fontWeight: 550 }}>
                            {b.user_name}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--a-text-3)" }}>{b.service}</div>
                        </div>
                        <a
                          href={`tel:${b.user_phone.replace(/[^\d+]/g, "")}`}
                          className="ax-btn ax-btn--sm"
                          aria-label={`Call ${b.user_name}`}
                          style={{ padding: 0, width: 32, height: 32, minHeight: 32, flex: "none" }}
                        >
                          <Phone size={14} />
                        </a>
                        <a
                          href={`sms:${b.user_phone.replace(/[^\d+]/g, "")}`}
                          className="ax-btn ax-btn--sm"
                          aria-label={`Text ${b.user_name}`}
                          style={{ padding: 0, width: 32, height: 32, minHeight: 32, flex: "none" }}
                        >
                          <MessageSquare size={14} />
                        </a>
                        <StatusBadge status={b.status} />
                      </>
                    ) : (
                      <span style={{ fontSize: 13, color: "var(--a-text-3)" }}>Open</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Reveal>
    </div>
  );
}
