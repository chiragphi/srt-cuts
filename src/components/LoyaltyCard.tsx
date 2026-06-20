"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Scissors } from "lucide-react";

interface Booking {
  status: string;
}

const CUTS_REQUIRED = 5;

function LoyaltyCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`app-card p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="space-y-2 flex-1">
          <div className="skeleton h-3 w-28 rounded-full" />
          <div className="skeleton h-4 w-44 rounded-full" />
        </div>
        <div className="skeleton h-10 w-10 rounded-2xl shrink-0" />
      </div>
      <div className="flex gap-2 mb-3">
        {Array.from({ length: CUTS_REQUIRED }).map((_, i) => (
          <div key={i} className="skeleton flex-1 h-2 rounded-full" />
        ))}
      </div>
      <div className="skeleton h-3 w-36 rounded-full" />
    </div>
  );
}

export default function LoyaltyCard({ className = "", dark = true }: { className?: string; dark?: boolean }) {
  const [accepted, setAccepted] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { bookings: Booking[] } | null) => {
        if (!d) return;
        const count = d.bookings.filter((b) => b.status === "accepted").length;
        setAccepted(count);
      })
      .catch(() => {});
  }, []);

  if (accepted === null) return <LoyaltyCardSkeleton className={className} />;

  const cycleCount = accepted % CUTS_REQUIRED;
  const totalCycles = Math.floor(accepted / CUTS_REQUIRED);
  const earned = cycleCount === 0 && accepted > 0;
  const cutsLeft = earned ? 0 : CUTS_REQUIRED - cycleCount;
  const progress = earned ? CUTS_REQUIRED : cycleCount;

  // Dark (homepage) vs. light (book / bookings pages) palette.
  const eyebrowColor = dark ? "text-[#e8b84b]" : "text-[#4d35d8]";
  const titleColor = dark ? "text-[#f5f0e6]" : "text-[#17151f]";
  const captionColor = dark ? "text-[#8c857a]" : "text-[#6f6a7c]";
  const iconClass = dark ? "bg-[#d4a017]/15 text-[#e8b84b]" : "bg-[#efeaff] text-[#4d35d8]";
  const filledBar = dark ? "linear-gradient(90deg, #e8b84b, #d4a017)" : "linear-gradient(90deg, #7657ff, #4d35d8)";
  const emptyBar = dark ? "rgba(255,255,255,0.08)" : "rgba(66,56,104,0.1)";

  return (
    <motion.div
      className={`app-card p-5 ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: earned
          ? dark
            ? "linear-gradient(135deg, rgba(212,160,23,0.16), rgba(255,255,255,0.03))"
            : "linear-gradient(135deg, rgba(239,234,255,0.98), rgba(255,255,255,0.9))"
          : undefined,
        borderColor: earned ? (dark ? "rgba(212,160,23,0.4)" : "rgba(118,87,255,0.3)") : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className={`text-xs font-bold tracking-widest uppercase mb-1 ${eyebrowColor}`}>
            Loyalty Rewards
          </p>
          <p className={`font-semibold text-base leading-snug ${titleColor}`}>
            {earned
              ? "Free lineup earned!"
              : `${cutsLeft} cut${cutsLeft === 1 ? "" : "s"} to your free lineup`}
          </p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
          <Scissors size={18} />
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        {Array.from({ length: CUTS_REQUIRED }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 h-2 rounded-full"
            style={{ background: i < progress ? filledBar : emptyBar }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, delay: i * 0.07, ease: "easeOut" }}
          />
        ))}
      </div>

      <p className={`text-xs ${captionColor}`}>
        {earned
          ? "Mention this at your next appointment and your lineup is on us."
          : `${progress} of ${CUTS_REQUIRED} cuts complete${totalCycles > 0 ? ` · ${totalCycles} free cut${totalCycles === 1 ? "" : "s"} claimed` : ""}`}
      </p>
    </motion.div>
  );
}
