"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarClock, Inbox, TriangleAlert } from "lucide-react";
import {
  revenueSummary,
  clientInsights,
  scheduleInsights,
  isActive,
  type RangeKey,
} from "@/lib/analytics";
import { useAdmin } from "../data";
import { StatTile, Card, SectionHeading, EmptyState, Avatar, StatusBadge } from "../primitives";
import { Sparkline, AreaChart, Meter } from "../charts";
import { Reveal } from "../motion";
import { money, moneyCompact, relativeDays } from "../format";

const RANGES: RangeKey[] = ["week", "month", "year"];
const RANGE_LABEL: Record<RangeKey, string> = { week: "Week", month: "Month", year: "Year" };

export function OverviewView() {
  const { bookings, content, clients, goTo } = useAdmin();
  const [range, setRange] = useState<RangeKey>("month");

  const rev = useMemo(() => revenueSummary(bookings, range), [bookings, range]);
  const ci = useMemo(() => clientInsights(bookings, range, clients), [bookings, range, clients]);
  const sched = useMemo(() => scheduleInsights(bookings, content, range), [bookings, content, range]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const todays = useMemo(
    () =>
      bookings
        .filter((b) => b.booking_date === todayISO && isActive(b))
        .sort((a, b) => a.booking_time.localeCompare(b.booking_time)),
    [bookings, todayISO]
  );
  const pending = bookings.filter((b) => b.status === "pending");
  const atRisk = ci.atRisk.slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 14, color: "var(--a-text-3)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <RangeToggle range={range} onChange={setRange} />
      </div>

      {/* Hero KPIs — one number per tile */}
      <div
        style={{ display: "grid", gap: "var(--a-gap)", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}
      >
        <StatTile
          label={`Revenue · ${RANGE_LABEL[range]}`}
          value={rev.revenue.value}
          format={money}
          delta={rev.revenue.deltaPct}
          spark={<Sparkline values={rev.series.map((p) => p.revenue)} />}
          sub={`${moneyCompact(rev.collected)} collected`}
          emphasis
        />
        <StatTile
          label="Bookings"
          value={rev.bookings.value}
          format={(n) => String(Math.round(n))}
          delta={rev.bookings.deltaPct}
          sub={`Avg ticket ${money(rev.avgTicket)}`}
        />
        <StatTile
          label="Clients"
          value={ci.total}
          format={(n) => String(Math.round(n))}
          sub={`${ci.newInWindow} new · ${ci.returning} returning`}
        />
        <StatTile
          label="Utilization"
          value={Math.round(sched.utilization * 100)}
          format={(n) => `${Math.round(n)}%`}
          sub={`${sched.bookedSlots}/${sched.availableSlots} slots booked`}
        />
      </div>

      {/* Revenue trend */}
      <Reveal>
        <Card>
          <SectionHeading eyebrow={`Trend · last ${RANGE_LABEL[range].toLowerCase()}`} title="Revenue over time" />
          <AreaChart
            values={rev.series.map((p) => p.revenue)}
            labels={rev.series.map((p) => p.label)}
            format={money}
          />
        </Card>
      </Reveal>

      {/* Today + nudges */}
      <div style={{ display: "grid", gap: "var(--a-gap)", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Reveal>
          <Card>
            <SectionHeading
              eyebrow="Today"
              title="Schedule"
              action={
                <button className="ax-link" style={{ fontSize: 13 }} onClick={() => goTo("calendar")}>
                  Open calendar
                </button>
              }
            />
            {todays.length === 0 ? (
              <EmptyState icon={<CalendarClock size={20} />} title="Nothing booked today" body="A clear chair. Enjoy it, or open the calendar to see what's ahead." />
            ) : (
              <div className="space-y-2">
                {todays.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3"
                    style={{ padding: "12px 14px", borderRadius: "var(--a-r-sm)", background: "var(--a-surface-2)" }}
                  >
                    <span className="ax-num" style={{ fontSize: 13, fontWeight: 600, width: 66, color: "var(--a-text-2)" }}>
                      {b.booking_time}
                    </span>
                    <Avatar name={b.user_name} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate" style={{ fontSize: 14.5, fontWeight: 550 }}>
                        {b.user_name}
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--a-text-3)" }}>{b.service}</div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="space-y-6">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="ax-eyebrow" style={{ marginBottom: 8 }}>
                    Needs a decision
                  </p>
                  <div className="ax-num" style={{ fontSize: 34, fontWeight: 640, lineHeight: 1 }}>
                    {pending.length}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--a-text-3)", marginTop: 6 }}>
                    pending booking{pending.length === 1 ? "" : "s"} awaiting accept or deny
                  </p>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    width: 42,
                    height: 42,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    background: "var(--s-warn-soft)",
                    color: "var(--s-warn)",
                    flex: "none",
                  }}
                >
                  <Inbox size={19} />
                </span>
              </div>
              {pending.length > 0 && (
                <button
                  className="ax-btn ax-btn--soft ax-btn--sm"
                  style={{ marginTop: 16 }}
                  onClick={() => goTo("bookings")}
                >
                  Review queue <ArrowRight size={15} />
                </button>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
                <TriangleAlert size={16} style={{ color: "var(--s-danger)" }} />
                <p className="ax-eyebrow">At-risk clients</p>
              </div>
              {atRisk.length === 0 ? (
                <p style={{ fontSize: 13.5, color: "var(--a-text-3)", lineHeight: 1.55 }}>
                  No one has slipped away. Everyone with a past visit has been back recently or has an
                  upcoming appointment.
                </p>
              ) : (
                <div className="space-y-2">
                  {atRisk.map((c) => (
                    <div key={c.phone} className="flex items-center gap-3">
                      <Avatar name={c.name} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate" style={{ fontSize: 14, fontWeight: 550 }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--a-text-3)" }}>
                          Last seen {relativeDays(c.daysSinceLast)}
                        </div>
                      </div>
                      <span className="ax-num" style={{ fontSize: 13, color: "var(--a-text-2)" }}>
                        {money(c.spend)}
                      </span>
                    </div>
                  ))}
                  <button className="ax-link" style={{ fontSize: 13, marginTop: 4 }} onClick={() => goTo("clients")}>
                    See all clients
                  </button>
                </div>
              )}
            </Card>

            <Card>
              <p className="ax-eyebrow" style={{ marginBottom: 14 }}>
                Chair utilization · {RANGE_LABEL[range].toLowerCase()}
              </p>
              <Meter value={sched.utilization} label="Booked vs. available" />
            </Card>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

export function RangeToggle({ range, onChange }: { range: RangeKey; onChange: (r: RangeKey) => void }) {
  return (
    <div className="ax-seg" role="tablist" aria-label="Time range">
      {RANGES.map((r) => (
        <button key={r} role="tab" aria-selected={range === r} data-active={range === r} onClick={() => onChange(r)}>
          {RANGE_LABEL[r]}
        </button>
      ))}
    </div>
  );
}
