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

export default function CalendarPicker({
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
    <div className="panel-fill p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(y, m - 1, 1))}
          disabled={viewYM <= minYM}
          aria-label="Previous month"
          className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[var(--line-strong)] text-[var(--ink)] transition-transform active:scale-95 disabled:opacity-25"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <span className="font-mono text-[13px] font-bold uppercase tracking-[0.12em]">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setView(new Date(y, m + 1, 1))}
          aria-label="Next month"
          className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[var(--line-strong)] text-[var(--ink)] transition-transform active:scale-95"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7">
        {DAYS.map((d, i) => (
          <div key={i} className="py-1 text-center font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--mute)]">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="aspect-square" />;

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

          const state = sel
            ? "selected"
            : blocked
            ? "blocked"
            : disabled
            ? "disabled"
            : isToday
            ? "today"
            : "open";

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              data-state={state}
              className="cal-day"
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--line)] pt-3">
        <Legend swatch="var(--accent)" label="Selected" />
        <Legend border="var(--accent)" label="Today" />
        <Legend muted label="Unavailable" />
      </div>
    </div>
  );
}

function Legend({ swatch, border, muted, label }: { swatch?: string; border?: string; muted?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-3 w-3 rounded-[3px]"
        style={{
          background: swatch ?? (muted ? "transparent" : "transparent"),
          border: border ? `1.5px solid ${border}` : muted ? "1px solid var(--line-strong)" : undefined,
          opacity: muted ? 0.5 : 1,
        }}
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--mute)]">{label}</span>
    </div>
  );
}
