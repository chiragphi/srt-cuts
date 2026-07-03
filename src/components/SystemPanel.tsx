"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Database, Trash2, X } from "lucide-react";
import type { StorageStats, ActivityItem, CleanupResult } from "@/lib/maintenance";

interface MaintenanceData {
  stats: StorageStats;
  activity: ActivityItem[];
  sms?: { quotaRemaining: number | null; low: boolean };
}

const STATUS = {
  pending: { label: "Pending", icon: Clock, color: "#8a6d12", bg: "rgba(154,123,26,0.12)" },
  accepted: { label: "Accepted", icon: Check, color: "#2f7d46", bg: "rgba(47,125,70,0.12)" },
  denied: { label: "Denied", icon: X, color: "#c5360e", bg: "rgba(197,54,14,0.12)" },
};

export default function SystemPanel() {
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/maintenance");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function cleanup() {
    setCleaning(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/maintenance", { method: "POST" });
      if (!res.ok) throw new Error();
      const d = (await res.json()) as { removed: CleanupResult; stats: StorageStats };
      setData((prev) => (prev ? { ...prev, stats: d.stats } : prev));
      const total = d.removed.otpRemoved + d.removed.sessionsRemoved;
      setMessage(
        total === 0
          ? "Already optimized — nothing to clear."
          : `Cleared ${d.removed.otpRemoved} login code${d.removed.otpRemoved === 1 ? "" : "s"} and ${d.removed.sessionsRemoved} expired session${d.removed.sessionsRemoved === 1 ? "" : "s"}.`
      );
    } catch {
      setMessage("Cleanup failed. Try again.");
    } finally {
      setCleaning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="spin h-6 w-6 rounded-full border-2 border-[var(--line-strong)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!data) {
    return <div className="py-20 text-center text-sm text-[var(--mute)]">Couldn&apos;t load system data.</div>;
  }

  const { stats, activity, sms } = data;
  const reclaimable = stats.otp.stale + stats.sessions.expired;

  return (
    <div className="space-y-6">
      {/* Storage & cleanup */}
      <section className="panel-fill space-y-5 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-2xl uppercase">
            <Database size={18} className="text-[var(--accent-deep)]" /> Storage
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--mute)]">Auto-cleans monthly</span>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Login codes" value={stats.otp.total} sub={`${stats.otp.stale} stale`} flag={stats.otp.stale > 0} />
          <StatCard label="Sessions" value={stats.sessions.total} sub={`${stats.sessions.expired} expired`} flag={stats.sessions.expired > 0} />
          <StatCard
            label="Bookings"
            value={stats.bookings.total}
            sub={`${stats.bookings.pending} pending · ${stats.bookings.accepted} accepted`}
          />
          <StatCard label="Customers" value={stats.users.total} sub="kept forever" />
          <StatCard
            label="Texts left"
            value={sms?.quotaRemaining ?? "—"}
            sub={sms?.low ? "low — top up at textbelt.com" : "~$0.01 per text"}
            flag={sms?.low}
            className="col-span-2 lg:col-span-1"
          />
        </div>

        <div className="flex flex-col gap-3 rounded-[4px] border border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg uppercase leading-none">
              {reclaimable > 0 ? (
                <>
                  <span className="hot">{reclaimable}</span> rows ready to clear
                </>
              ) : (
                <>Storage optimized</>
              )}
            </p>
            <p className="mt-1.5 text-sm text-[var(--mute)]">
              Removes used login codes and expired sessions. Bookings and customers are never touched.
            </p>
            {message && <p className="mt-2 font-mono text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--accent-deep)]">{message}</p>}
          </div>
          <button className="btn btn--accent !min-h-[46px] shrink-0" disabled={cleaning} onClick={cleanup}>
            <Trash2 size={15} /> {cleaning ? "Cleaning…" : "Clean up now"}
          </button>
        </div>
      </section>

      {/* Activity */}
      <section className="panel-fill space-y-5 p-4 sm:p-6">
        <h2 className="font-display text-2xl uppercase">Recent activity</h2>
        {activity.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--mute)]">No activity yet.</div>
        ) : (
          <div className="space-y-2">
            {activity.map((a, i) => {
              const cfg = STATUS[a.kind] ?? STATUS.pending;
              const Icon = cfg.icon;
              const when = a.at
                ? new Date(a.at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                : "";
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.03 }}
                  className="flex items-center justify-between gap-4 rounded-[4px] border border-[var(--line)] p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg uppercase leading-none">{a.customer}</p>
                    <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--mute)]">
                      {a.service} · {a.bookingDate}
                      {a.bookingTime ? ` at ${a.bookingTime}` : ""}
                      {when ? ` · booked ${when}` : ""}
                    </p>
                  </div>
                  <span
                    className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em]"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    <Icon size={12} strokeWidth={3} /> {cfg.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  flag,
  className = "",
}: {
  label: string;
  value: number | string;
  sub: string;
  flag?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-[4px] border border-[var(--line)] p-4 ${className}`}>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--mute)]">{label}</p>
      <p className="spec mt-2 text-3xl">{value}</p>
      <p
        className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.06em]"
        style={{ color: flag ? "var(--accent-deep)" : "var(--mute)" }}
      >
        {sub}
      </p>
    </div>
  );
}
