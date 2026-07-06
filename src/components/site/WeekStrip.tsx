"use client";

/**
 * Barbr-style week-strip calendar: one week of day circles under Su–Sa
 * headers, chevrons to step weeks, the selected day filled with the accent.
 * Days are disabled when before minDate, explicitly blocked, or when the
 * schedule has no slots for them.
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfWeek(d: Date) {
  const s = new Date(d);
  s.setDate(s.getDate() - s.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
}
function ordinal(n: number) {
  const s = ["TH", "ST", "ND", "RD"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

interface Props {
  value: string;
  onChange: (iso: string) => void;
  minDate: string;
  blockedDates: string[];
  weeklyAvailability: Record<string, string[]>;
  dateAvailability: Record<string, string[]>;
}

export default function WeekStrip({ value, onChange, minDate, blockedDates, weeklyAvailability, dateAvailability }: Props) {
  const anchor = new Date((value || minDate) + "T00:00:00");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(anchor));

  const days = [...Array(7)].map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const selected = value ? new Date(value + "T00:00:00") : null;
  const title = selected ?? days[0];
  const titleLabel = `${title.getDate()}${ordinal(title.getDate())} ${title
    .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    .toUpperCase()}`;

  const minWeek = startOfWeek(new Date(minDate + "T00:00:00"));
  const atMin = weekStart <= minWeek;

  function hasSlots(iso: string, dow: number) {
    const slots = iso in dateAvailability ? dateAvailability[iso] : weeklyAvailability[String(dow)] ?? [];
    return slots.length > 0;
  }

  function step(dir: 1 | -1) {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + dir * 7);
    setWeekStart(next);
  }

  return (
    <div className="cx-card" style={{ padding: "18px 16px" }}>
      <div className="cx-weekstrip-head">
        <button type="button" className="cx-roundbtn" onClick={() => step(-1)} disabled={atMin} aria-label="Previous week">
          <ChevronLeft size={17} />
        </button>
        <p className="cx-weekstrip-title cx-num">{titleLabel}</p>
        <button type="button" className="cx-roundbtn" onClick={() => step(1)} aria-label="Next week">
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="cx-weekstrip-grid">
        {DOW_LABELS.map((l) => (
          <span key={l} className="cx-weekstrip-dow">{l}</span>
        ))}
        {days.map((d) => {
          const iso = toISO(d);
          const disabled = iso < minDate || blockedDates.includes(iso) || !hasSlots(iso, d.getDay());
          return (
            <button
              key={iso}
              type="button"
              className="cx-weekstrip-day"
              data-state={value === iso ? "selected" : undefined}
              disabled={disabled}
              onClick={() => onChange(iso)}
              aria-label={d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
