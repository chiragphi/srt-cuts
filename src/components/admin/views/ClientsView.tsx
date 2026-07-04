"use client";

import { useMemo, useState } from "react";
import { Search, UserRoundCheck, Users, TrendingUp, Star } from "lucide-react";
import type { ClientSummary } from "@/lib/analytics";
import { formatPhone } from "@/lib/analytics";
import { useAdmin } from "../data";
import { Card, Avatar, EmptyState, DataPoint } from "../primitives";
import { money, relativeDays, shortDate } from "../format";
import { Reveal } from "../motion";

type Sort = "recent" | "spend" | "visits";

export function ClientsView() {
  const { clients, impersonate, impersonatingPhone } = useAdmin();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [selected, setSelected] = useState<string | null>(clients[0]?.phone ?? null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let arr = clients.filter(
      (c) => !needle || c.name.toLowerCase().includes(needle) || c.phone.includes(needle.replace(/\D/g, ""))
    );
    arr = [...arr].sort((a, b) => {
      if (sort === "spend") return b.spend - a.spend;
      if (sort === "visits") return b.visits - a.visits;
      return (b.lastVisit?.getTime() ?? 0) - (a.lastVisit?.getTime() ?? 0);
    });
    return arr;
  }, [clients, q, sort]);

  const current = clients.find((c) => c.phone === selected) ?? list[0] ?? null;

  const summary = useMemo(() => {
    const returning = clients.filter((c) => c.visits > 1).length;
    const atRisk = clients.filter((c) => c.atRisk).length;
    const ltv = clients.filter((c) => c.spend > 0);
    const avg = ltv.length ? Math.round(ltv.reduce((s, c) => s + c.spend, 0) / ltv.length) : 0;
    return { total: clients.length, returning, atRisk, avg };
  }, [clients]);

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={<Users size={20} />}
        title="No clients yet"
        body="Once customers start booking, they'll show up here with their history, spend, and visit cadence."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary strip */}
      <div style={{ display: "grid", gap: "var(--a-gap)", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <MiniStat label="Total clients" value={String(summary.total)} />
        <MiniStat label="Returning" value={String(summary.returning)} icon={<TrendingUp size={16} />} />
        <MiniStat label="Avg lifetime value" value={money(summary.avg)} icon={<Star size={16} />} />
        <MiniStat label="At risk" value={String(summary.atRisk)} tone={summary.atRisk > 0 ? "danger" : "neutral"} />
      </div>

      <div style={{ display: "grid", gap: "var(--a-gap)", gridTemplateColumns: "minmax(0, 1fr)" }} className="lg:grid-cols-[minmax(300px,380px)_1fr]">
        {/* List */}
        <div className="space-y-3">
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--a-text-3)" }} />
            <input
              className="ax-field"
              style={{ paddingLeft: 36 }}
              placeholder="Search clients"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="ax-seg" style={{ width: "100%" }}>
            {(["recent", "spend", "visits"] as Sort[]).map((s) => (
              <button key={s} data-active={sort === s} onClick={() => setSort(s)} style={{ flex: 1 }}>
                {s === "recent" ? "Recent" : s === "spend" ? "Spend" : "Visits"}
              </button>
            ))}
          </div>
          <div className="space-y-1.5" style={{ maxHeight: "58vh", overflowY: "auto", paddingRight: 4 }}>
            {list.map((c) => {
              const active = current?.phone === c.phone;
              return (
                <button
                  key={c.phone}
                  onClick={() => setSelected(c.phone)}
                  className="flex w-full items-center gap-3 text-left"
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--a-r-sm)",
                    background: active ? "var(--a-surface-3)" : "transparent",
                    border: `1px solid ${active ? "var(--a-line-strong)" : "transparent"}`,
                    cursor: "pointer",
                    transition: "background 0.15s var(--a-ease-out)",
                  }}
                >
                  <Avatar name={c.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ fontSize: 14.5, fontWeight: 550 }}>
                      {c.name}
                    </div>
                    <div className="ax-num" style={{ fontSize: 12.5, color: "var(--a-text-3)" }}>
                      {c.visits} visit{c.visits === 1 ? "" : "s"} · {money(c.spend)}
                    </div>
                  </div>
                  {c.atRisk && <span className="ax-badge ax-badge--danger">At risk</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        {current && (
          <Reveal key={current.phone}>
            <ClientDetail client={current} onViewAs={() => impersonate(current.phone)} busy={impersonatingPhone === current.phone} />
          </Reveal>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "danger";
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="ax-eyebrow">{label}</span>
        {icon && <span style={{ color: "var(--a-text-3)" }}>{icon}</span>}
      </div>
      <div
        className="ax-num"
        style={{ marginTop: 12, fontSize: 30, fontWeight: 640, color: tone === "danger" ? "var(--s-danger)" : "var(--a-text)" }}
      >
        {value}
      </div>
    </Card>
  );
}

function ClientDetail({ client, onViewAs, busy }: { client: ClientSummary; onViewAs: () => void; busy: boolean }) {
  const history = [...client.bookings].sort((a, b) => b.booking_date.localeCompare(a.booking_date));
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={client.name} size={56} />
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 640, letterSpacing: "-0.02em" }}>{client.name}</h2>
            <p className="ax-num" style={{ fontSize: 13.5, color: "var(--a-text-3)", marginTop: 2 }}>
              {formatPhone(client.phone)}
            </p>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {client.isNew && <span className="ax-badge ax-badge--accent">New</span>}
              {client.atRisk && <span className="ax-badge ax-badge--danger">At risk</span>}
              {client.upcoming > 0 && <span className="ax-badge ax-badge--ok">{client.upcoming} upcoming</span>}
            </div>
          </div>
        </div>
        <button className="ax-btn ax-btn--soft" onClick={onViewAs} disabled={busy}>
          <UserRoundCheck size={16} /> {busy ? "Opening…" : "View as customer"}
        </button>
      </div>

      <div
        className="ax-hr"
        style={{ margin: "22px 0" }}
      />

      <div style={{ display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
        <DataPoint label="Lifetime value" value={money(client.spend)} />
        <DataPoint label="Collected" value={money(client.collected)} />
        <DataPoint label="Visits" value={client.visits} />
        <DataPoint label="Visit cadence" value={client.cadenceDays ? `${client.cadenceDays}d` : "—"} />
        <DataPoint label="Last visit" value={relativeDays(client.daysSinceLast)} />
        <DataPoint label="First seen" value={client.firstVisit ? shortDate(client.firstVisit.toISOString().slice(0, 10)) : "—"} />
      </div>

      <div style={{ marginTop: 26 }}>
        <p className="ax-eyebrow" style={{ marginBottom: 12 }}>
          Booking history
        </p>
        <div className="space-y-2">
          {history.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-3"
              style={{ padding: "11px 14px", borderRadius: "var(--a-r-sm)", background: "var(--a-surface-2)" }}
            >
              <div className="min-w-0">
                <div style={{ fontSize: 14, fontWeight: 550 }}>{b.service}</div>
                <div className="ax-num" style={{ fontSize: 12.5, color: "var(--a-text-3)" }}>
                  {shortDate(b.booking_date)} · {b.booking_time}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="ax-num" style={{ fontSize: 13, color: "var(--a-text-2)" }}>
                  {money(b.service_price_cents ?? 0)}
                </span>
                <span
                  className={`ax-badge ${
                    b.status === "accepted"
                      ? "ax-badge--ok"
                      : b.status === "pending"
                      ? "ax-badge--warn"
                      : "ax-badge--neutral"
                  }`}
                >
                  {b.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
