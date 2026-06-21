"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function toISO(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

interface Props {
  value: string;
  onChange: (v: string) => void;
  blockedDates: string[];
  minDate: string;
  weeklyAvailability?: Record<string, string[]>;
  dateAvailability?: Record<string, string[]>;
}

export default function CalendarPicker({ value, onChange, blockedDates, minDate, weeklyAvailability, dateAvailability }: Props) {
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
    <div className="app-card p-4 sm:p-5">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={() => setView(new Date(y, m - 1, 1))}
          disabled={viewYM <= minYM}
          className="h-9 w-9 flex items-center justify-center rounded-full border border-[rgba(120,150,110,0.18)] bg-[rgba(120,150,110,0.1)] text-[#b8c4b1] disabled:opacity-25 active:scale-95 transition-transform"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <span className="text-[15px] font-semibold text-[#f1ece0]">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setView(new Date(y, m + 1, 1))}
          className="h-9 w-9 flex items-center justify-center rounded-full border border-[rgba(120,150,110,0.18)] bg-[rgba(120,150,110,0.1)] text-[#b8c4b1] active:scale-95 transition-transform"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-bold uppercase tracking-widest text-[#7d8c79]">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-[3px]">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="aspect-square" />;

          const iso = toISO(y, m, day);
          const dow = new Date(iso + "T00:00:00").getDay();
          const sel = iso === value;
          const blocked = blockedDates.includes(iso);
          const past = iso < minDate;
          const isToday = iso === todayISO;
          const slots = dateAvailability && iso in dateAvailability
            ? dateAvailability[iso]
            : weeklyAvailability
            ? (weeklyAvailability[String(dow)] ?? [])
            : null;
          const noSlots = slots !== null && slots.length === 0;
          const disabled = past || blocked || noSlots;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              className="aspect-square flex items-center justify-center rounded-[10px] text-[13px] font-medium relative active:scale-95 transition-all duration-100"
              style={{
                background: sel
                  ? "linear-gradient(135deg, #eab468 0%, #d9973f 52%, #d9973f 100%)"
                  : blocked
                  ? "rgba(239,68,68,0.06)"
                  : "rgba(120,150,110,0.08)",
                color: sel
                  ? "#0c130e"
                  : blocked
                  ? "rgba(248,113,113,0.5)"
                  : past || noSlots
                  ? "rgba(245,240,230,0.25)"
                  : "#f1ece0",
                border: sel
                  ? "1px solid rgba(224,164,88,0.5)"
                  : isToday && !sel
                  ? "1.5px solid rgba(224,164,88,0.6)"
                  : blocked
                  ? "1px solid rgba(239,68,68,0.1)"
                  : "1px solid rgba(255,255,255,0.07)",
                boxShadow: sel ? "0 4px 14px rgba(224,164,88,0.3)" : "none",
                opacity: past || noSlots ? 0.32 : 1,
                cursor: disabled ? "default" : "pointer",
              }}
            >
              {day}
              {isToday && !sel && (
                <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full bg-[#e0a458]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-[rgba(120,150,110,0.16)] flex items-center gap-4 flex-wrap">
        <LegendDot bg="linear-gradient(135deg, #eab468, #d9973f)" label="Selected" />
        <LegendDot border="1.5px solid rgba(224,164,88,0.6)" label="Today" />
        <LegendDot bg="rgba(239,68,68,0.08)" border="1px solid rgba(239,68,68,0.12)" label="Blocked" />
        <LegendDot bg="rgba(120,150,110,0.1)" label="No slots" />
      </div>
    </div>
  );
}

function LegendDot({ bg, border, label }: { bg?: string; border?: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-[4px]" style={{ background: bg, border }} />
      <span className="text-[11px] font-medium text-[#7d8c79]">{label}</span>
    </div>
  );
}
