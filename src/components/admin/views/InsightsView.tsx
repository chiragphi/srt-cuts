"use client";

import { useMemo, useState } from "react";
import {
  revenueSummary,
  clientInsights,
  scheduleInsights,
  mixInsights,
  type RangeKey,
} from "@/lib/analytics";
import { TIME_SLOTS } from "@/lib/schedule";
import { calculateTaxSummary } from "@/lib/tax";
import { useAdmin } from "../data";
import { Card, SectionHeading, Avatar, DataPoint } from "../primitives";
import { AreaChart, BarRows, Donut, Heatmap, Meter } from "../charts";
import { Reveal } from "../motion";
import { RangeToggle } from "./OverviewView";
import { money, moneyCompact } from "../format";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function InsightsView() {
  const { bookings, content, clients } = useAdmin();
  const [range, setRange] = useState<RangeKey>("month");

  const rev = useMemo(() => revenueSummary(bookings, range), [bookings, range]);
  const ci = useMemo(() => clientInsights(bookings, range, clients), [bookings, range, clients]);
  const sched = useMemo(() => scheduleInsights(bookings, content, range), [bookings, content, range]);
  const mix = useMemo(() => mixInsights(bookings, content), [bookings, content]);
  const tax = useMemo(() => calculateTaxSummary(bookings, content.taxExpenses), [bookings, content.taxExpenses]);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 14, color: "var(--a-text-3)", maxWidth: 460, lineHeight: 1.5 }}>
          Everything below is computed from your real bookings. Toggle the window to compare periods.
        </p>
        <RangeToggle range={range} onChange={setRange} />
      </div>

      {/* Family 1 — revenue & volume */}
      <Reveal>
        <section className="space-y-5">
          <SectionHeading eyebrow="01 · Revenue & volume" title="How the money moved" />
          <Card>
            <div className="mb-6 flex flex-wrap gap-8">
              <DataPoint label="Revenue" value={money(rev.revenue.value)} />
              <DataPoint label="Collected" value={money(rev.collected)} />
              <DataPoint label="Bookings" value={rev.bookings.value} />
              <DataPoint label="Avg ticket" value={money(rev.avgTicket)} />
            </div>
            <AreaChart values={rev.series.map((p) => p.revenue)} labels={rev.series.map((p) => p.label)} height={220} />
          </Card>
          <div style={{ display: "grid", gap: "var(--a-gap)", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <Card>
              <p className="ax-eyebrow" style={{ marginBottom: 16 }}>
                Status breakdown
              </p>
              <BarRows
                data={[
                  { label: "Accepted", value: rev.statusCounts.accepted },
                  { label: "Pending", value: rev.statusCounts.pending },
                  { label: "Denied", value: rev.statusCounts.denied },
                  { label: "Cancelled", value: rev.statusCounts.cancelled },
                ]}
              />
            </Card>
            <Card>
              <p className="ax-eyebrow" style={{ marginBottom: 16 }}>
                Payment method
              </p>
              <Donut
                centerValue={String(rev.paymentSplit.online + rev.paymentSplit.inStore)}
                centerLabel="bookings"
                segments={[
                  { label: "Venmo", value: rev.paymentSplit.online, color: "var(--a-accent)" },
                  { label: "In store", value: rev.paymentSplit.inStore, color: "var(--g-700)" },
                ]}
              />
            </Card>
          </div>
        </section>
      </Reveal>

      {/* Family 2 — clients */}
      <Reveal>
        <section className="space-y-5">
          <SectionHeading eyebrow="02 · Clients" title="Who's coming back" />
          <div style={{ display: "grid", gap: "var(--a-gap)", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <Card>
              <p className="ax-eyebrow" style={{ marginBottom: 16 }}>
                New vs returning · this window
              </p>
              <Donut
                centerValue={String(ci.newVsReturningWindow.neww + ci.newVsReturningWindow.returning)}
                centerLabel="active"
                segments={[
                  { label: "New", value: ci.newVsReturningWindow.neww, color: "var(--a-accent)" },
                  { label: "Returning", value: ci.newVsReturningWindow.returning, color: "var(--s-ok)" },
                ]}
              />
              <div className="ax-hr" style={{ margin: "18px 0" }} />
              <DataPoint label="Avg lifetime value" value={money(ci.avgLifetimeValue)} />
            </Card>
            <Card>
              <p className="ax-eyebrow" style={{ marginBottom: 16 }}>
                Top clients by spend
              </p>
              {ci.topBySpend.length === 0 ? (
                <Empty text="No paid visits yet." />
              ) : (
                <div className="space-y-3">
                  {ci.topBySpend.slice(0, 5).map((c) => (
                    <div key={c.phone} className="flex items-center gap-3">
                      <Avatar name={c.name} size={32} />
                      <span className="min-w-0 flex-1 truncate" style={{ fontSize: 14 }}>
                        {c.name}
                      </span>
                      <span className="ax-num" style={{ fontSize: 13.5, color: "var(--a-text-2)" }}>
                        {money(c.spend)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <p className="ax-eyebrow">At-risk / win-back</p>
                <span className="ax-badge ax-badge--danger">{ci.atRisk.length}</span>
              </div>
              {ci.atRisk.length === 0 ? (
                <Empty text="Nobody has slipped away. Every past client has been back recently or has an appointment coming." />
              ) : (
                <div className="space-y-3">
                  {ci.atRisk.slice(0, 5).map((c) => (
                    <div key={c.phone} className="flex items-center gap-3">
                      <Avatar name={c.name} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate" style={{ fontSize: 14 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "var(--a-text-3)" }}>
                          {c.daysSinceLast}d since last · {money(c.spend)} lifetime
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </section>
      </Reveal>

      {/* Family 3 — schedule & utilization */}
      <Reveal>
        <section className="space-y-5">
          <SectionHeading eyebrow="03 · Schedule" title="When the chair is busy" />
          <Card>
            <div className="mb-6 flex flex-wrap gap-8">
              <DataPoint label="Busiest day" value={sched.busiestDay ? DAY_SHORT[sched.busiestDay.dow] : "—"} />
              <DataPoint label="Busiest time" value={sched.busiestSlot ? sched.busiestSlot.slot : "—"} />
              <DataPoint label="Cancel rate" value={`${Math.round(sched.cancelRate * 100)}%`} />
              <DataPoint label="Deny rate" value={`${Math.round(sched.denyRate * 100)}%`} />
            </div>
            <Heatmap
              cells={sched.heatmap.map((c) => ({ row: c.slotIndex, col: c.dow, count: c.count }))}
              max={sched.maxHeat}
              rows={TIME_SLOTS}
              cols={DAY_SHORT}
            />
          </Card>
          <div style={{ display: "grid", gap: "var(--a-gap)", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <Card>
              <p className="ax-eyebrow" style={{ marginBottom: 16 }}>
                Utilization · this window
              </p>
              <Meter value={sched.utilization} label="Booked vs. available" />
              <p style={{ fontSize: 13, color: "var(--a-text-3)", marginTop: 12 }}>
                {sched.bookedSlots} booked of {sched.availableSlots} open slots.
              </p>
            </Card>
            <Card>
              <p className="ax-eyebrow" style={{ marginBottom: 16 }}>
                Upcoming load · next 14 days
              </p>
              {sched.upcoming.length === 0 ? (
                <Empty text="No upcoming bookings." />
              ) : (
                <BarRows data={sched.upcoming.map((u) => ({ label: u.label, value: u.count }))} />
              )}
            </Card>
          </div>
        </section>
      </Reveal>

      {/* Family 4 — service & payment mix */}
      <Reveal>
        <section className="space-y-5">
          <SectionHeading eyebrow="04 · Service & payment mix" title="What sells, how it's paid" />
          <div style={{ display: "grid", gap: "var(--a-gap)", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <Card>
              <p className="ax-eyebrow" style={{ marginBottom: 16 }}>
                Most-booked services
              </p>
              {mix.services.length === 0 ? (
                <Empty text="No bookings yet." />
              ) : (
                <BarRows data={mix.services.map((s) => ({ label: s.service, value: s.count, caption: `${s.count}` }))} />
              )}
            </Card>
            <Card>
              <p className="ax-eyebrow" style={{ marginBottom: 16 }}>
                Revenue by service
              </p>
              {mix.services.filter((s) => s.revenue > 0).length === 0 ? (
                <Empty text="No accepted revenue yet." />
              ) : (
                <BarRows
                  data={mix.services
                    .filter((s) => s.revenue > 0)
                    .map((s) => ({ label: s.service, value: s.revenue, caption: money(s.revenue) }))}
                />
              )}
            </Card>
            <Card>
              <p className="ax-eyebrow" style={{ marginBottom: 16 }}>
                Tax set-aside snapshot
              </p>
              <div
                style={{
                  borderRadius: "var(--a-r-sm)",
                  border: "1px solid var(--a-accent-line)",
                  background: "var(--a-accent-soft)",
                  padding: 16,
                }}
              >
                <span className="ax-eyebrow">Set aside for taxes</span>
                <div className="ax-num" style={{ fontSize: 30, fontWeight: 640, marginTop: 6, color: "var(--a-text)" }}>
                  {money(tax.guardianSetAside)}
                </div>
                <p style={{ fontSize: 12.5, color: "var(--a-text-3)", marginTop: 4 }}>
                  from {moneyCompact(tax.venmoGross)} paid Venmo sales · {Math.round(tax.effectiveRate * 100)}% effective
                </p>
              </div>
              <div className="ax-hr" style={{ margin: "16px 0" }} />
              <div className="flex flex-wrap gap-6">
                <DataPoint label="Venmo bookings" value={mix.onlineCount} />
                <DataPoint label="In-store" value={mix.inStoreCount} />
                <DataPoint label="Discounted" value={mix.discountedCount} />
              </div>
            </Card>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={{ fontSize: 13.5, color: "var(--a-text-3)", lineHeight: 1.55 }}>{text}</p>;
}
