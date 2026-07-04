"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { TIME_SLOTS, DAYS_OF_WEEK } from "@/lib/schedule";
import { useAdmin } from "../data";
import { Field, Repeater, SaveBar, EditorPanel, Hint } from "../forms";
import { longDate } from "../format";

const DEFAULT_START = "9:00 AM";
const DEFAULT_END = "5:00 PM";

const idxOf = (t: string) => TIME_SLOTS.indexOf(t);
function rangeSlots(a: string, b: string): string[] {
  const lo = Math.min(idxOf(a), idxOf(b));
  const hi = Math.max(idxOf(a), idxOf(b));
  if (lo < 0 || hi < 0) return [];
  return TIME_SLOTS.slice(lo, hi + 1);
}
function isContiguous(slots: string[]): boolean {
  if (slots.length <= 1) return true;
  const first = idxOf(slots[0]);
  return slots.every((s, i) => idxOf(s) === first + i);
}

export function ScheduleView() {
  const { content, setContent, saveContent, saving, saveMessage } = useAdmin();

  return (
    <div className="space-y-6">
      <WeeklyEditor
        availability={content.weeklyAvailability}
        onChange={(weeklyAvailability) => setContent({ ...content, weeklyAvailability })}
      />
      <DateAvailabilityEditor
        dateAvailability={content.dateAvailability}
        weeklyAvailability={content.weeklyAvailability}
        onChange={(dateAvailability) => setContent({ ...content, dateAvailability })}
      />
      <EditorPanel title="Days off" hint="Fully closed dates — holidays, trips, sick days.">
        <Repeater
          items={content.scheduleBlocks}
          empty={{ date: "", reason: "" }}
          addLabel="Add a day off"
          onChange={(scheduleBlocks) => setContent({ ...content, scheduleBlocks })}
          render={(item, update) => (
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "180px 1fr" }}>
              <Field label="Date" type="date" value={item.date} onChange={(date) => update({ ...item, date })} />
              <Field label="Reason" value={item.reason} onChange={(reason) => update({ ...item, reason })} />
            </div>
          )}
        />
      </EditorPanel>
      <EditorPanel title="Policies">
        <TextAreaField label="Payment note" value={content.depositNote} onChange={(depositNote) => setContent({ ...content, depositNote })} />
        <TextAreaField label="Cancellation / reschedule policy" value={content.cancellationPolicy} onChange={(cancellationPolicy) => setContent({ ...content, cancellationPolicy })} />
        <TextAreaField label="SMS reminder policy" value={content.reminderPolicy} onChange={(reminderPolicy) => setContent({ ...content, reminderPolicy })} />
        <TextAreaField label="Google Calendar note" value={content.googleCalendarNote} onChange={(googleCalendarNote) => setContent({ ...content, googleCalendarNote })} />
      </EditorPanel>
      <SaveBar saving={saving} saveMessage={saveMessage} onSave={() => saveContent()} />
    </div>
  );
}

// ── Small controls ────────────────────────────────────────────────────
function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className="ax-switch" data-on={on} onClick={onToggle} />;
}

function TimeSelect({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel: string }) {
  return (
    <select className="ax-select" aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
      {TIME_SLOTS.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

// The core hours picker: open/closed switch + a start→end range. Individual
// 30-minute slots hide behind "Fine-tune" for the rare split shift.
function HoursControl({
  slots,
  onChange,
  onResetWeekly,
}: {
  slots: string[];
  onChange: (slots: string[]) => void;
  onResetWeekly?: () => void;
}) {
  const open = slots.length > 0;
  const contiguous = isContiguous(slots);
  const [adv, setAdv] = useState(false);
  const start = open ? slots[0] : DEFAULT_START;
  const end = open ? slots[slots.length - 1] : DEFAULT_END;
  const showChips = open && (adv || !contiguous);

  function toggleSlot(slot: string) {
    const next = slots.includes(slot)
      ? slots.filter((t) => t !== slot)
      : [...slots, slot].sort((a, b) => idxOf(a) - idxOf(b));
    onChange(next);
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="flex flex-wrap items-center" style={{ gap: 12 }}>
        <Switch on={open} label="Open this day" onToggle={() => onChange(open ? [] : rangeSlots(DEFAULT_START, DEFAULT_END))} />
        {open ? (
          showChips ? (
            <span style={{ fontSize: 14, color: "var(--a-text-2)" }}>Custom · {slots.length} slot{slots.length === 1 ? "" : "s"}</span>
          ) : (
            <div className="flex items-center" style={{ gap: 8 }}>
              <TimeSelect value={start} ariaLabel="Open from" onChange={(v) => onChange(rangeSlots(v, end))} />
              <span style={{ fontSize: 13, color: "var(--a-text-3)" }}>to</span>
              <TimeSelect value={end} ariaLabel="Open until" onChange={(v) => onChange(rangeSlots(start, v))} />
            </div>
          )
        ) : (
          <span style={{ fontSize: 14, color: "var(--a-text-3)" }}>Closed</span>
        )}
      </div>

      {open && (
        <div className="flex flex-wrap items-center" style={{ gap: 16, marginTop: 10 }}>
          {contiguous ? (
            <button type="button" className="ax-link" style={{ fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5 }} onClick={() => setAdv((a) => !a)}>
              <SlidersHorizontal size={13} /> {adv ? "Back to simple hours" : "Fine-tune slots"}
            </button>
          ) : (
            <button type="button" className="ax-link" style={{ fontSize: 12.5 }} onClick={() => { onChange(rangeSlots(start, end)); setAdv(false); }}>
              Reset to a simple range
            </button>
          )}
          {onResetWeekly && (
            <button type="button" className="ax-link" style={{ fontSize: 12.5, color: "var(--a-text-3)" }} onClick={onResetWeekly}>
              Use weekly hours
            </button>
          )}
        </div>
      )}

      {showChips && (
        <div className="flex flex-wrap" style={{ gap: 8, marginTop: 12 }}>
          {TIME_SLOTS.map((slot) => {
            const on = slots.includes(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleSlot(slot)}
                className="ax-num"
                style={{
                  padding: "6px 11px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 550,
                  cursor: "pointer",
                  border: `1px solid ${on ? "transparent" : "var(--a-line-strong)"}`,
                  background: on ? "var(--a-accent-strong)" : "transparent",
                  color: on ? "#fff" : "var(--a-text-3)",
                }}
              >
                {slot}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Weekly ────────────────────────────────────────────────────────────
function WeeklyEditor({
  availability,
  onChange,
}: {
  availability: Record<string, string[]>;
  onChange: (v: Record<string, string[]>) => void;
}) {
  const [fillStart, setFillStart] = useState(DEFAULT_START);
  const [fillEnd, setFillEnd] = useState(DEFAULT_END);

  function applyAll(slots: string[]) {
    const next: Record<string, string[]> = {};
    for (let d = 0; d < 7; d++) next[String(d)] = [...slots];
    onChange(next);
  }

  return (
    <EditorPanel title="Weekly hours" hint="Set your open hours once. Pick a start and end — every 30 minutes between opens for booking. Toggle a day off to close it.">
      {/* Quick fill */}
      <div className="ax-card ax-card--quiet" style={{ padding: 16 }}>
        <p className="ax-eyebrow" style={{ marginBottom: 12 }}>Set every day at once</p>
        <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
          <TimeSelect value={fillStart} ariaLabel="From" onChange={setFillStart} />
          <span style={{ fontSize: 13, color: "var(--a-text-3)" }}>to</span>
          <TimeSelect value={fillEnd} ariaLabel="Until" onChange={setFillEnd} />
          <button type="button" className="ax-btn ax-btn--soft ax-btn--sm" onClick={() => applyAll(rangeSlots(fillStart, fillEnd))}>
            Apply to all days
          </button>
          <button type="button" className="ax-btn ax-btn--sm" onClick={() => applyAll([])}>
            Close all
          </button>
        </div>
      </div>

      <div>
        {DAYS_OF_WEEK.map((dayName, dow) => {
          const key = String(dow);
          const slots = availability[key] ?? [];
          return (
            <div key={key} style={{ padding: "18px 0", borderBottom: dow === 6 ? "none" : "1px solid var(--a-line)" }}>
              <div className="flex flex-wrap items-start" style={{ gap: 16 }}>
                <span style={{ width: 96, flex: "none", fontSize: 15, fontWeight: 600, paddingTop: 4 }}>{dayName}</span>
                <HoursControl slots={slots} onChange={(next) => onChange({ ...availability, [key]: next })} />
              </div>
            </div>
          );
        })}
      </div>
    </EditorPanel>
  );
}

// ── Date-specific overrides ───────────────────────────────────────────
function DateAvailabilityEditor({
  dateAvailability,
  weeklyAvailability,
  onChange,
}: {
  dateAvailability: Record<string, string[]>;
  weeklyAvailability: Record<string, string[]>;
  onChange: (v: Record<string, string[]>) => void;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const now = new Date();
  const todayISO = toISO(now.getFullYear(), now.getMonth(), now.getDate());

  const [view, setView] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);

  const y = view.getFullYear();
  const m = view.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDow = new Date(y, m, 1).getDay();
  const viewYM = y * 12 + m;
  const minYM = now.getFullYear() * 12 + now.getMonth();
  const monthLabel = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [...Array(firstDow).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function weeklyFor(iso: string): string[] {
    return weeklyAvailability[String(new Date(iso + "T00:00:00").getDay())] ?? [];
  }
  function slotsFor(iso: string): string[] {
    return iso in dateAvailability ? dateAvailability[iso] : weeklyFor(iso);
  }

  const selectedSlots = selected ? slotsFor(selected) : [];
  const selectedHasOverride = selected ? selected in dateAvailability : false;

  return (
    <EditorPanel title="Change a specific day" hint="Only need to tweak one date — a late night, an early close, a one-off closure? Tap it. Everything else follows your weekly hours.">
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <button type="button" onClick={() => setView(new Date(y, m - 1, 1))} disabled={viewYM <= minYM} aria-label="Previous month" className="ax-btn ax-btn--sm" style={{ width: 38, height: 38, minHeight: 38, padding: 0 }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{monthLabel}</span>
        <button type="button" onClick={() => setView(new Date(y, m + 1, 1))} aria-label="Next month" className="ax-btn ax-btn--sm" style={{ width: 38, height: 38, minHeight: 38, padding: 0 }}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7" style={{ gap: 4 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center" style={{ fontSize: 11, color: "var(--a-text-3)", paddingBottom: 4 }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} style={{ aspectRatio: "1" }} />;
          const iso = toISO(y, m, day);
          const past = iso < todayISO;
          const hasOverride = iso in dateAvailability;
          const open = slotsFor(iso).length > 0;
          const isSel = iso === selected;

          let bg = "transparent";
          let color = "var(--a-text)";
          let border = "1px solid var(--a-line)";
          let dot = "";
          if (past) { color = "var(--a-text-3)"; border = "1px solid transparent"; }
          else if (isSel) { bg = "var(--a-accent-strong)"; color = "#fff"; border = "1px solid transparent"; }
          else if (hasOverride) { bg = open ? "var(--a-accent-soft-2)" : "var(--s-danger-soft)"; color = open ? "var(--a-accent-quiet)" : "var(--s-danger)"; border = "1px solid transparent"; dot = open ? "var(--a-accent)" : "var(--s-danger)"; }
          else if (!open) { color = "var(--a-text-3)"; }
          else { dot = "var(--a-text-3)"; }

          return (
            <button key={iso} type="button" disabled={past} onClick={() => setSelected(isSel ? null : iso)} className="ax-num" style={{ position: "relative", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, fontSize: 13, fontWeight: 550, background: bg, color, border, opacity: past ? 0.4 : 1, cursor: past ? "default" : "pointer" }}>
              {day}
              {dot && !isSel && <span style={{ position: "absolute", bottom: 5, width: 4, height: 4, borderRadius: "50%", background: dot }} />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center" style={{ gap: 16, paddingTop: 8 }}>
        <Legend color="var(--a-accent)" label="Custom open" />
        <Legend color="var(--s-danger)" label="Custom closed" />
        <Legend color="var(--a-text-3)" label="Follows weekly" />
      </div>

      {selected ? (
        <div className="ax-card ax-card--quiet" style={{ padding: 16, marginTop: 4 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{longDate(selected)}</span>
            <span className={`ax-badge ${selectedHasOverride ? (selectedSlots.length ? "ax-badge--accent" : "ax-badge--danger") : "ax-badge--neutral"}`}>
              {selectedHasOverride ? (selectedSlots.length ? "Custom hours" : "Closed") : "Weekly hours"}
            </span>
          </div>
          <HoursControl
            slots={selectedSlots}
            onChange={(next) => onChange({ ...dateAvailability, [selected]: next })}
            onResetWeekly={selectedHasOverride ? () => { const nextMap = { ...dateAvailability }; delete nextMap[selected]; onChange(nextMap); } : undefined}
          />
        </div>
      ) : (
        <Hint>Pick a day above to give it its own hours — otherwise every day just uses your weekly schedule.</Hint>
      )}
    </EditorPanel>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 11.5, color: "var(--a-text-3)" }}>{label}</span>
    </div>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "block" }}>
      <span className="ax-label">{label}</span>
      <textarea className="ax-field" rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
