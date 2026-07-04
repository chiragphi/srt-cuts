"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Trash2, MessageSquare, Bell } from "lucide-react";
import type { StorageStats, ActivityItem, CleanupResult } from "@/lib/maintenance";
import { Card, SectionHeading, EmptyState, StatusBadge } from "../primitives";
import { Spinner } from "../primitives";

interface MaintenanceData {
  stats: StorageStats;
  activity: ActivityItem[];
  sms?: { quotaRemaining: number | null; low: boolean; adminAlerts?: boolean };
}

export function SystemView() {
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

  if (loading) return <Spinner />;
  if (!data) return <EmptyState title="Couldn't load system data" body="Try reloading the page." />;

  const { stats, activity, sms } = data;
  const reclaimable = stats.otp.stale + stats.sessions.expired;

  return (
    <div className="space-y-8">
      <Card>
        <SectionHeading
          eyebrow="Storage · auto-cleans monthly"
          title="System health"
          action={
            <span style={{ display: "inline-flex", width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, background: "var(--a-surface-3)", color: "var(--a-text-3)" }}>
              <Database size={18} />
            </span>
          }
        />
        <div style={{ display: "grid", gap: "var(--a-gap)", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <Stat label="Login codes" value={stats.otp.total} sub={`${stats.otp.stale} stale`} flag={stats.otp.stale > 0} />
          <Stat label="Sessions" value={stats.sessions.total} sub={`${stats.sessions.expired} expired`} flag={stats.sessions.expired > 0} />
          <Stat label="Bookings" value={stats.bookings.total} sub={`${stats.bookings.pending} pending`} />
          <Stat label="Customers" value={stats.users.total} sub="kept forever" />
          <Stat label="Texts left" value={sms?.quotaRemaining ?? "—"} sub={sms?.low ? "low — top up" : "~$0.01 each"} flag={sms?.low} icon={<MessageSquare size={14} />} />
          <Stat label="Admin alerts" value={sms?.adminAlerts ? "On" : "Off"} sub={sms?.adminAlerts ? "ADMIN_PHONE set" : "set ADMIN_PHONE"} flag={sms?.adminAlerts === false} icon={<Bell size={14} />} />
        </div>

        <div
          className="ax-card ax-card--quiet"
          style={{ marginTop: 20, padding: 18, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 620 }}>
              {reclaimable > 0 ? (
                <>
                  <span style={{ color: "var(--a-accent-quiet)" }}>{reclaimable}</span> rows ready to clear
                </>
              ) : (
                "Storage optimized"
              )}
            </div>
            <p style={{ fontSize: 13, color: "var(--a-text-3)", marginTop: 4 }}>
              Removes used login codes and expired sessions. Bookings and customers are never touched.
            </p>
            {message && <p style={{ fontSize: 13, color: "var(--a-accent-quiet)", marginTop: 6, fontWeight: 550 }}>{message}</p>}
          </div>
          <button className="ax-btn ax-btn--primary" disabled={cleaning} onClick={cleanup}>
            <Trash2 size={15} /> {cleaning ? "Cleaning…" : "Clean up now"}
          </button>
        </div>
      </Card>

      <Card>
        <SectionHeading eyebrow="Recent" title="Activity" />
        {activity.length === 0 ? (
          <EmptyState title="No activity yet" body="New bookings and status changes will appear here." />
        ) : (
          <div className="space-y-2">
            {activity.map((a) => {
              const when = a.at
                ? new Date(a.at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                : "";
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-4"
                  style={{ padding: "12px 14px", borderRadius: "var(--a-r-sm)", background: "var(--a-surface-2)" }}
                >
                  <div className="min-w-0">
                    <div className="truncate" style={{ fontSize: 14.5, fontWeight: 550 }}>
                      {a.customer}
                    </div>
                    <div className="ax-num" style={{ fontSize: 12.5, color: "var(--a-text-3)" }}>
                      {a.service} · {a.bookingDate}
                      {a.bookingTime ? ` at ${a.bookingTime}` : ""}
                      {when ? ` · ${when}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={a.kind} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  flag,
  icon,
}: {
  label: string;
  value: number | string;
  sub: string;
  flag?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {icon && <span style={{ color: "var(--a-text-3)" }}>{icon}</span>}
        <span className="ax-eyebrow">{label}</span>
      </div>
      <div className="ax-num" style={{ fontSize: 27, fontWeight: 640, marginTop: 8 }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: flag ? "var(--a-accent-quiet)" : "var(--a-text-3)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}
