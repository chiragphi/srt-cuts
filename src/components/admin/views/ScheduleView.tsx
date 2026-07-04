"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TIME_SLOTS, DAYS_OF_WEEK } from "@/lib/schedule";
import { useAdmin } from "../data";
import { Field, Repeater, SaveBar, EditorPanel } from "../forms";
import { longDate } from "../format";

export function ScheduleView() {
  const { content, setContent, saveContent, saving, saveMessage } = useAdmin();

  return (
    <div className="space-y-6">
      <DateAvailabilityEditor
        dateAvailability={content.dateAvailability}
        weeklyAvailability={content.weeklyAvailability}
        onChange={(dateAvailability) => setContent({ ...content, dateAvailability })}
      />
      <WeeklyEditor
        availability={content.weeklyAvailability}
        onChange={(weeklyAvailability) => setContent({ ...content, weeklyAvailability })}
      />
      <EditorPanel title="Blocked dates" hint="Days you're fully closed regardless of the schedule.">
        <Repeater
          items={content.scheduleBlocks}
          empty={{ date: "", reason: "" }}
          addLabel="Add blocked date"
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

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "block" }}>
      <span className="ax-label">{label}</span>
      <textarea className="ax-field" rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function SlotChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ax-num"
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 550,
        cursor: "pointer",
        border: `1px solid ${active ? "transparent" : "var(--a-line-strong)"}`,
        background: active ? "var(--a-accent-strong)" : "transparent",
        color: active ? "#fff" : "var(--a-text-3)",
        transition: "background 0.15s var(--a-ease-out), color 0.15s var(--a-ease-out)",
      }}
    >
      {children}
    </button>
  );
}

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

  function slotsFor(iso: string): string[] {
    return iso in dateAvailability
      ? dateAvailability[iso]
      : weeklyAvailability[String(new Date(iso + "T00:00:00").getDay())] ?? [];
  }
  function toggle(iso: string, slot: string) {
    const current = slotsFor(iso);
    const next = current.includes(slot)
      ? current.filter((t) => t !== slot)
      : [...current, slot].sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b));
    onChange({ ...dateAvailability, [iso]: next });
  }
  function setAll(iso: string) {
    onChange({ ...dateAvailability, [iso]: [...TIME_SLOTS] });
  }
  function clearAll(iso: string) {
    onChange({ ...dateAvailability, [iso]: [] });
  }
  function clearOverride(iso: string) {
    const next = { ...dateAvailability };
    delete next[iso];
    onChange(next);
  }

  const selectedSlots = selected ? slotsFor(selected) : [];
  const selectedHasOverride = selected ? selected in dateAvailability : false;

  return (
    <EditorPanel title="Date-specific hours" hint="Tap a day to set its hours. Overrides beat the weekly schedule; days without one use the weekly default.">
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <button
          type="button"
          onClick={() => setView(new Date(y, m - 1, 1))}
          disabled={viewYM <= minYM}
          aria-label="Previous month"
          className="ax-btn ax-btn--sm"
          style={{ width: 38, height: 38, minHeight: 38, padding: 0 }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{monthLabel}</span>
        <button
          type="button"
          onClick={() => setView(new Date(y, m + 1, 1))}
          aria-label="Next month"
          className="ax-btn ax-btn--sm"
          style={{ width: 38, height: 38, minHeight: 38, padding: 0 }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7" style={{ gap: 4 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center" style={{ fontSize: 11, color: "var(--a-text-3)", paddingBottom: 4 }}>
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} style={{ aspectRatio: "1" }} />;
          const iso = toISO(y, m, day);
          const past = iso < todayISO;
          const hasOverride = iso in dateAvailability;
          const slots = slotsFor(iso);
          const open = slots.length > 0;
          const isSel = iso === selected;

          let bg = "transparent";
          let color = "var(--a-text)";
          let border = "1px solid var(--a-line)";
          let dot = "";
          if (past) {
            color = "var(--a-text-3)";
            border = "1px solid transparent";
          } else if (isSel) {
            bg = "var(--a-accent-strong)";
            color = "#fff";
            border = "1px solid transparent";
          } else if (hasOverride) {
            bg = open ? "var(--a-accent-soft-2)" : "var(--s-danger-soft)";
            color = open ? "var(--a-accent-quiet)" : "var(--s-danger)";
            border = "1px solid transparent";
            dot = open ? "var(--a-accent)" : "var(--s-danger)";
          } else if (!open) {
            color = "var(--a-text-3)";
          } else {
            dot = "var(--a-text-3)";
          }

          return (
            <button
              key={iso}
              type="button"
              disabled={past}
              onClick={() => setSelected(isSel ? null : iso)}
              className="ax-num"
              style={{
                position: "relative",
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 550,
                background: bg,
                color,
                border,
                opacity: past ? 0.4 : 1,
                cursor: past ? "default" : "pointer",
                transition: "transform 0.1s var(--a-ease-out)",
              }}
            >
              {day}
              {dot && !isSel && (
                <span style={{ position: "absolute", bottom: 5, width: 4, height: 4, borderRadius: "50%", background: dot }} />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4" style={{ paddingTop: 8 }}>
        <Legend color="var(--a-accent)" label="Override open" />
        <Legend color="var(--s-danger)" label="Override closed" />
        <Legend color="var(--a-text-3)" label="Weekly default" />
      </div>

      {selected && (
        <div className="ax-card ax-card--quiet" style={{ padding: 16, marginTop: 4 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{longDate(selected)}</span>
            <span
              className={`ax-badge ${
                selectedHasOverride ? (selectedSlots.length ? "ax-badge--accent" : "ax-badge--danger") : "ax-badge--neutral"
              }`}
            >
              {selectedHasOverride
                ? selectedSlots.length === 0
                  ? "Closed (override)"
                  : `${selectedSlots.length} slots (override)`
                : selectedSlots.length === 0
                ? "Closed (weekly)"
                : `${selectedSlots.length} slots (weekly)`}
            </span>
          </div>
          <div className="flex gap-4" style={{ marginBottom: 14 }}>
            <button className="ax-link" style={{ fontSize: 13 }} onClick={() => setAll(selected)}>
              Select all
            </button>
            <button className="ax-link" style={{ fontSize: 13, color: "var(--s-danger)" }} onClick={() => clearAll(selected)}>
              Close day
            </button>
            {selectedHasOverride && (
              <button className="ax-link" style={{ fontSize: 13, color: "var(--a-text-3)" }} onClick={() => clearOverride(selected)}>
                Reset to weekly
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((slot) => (
              <SlotChip key={slot} active={selectedSlots.includes(slot)} onClick={() => toggle(selected, slot)}>
                {slot}
              </SlotChip>
            ))}
          </div>
        </div>
      )}
    </EditorPanel>
  );
}

function WeeklyEditor({
  availability,
  onChange,
}: {
  availability: Record<string, string[]>;
  onChange: (v: Record<string, string[]>) => void;
}) {
  function toggle(dow: string, slot: string) {
    const current = availability[dow] ?? [];
    const next = current.includes(slot)
      ? current.filter((t) => t !== slot)
      : [...current, slot].sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b));
    onChange({ ...availability, [dow]: next });
  }
  function setAll(dow: string) {
    onChange({ ...availability, [dow]: [...TIME_SLOTS] });
  }
  function clearAll(dow: string) {
    onChange({ ...availability, [dow]: [] });
  }

  return (
    <EditorPanel title="Weekly hours" hint="Only enabled times appear for customers to book.">
      <div className="space-y-5">
        {DAYS_OF_WEEK.map((dayName, dow) => {
          const key = String(dow);
          const active = availability[key] ?? [];
          const allOn = active.length === TIME_SLOTS.length;
          return (
            <div key={key}>
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 14.5, fontWeight: 600 }}>{dayName}</p>
                <button className="ax-link" style={{ fontSize: 13 }} onClick={() => (allOn ? clearAll(key) : setAll(key))}>
                  {allOn ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {TIME_SLOTS.map((slot) => (
                  <SlotChip key={slot} active={active.includes(slot)} onClick={() => toggle(key, slot)}>
                    {slot}
                  </SlotChip>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </EditorPanel>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 11.5, color: "var(--a-text-3)" }}>{label}</span>
    </div>
  );
}
