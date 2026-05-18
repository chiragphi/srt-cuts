"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface Booking {
  id: string;
  user_name: string;
  user_phone: string;
  service: string;
  booking_date: string;
  booking_time: string;
  notes: string;
  status: "pending" | "accepted" | "denied";
  created_at: string;
}

const STATUS_COLORS = {
  pending: { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.3)", text: "#FCD34D" },
  accepted: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.28)", text: "#4ADE80" },
  denied: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.28)", text: "#F87171" },
};

const TABS = ["All", "Pending", "Accepted", "Denied"] as const;
type Tab = typeof TABS[number];

export default function AdminPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("All");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/bookings");
    if (res.status === 403 || res.status === 401) {
      router.replace("/");
      return;
    }
    const d = await res.json();
    setBookings(d.bookings ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, status: "accepted" | "denied") {
    setActing(id + status);
    await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActing(null);
    await load();
  }

  const filtered = bookings.filter((b) =>
    tab === "All" ? true : b.status === tab.toLowerCase()
  );

  const counts = {
    All: bookings.length,
    Pending: bookings.filter((b) => b.status === "pending").length,
    Accepted: bookings.filter((b) => b.status === "accepted").length,
    Denied: bookings.filter((b) => b.status === "denied").length,
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Top bar */}
      <div
        className="sticky top-0 z-40"
        style={{
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/srt-logo.png"
              alt="SRT"
              width={28}
              height={28}
              className="object-contain"
              style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.7))" }}
            />
            <span className="text-sm font-semibold tracking-wider text-white/80 uppercase">
              Admin
            </span>
          </div>
          <button
            className="text-sm text-white/35 hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer font-sans"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/");
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1
            className="font-semibold text-white mb-1"
            style={{ fontSize: 36, letterSpacing: "-0.03em" }}
          >
            Bookings
          </h1>
          <p className="text-sm" style={{ color: "#6E6E73" }}>
            {counts.Pending} pending · {counts.Accepted} accepted · {counts.Denied} denied
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-sm transition-all duration-200 font-sans cursor-pointer border-none"
              style={{
                background: tab === t ? "rgba(139,92,246,0.2)" : "transparent",
                color: tab === t ? "#C4B5FD" : "#6E6E73",
                border: tab === t ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
              }}
            >
              {t}
              {counts[t] > 0 && (
                <span
                  className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: t === "Pending" ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.08)",
                    color: t === "Pending" ? "#FCD34D" : "#86868B",
                  }}
                >
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Booking list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "#6E6E73" }}>
            <p className="text-4xl mb-4">✦</p>
            <p className="text-sm">No {tab.toLowerCase()} bookings</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filtered.map((b, i) => {
                const sc = STATUS_COLORS[b.status];
                const displayDate = new Date(b.booking_date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                });

                return (
                  <motion.div
                    key={b.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="rounded-2xl p-5"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Left info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-medium text-white text-base truncate">
                            {b.user_name}
                          </p>
                          <span
                            className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}
                          >
                            {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: "#86868B" }}>
                          <span>{b.service}</span>
                          <span>·</span>
                          <span>{displayDate}</span>
                          <span>·</span>
                          <span>{b.booking_time}</span>
                          <span>·</span>
                          <a
                            href={`tel:${b.user_phone}`}
                            className="hover:text-purple-400 transition-colors"
                          >
                            {b.user_phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")}
                          </a>
                        </div>

                        {b.notes && (
                          <p
                            className="text-sm mt-2 italic"
                            style={{ color: "#6E6E73" }}
                          >
                            "{b.notes}"
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      {b.status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border-none"
                            style={{
                              background: "rgba(34,197,94,0.1)",
                              border: "1px solid rgba(34,197,94,0.25)",
                              color: "#4ADE80",
                            }}
                            disabled={!!acting}
                            onClick={() => act(b.id, "accepted")}
                          >
                            {acting === b.id + "accepted" ? "…" : "Accept"}
                          </button>
                          <button
                            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border-none"
                            style={{
                              background: "rgba(239,68,68,0.09)",
                              border: "1px solid rgba(239,68,68,0.22)",
                              color: "#F87171",
                            }}
                            disabled={!!acting}
                            onClick={() => act(b.id, "denied")}
                          >
                            {acting === b.id + "denied" ? "…" : "Deny"}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
