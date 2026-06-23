"use client";

import { useEffect, useState } from "react";

interface Booking {
  status: string;
}

const CUTS_REQUIRED = 5;

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`panel-fill p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="shimmer h-3 w-32 rounded-full" />
        <div className="shimmer h-3 w-16 rounded-full" />
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: CUTS_REQUIRED }).map((_, i) => (
          <div key={i} className="shimmer h-9 flex-1 rounded-[3px]" />
        ))}
      </div>
    </div>
  );
}

export default function LoyaltyCard({ className = "" }: { className?: string; dark?: boolean }) {
  const [accepted, setAccepted] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { bookings: Booking[] } | null) => {
        if (!d) return;
        setAccepted(d.bookings.filter((b) => b.status === "accepted").length);
      })
      .catch(() => {});
  }, []);

  if (accepted === null) return <Skeleton className={className} />;

  const cycleCount = accepted % CUTS_REQUIRED;
  const totalCycles = Math.floor(accepted / CUTS_REQUIRED);
  const earned = cycleCount === 0 && accepted > 0;
  const cutsLeft = earned ? 0 : CUTS_REQUIRED - cycleCount;
  const filled = earned ? CUTS_REQUIRED : cycleCount;

  return (
    <div
      className={`panel-fill p-5 ${className}`}
      style={earned ? { borderColor: "var(--accent)" } : undefined}
    >
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Loyalty / Punch card</p>
          <p className="font-display text-2xl uppercase leading-none">
            {earned ? (
              <>
                Free lineup <span className="hot">unlocked</span>
              </>
            ) : (
              <>
                {cutsLeft} to a <span className="hot">free lineup</span>
              </>
            )}
          </p>
        </div>
        <span className="spec shrink-0 text-sm text-[var(--mute)]">
          {String(filled).padStart(2, "0")}/{String(CUTS_REQUIRED).padStart(2, "0")}
        </span>
      </div>

      <div className="flex gap-1.5">
        {Array.from({ length: CUTS_REQUIRED }).map((_, i) => (
          <div
            key={i}
            className="flex h-9 flex-1 items-center justify-center rounded-[3px] border"
            style={{
              background: i < filled ? "var(--accent)" : "transparent",
              borderColor: i < filled ? "transparent" : "var(--line-strong)",
              color: i < filled ? "#1a0c05" : "var(--mute)",
            }}
          >
            <span className="font-mono text-[11px] font-bold">{String(i + 1).padStart(2, "0")}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--mute)]">
        {earned
          ? "Mention it at your next appointment — it's on the house."
          : totalCycles > 0
          ? `${totalCycles} free cut${totalCycles === 1 ? "" : "s"} claimed so far`
          : "5 accepted cuts earns a free lineup"}
      </p>
    </div>
  );
}
