"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Scissors } from "lucide-react";

interface Booking {
  status: string;
}

const CUTS_REQUIRED = 5;

export default function LoyaltyCard({ className = "" }: { className?: string }) {
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

  if (accepted === null) return null;

  const cycleCount = accepted % CUTS_REQUIRED;
  const totalCycles = Math.floor(accepted / CUTS_REQUIRED);
  const earned = cycleCount === 0 && accepted > 0;
  const cutsLeft = earned ? 0 : CUTS_REQUIRED - cycleCount;
  const progress = earned ? CUTS_REQUIRED : cycleCount;

  return (
    <motion.div
      className={`app-card p-5 ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: earned
          ? "linear-gradient(135deg, rgba(239,234,255,0.98), rgba(255,255,255,0.9))"
          : undefined,
        borderColor: earned ? "rgba(118,87,255,0.3)" : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-[#4d35d8] mb-1">
            Loyalty Rewards
          </p>
          <p className="font-semibold text-[#17151f] text-base leading-snug">
            {earned
              ? "Free lineup earned!"
              : `${cutsLeft} cut${cutsLeft === 1 ? "" : "s"} to your free lineup`}
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#efeaff] text-[#4d35d8]">
          <Scissors size={18} />
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-3">
        {Array.from({ length: CUTS_REQUIRED }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 h-2 rounded-full"
            style={{
              background:
                i < progress
                  ? "linear-gradient(90deg, #7657ff, #4d35d8)"
                  : "rgba(66,56,104,0.1)",
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, delay: i * 0.07, ease: "easeOut" }}
          />
        ))}
      </div>

      <p className="text-xs text-[#6f6a7c]">
        {earned
          ? "Mention this at your next appointment and your lineup is on us."
          : `${progress} of ${CUTS_REQUIRED} cuts complete${totalCycles > 0 ? ` · ${totalCycles} free cut${totalCycles === 1 ? "" : "s"} claimed` : ""}`}
      </p>
    </motion.div>
  );
}
