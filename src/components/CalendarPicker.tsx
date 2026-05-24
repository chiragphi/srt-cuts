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
}

export default function CalendarPicker({ value, onChange, blockedDates, minDate }: Props) {
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
          className="h-9 w-9 flex items-center justify-center rounded-full border border-black/10 bg-white/70 text-[#5d566e] disabled:opacity-25 active:scale-95 transition-transform"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <span className="text-[15px] font-semibold text-[#17151f]">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setView(new Date(y, m + 1, 1))}
          className="h-9 w-9 flex items-center justify-center rounded-full border border-black/10 bg-white/70 text-[#5d566e] active:scale-95 transition-transform"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-bold uppercase tracking-widest text-[#9c96ac]">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-[3px]">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="aspect-square" />;

          const iso = toISO(y, m, day);
          const sel = iso === value;
          const blocked = blockedDates.includes(iso);
          const past = iso < minDate;
          const isToday = iso === todayISO;
          const disabled = past || blocked;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              className="aspect-square flex items-center justify-center rounded-[10px] text-[13px] font-medium relative active:scale-95 transition-all duration-100"
              style={{
                background: sel
                  ? "linear-gradient(135deg, #8f76ff 0%, #6852f5 40%, #3d32c7 100%)"
                  : blocked
                  ? "rgba(239,68,68,0.06)"
                  : "rgba(255,255,255,0.5)",
                color: sel
                  ? "#fff"
                  : blocked
                  ? "rgba(185,28,28,0.4)"
                  : past
                  ? "rgba(111,106,124,0.28)"
                  : "#17151f",
                border: sel
                  ? "1px solid rgba(67,48,205,0.28)"
                  : isToday && !sel
                  ? "1.5px solid rgba(118,87,255,0.52)"
                  : blocked
                  ? "1px solid rgba(239,68,68,0.1)"
                  : "1px solid rgba(66,56,104,0.06)",
                boxShadow: sel ? "0 4px 14px rgba(96,72,231,0.3)" : "none",
                opacity: past ? 0.32 : 1,
                cursor: disabled ? "default" : "pointer",
              }}
            >
              {day}
              {isToday && !sel && (
                <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full bg-[#7657ff]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-black/5 flex items-center gap-4 flex-wrap">
        <LegendDot bg="linear-gradient(135deg, #8f76ff, #6852f5)" label="Selected" />
        <LegendDot border="1.5px solid rgba(118,87,255,0.52)" label="Today" />
        <LegendDot bg="rgba(239,68,68,0.08)" border="1px solid rgba(239,68,68,0.12)" label="Unavailable" />
      </div>
    </div>
  );
}

function LegendDot({ bg, border, label }: { bg?: string; border?: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-[4px]" style={{ background: bg, border }} />
      <span className="text-[11px] font-medium text-[#6f6a7c]">{label}</span>
    </div>
  );
}
