"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  blockedDates: string[];
  minDate: string;
  weeklyAvailability?: Record<string, string[]>;
  dateAvailability?: Record<string, string[]>;
}

export default function SiteCalendar({
  value,
  onChange,
  blockedDates,
  minDate,
  weeklyAvailability,
  dateAvailability,
}: Props) {
  const base = new Date((value || minDate) + "T00:00:00");
  const [view, setView] = useState(() => new Date(base.getFullYear(), base.getMonth(), 1));

  const y = view.getFullYear();
  const m = view.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDow = new Date(y, m, 1).getDay();

  const minD = new Date(minDate + "T00:00:00");
  const viewYM = y * 12 + m;
  const minYM = minD.getFullYear() * 12 + minD.getMonth();

  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const monthLabel = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [...Array(firstDow).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="cx-card" style={{ padding: "clamp(16px, 3vw, 22px)" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setView(new Date(y, m - 1, 1))}
          disabled={viewYM <= minYM}
          aria-label="Previous month"
          style={navBtn}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{monthLabel}</span>
        <button type="button" onClick={() => setView(new Date(y, m + 1, 1))} aria-label="Next month" style={navBtn}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7" style={{ marginBottom: 6 }}>
        {DAYS.map((d, i) => (
          <div key={i} className="text-center" style={{ fontSize: 11, fontWeight: 600, color: "var(--c-ink-3)", padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7" style={{ gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} style={{ aspectRatio: "1" }} />;
          const iso = toISO(y, m, day);
          const dow = new Date(iso + "T00:00:00").getDay();
          const sel = iso === value;
          const blocked = blockedDates.includes(iso);
          const past = iso < minDate;
          const isToday = iso === todayISO;
          const slots =
            dateAvailability && iso in dateAvailability
              ? dateAvailability[iso]
              : weeklyAvailability
              ? weeklyAvailability[String(dow)] ?? []
              : null;
          const noSlots = slots !== null && slots.length === 0;
          const disabled = past || blocked || noSlots;
          const state = sel ? "selected" : blocked ? "blocked" : disabled ? "disabled" : isToday ? "today" : "open";

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              data-state={state}
              className="cx-cal-day"
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center" style={{ gap: 16, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--c-line)" }}>
        <Legend swatch="var(--c-accent)" label="Selected" />
        <Legend border label="Today" />
        <Legend muted label="Unavailable" />
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  display: "flex",
  height: 38,
  width: 38,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  border: "1px solid var(--c-line-2)",
  background: "transparent",
  color: "var(--c-ink)",
  cursor: "pointer",
};

function Legend({ swatch, border, muted, label }: { swatch?: string; border?: boolean; muted?: boolean; label: string }) {
  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 4,
          background: swatch ?? "transparent",
          border: border ? "1.5px solid var(--c-accent)" : muted ? "1px solid var(--c-line-2)" : undefined,
          opacity: muted ? 0.6 : 1,
        }}
      />
      <span style={{ fontSize: 11.5, color: "var(--c-ink-3)" }}>{label}</span>
    </div>
  );
}
