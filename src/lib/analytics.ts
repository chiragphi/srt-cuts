// Analytics — every statistic in the admin cockpit is computed here, purely,
// from the live `bookings` table (+ availability from site_content). No new
// backend: these are read-only derivations of data the app already stores.
// Money is in integer cents throughout. All four families in the handoff §7
// are covered: revenue/volume over time, client insights, schedule/utilization,
// and service/payment mix.

import { TIME_SLOTS } from "./schedule";
import type { SiteContent } from "./site-content";

export interface Booking {
  id: string;
  user_id?: string | null;
  user_name: string;
  user_phone: string;
  service: string;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // "9:00 AM"
  notes: string;
  status: "pending" | "accepted" | "denied" | "cancelled";
  service_price_cents: number;
  payment_method: "in_store" | "online";
  payment_status: "pay_in_store" | "unpaid" | "paid" | "refunded";
  created_at: string;
}

export type RangeKey = "week" | "month" | "year";

export const RANGE_LABELS: Record<RangeKey, string> = {
  week: "7 days",
  month: "30 days",
  year: "12 months",
};

// ── Date helpers ──────────────────────────────────────────────────────
const DAY_MS = 86_400_000;

export function parseBookingDate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}
function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

// ── Realized-value model ──────────────────────────────────────────────
// A booking counts as booked revenue once the barber accepts it. Pending is
// potential, denied/cancelled is excluded. "Collected" is money actually in —
// online bookings marked paid.
export function isActive(b: Booking): boolean {
  return b.status !== "denied" && b.status !== "cancelled";
}
export function isRevenue(b: Booking): boolean {
  return b.status === "accepted";
}
export function bookingRevenue(b: Booking): number {
  return isRevenue(b) ? b.service_price_cents ?? 0 : 0;
}
export function isCollected(b: Booking): boolean {
  return b.payment_method === "online" && b.payment_status === "paid";
}

// ── Time buckets ──────────────────────────────────────────────────────
export interface Bucket {
  key: string; // machine key
  label: string; // short axis label
  start: Date;
  end: Date; // exclusive
}
export interface SeriesPoint {
  key: string;
  label: string;
  revenue: number; // cents
  bookings: number; // active count
}

function buildBuckets(range: RangeKey): Bucket[] {
  const today = startOfToday();
  const buckets: Bucket[] = [];
  if (range === "year") {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      buckets.push({
        key: toISO(start).slice(0, 7),
        label: start.toLocaleDateString("en-US", { month: "short" }),
        start,
        end,
      });
    }
  } else {
    const span = range === "week" ? 7 : 30;
    for (let i = span - 1; i >= 0; i--) {
      const start = addDays(today, -i);
      const end = addDays(start, 1);
      buckets.push({
        key: toISO(start),
        label:
          range === "week"
            ? start.toLocaleDateString("en-US", { weekday: "short" })
            : start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        start,
        end,
      });
    }
  }
  return buckets;
}

export function rangeWindow(range: RangeKey): { start: Date; end: Date } {
  const today = startOfToday();
  const end = addDays(today, 1); // include all of today
  if (range === "year") return { start: new Date(today.getFullYear(), today.getMonth() - 11, 1), end };
  const span = range === "week" ? 7 : 30;
  return { start: addDays(today, -(span - 1)), end };
}

export function buildSeries(bookings: Booking[], range: RangeKey): SeriesPoint[] {
  const buckets = buildBuckets(range);
  return buckets.map((bucket) => {
    let revenue = 0;
    let count = 0;
    for (const b of bookings) {
      const d = parseBookingDate(b.booking_date);
      if (d >= bucket.start && d < bucket.end && isActive(b)) {
        count += 1;
        revenue += bookingRevenue(b);
      }
    }
    return { key: bucket.key, label: bucket.label, revenue, bookings: count };
  });
}

// ── Family 1: revenue + volume, hero numbers with deltas ──────────────
export interface HeroStat {
  value: number;
  previous: number;
  deltaPct: number | null; // null when no prior baseline
}
function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

export interface RevenueSummary {
  revenue: HeroStat; // cents, realized in window
  collected: number; // cents actually paid
  bookings: HeroStat; // active count in window
  avgTicket: number; // cents
  series: SeriesPoint[];
  statusCounts: Record<Booking["status"], number>;
  paymentSplit: { online: number; inStore: number }; // active counts
}

export function revenueSummary(bookings: Booking[], range: RangeKey): RevenueSummary {
  const series = buildSeries(bookings, range);
  const { start, end } = rangeWindow(range);
  const spanDays = Math.max(1, daysBetween(start, end));
  const prevStart = addDays(start, -spanDays);

  let revNow = 0;
  let revPrev = 0;
  let bkNow = 0;
  let bkPrev = 0;
  let collected = 0;
  let ticketSum = 0;
  let ticketCount = 0;
  let online = 0;
  let inStore = 0;
  const statusCounts: Record<Booking["status"], number> = {
    pending: 0,
    accepted: 0,
    denied: 0,
    cancelled: 0,
  };

  for (const b of bookings) {
    const d = parseBookingDate(b.booking_date);
    const inNow = d >= start && d < end;
    const inPrev = d >= prevStart && d < start;
    if (inNow) {
      statusCounts[b.status] += 1;
      if (isActive(b)) {
        bkNow += 1;
        if (b.payment_method === "online") online += 1;
        else inStore += 1;
      }
      if (isRevenue(b)) {
        revNow += b.service_price_cents ?? 0;
        ticketSum += b.service_price_cents ?? 0;
        ticketCount += 1;
      }
      if (isCollected(b)) collected += b.service_price_cents ?? 0;
    } else if (inPrev) {
      if (isActive(b)) bkPrev += 1;
      if (isRevenue(b)) revPrev += b.service_price_cents ?? 0;
    }
  }

  return {
    revenue: { value: revNow, previous: revPrev, deltaPct: pctDelta(revNow, revPrev) },
    collected,
    bookings: { value: bkNow, previous: bkPrev, deltaPct: pctDelta(bkNow, bkPrev) },
    avgTicket: ticketCount ? Math.round(ticketSum / ticketCount) : 0,
    series,
    statusCounts,
    paymentSplit: { online, inStore },
  };
}

// ── Family 2: client insights ─────────────────────────────────────────
export interface ClientSummary {
  phone: string;
  name: string;
  bookings: Booking[];
  visits: number; // accepted
  upcoming: number; // pending/accepted with a future date
  spend: number; // cents, accepted
  collected: number; // cents paid
  firstVisit: Date | null;
  lastVisit: Date | null; // last accepted/active date
  daysSinceLast: number | null;
  cadenceDays: number | null; // avg gap between accepted visits
  isNew: boolean; // single active booking / first seen recently
  atRisk: boolean;
}

export const AT_RISK_DAYS = 45;

export function computeClients(bookings: Booking[], atRiskDays = AT_RISK_DAYS): ClientSummary[] {
  const today = startOfToday();
  const map = new Map<string, Booking[]>();
  for (const b of bookings) {
    const key = normalizePhone(b.user_phone) || b.user_phone;
    map.set(key, [...(map.get(key) ?? []), b]);
  }

  const clients: ClientSummary[] = [];
  for (const [phone, rows] of map.entries()) {
    const sorted = [...rows].sort(
      (a, b) => parseBookingDate(a.booking_date).getTime() - parseBookingDate(b.booking_date).getTime()
    );
    const accepted = sorted.filter(isRevenue);
    const active = sorted.filter(isActive);
    const visitDates = accepted.map((b) => parseBookingDate(b.booking_date));
    const activeDates = active.map((b) => parseBookingDate(b.booking_date));
    const firstVisit = activeDates.length ? activeDates[0] : null;
    const pastVisits = visitDates.filter((d) => d <= today);
    const lastVisit = pastVisits.length ? pastVisits[pastVisits.length - 1] : null;
    const upcoming = active.filter((b) => parseBookingDate(b.booking_date) > today).length;

    let cadenceDays: number | null = null;
    if (visitDates.length >= 2) {
      let gapSum = 0;
      for (let i = 1; i < visitDates.length; i++) gapSum += daysBetween(visitDates[i - 1], visitDates[i]);
      cadenceDays = Math.round(gapSum / (visitDates.length - 1));
    }

    const spend = accepted.reduce((s, b) => s + (b.service_price_cents ?? 0), 0);
    const collected = sorted.filter(isCollected).reduce((s, b) => s + (b.service_price_cents ?? 0), 0);
    const daysSinceLast = lastVisit ? daysBetween(lastVisit, today) : null;
    const latestName = sorted[sorted.length - 1]?.user_name || rows[0]?.user_name || "Client";

    clients.push({
      phone,
      name: latestName,
      bookings: sorted,
      visits: accepted.length,
      upcoming,
      spend,
      collected,
      firstVisit,
      lastVisit,
      daysSinceLast,
      cadenceDays,
      isNew: active.length <= 1,
      atRisk: pastVisits.length > 0 && daysSinceLast !== null && daysSinceLast > atRiskDays && upcoming === 0,
    });
  }

  return clients.sort((a, b) => b.spend - a.spend);
}

export interface ClientInsights {
  total: number;
  newInWindow: number;
  returning: number;
  atRisk: ClientSummary[];
  topBySpend: ClientSummary[];
  topByVisits: ClientSummary[];
  avgLifetimeValue: number; // cents
  newVsReturningWindow: { neww: number; returning: number };
}

export function clientInsights(
  bookings: Booking[],
  range: RangeKey,
  clients = computeClients(bookings)
): ClientInsights {
  const { start, end } = rangeWindow(range);
  let newInWindow = 0;
  let returningInWindow = 0;
  for (const c of clients) {
    if (c.firstVisit && c.firstVisit >= start && c.firstVisit < end) newInWindow += 1;
    // returning = client with an active booking in window whose first visit predates window
    const hasActivityInWindow = c.bookings.some((b) => {
      const d = parseBookingDate(b.booking_date);
      return isActive(b) && d >= start && d < end;
    });
    if (hasActivityInWindow && c.firstVisit && c.firstVisit < start) returningInWindow += 1;
  }
  const returning = clients.filter((c) => c.visits > 1).length;
  const withValue = clients.filter((c) => c.spend > 0);
  const avgLifetimeValue = withValue.length
    ? Math.round(withValue.reduce((s, c) => s + c.spend, 0) / withValue.length)
    : 0;

  return {
    total: clients.length,
    newInWindow,
    returning,
    atRisk: clients.filter((c) => c.atRisk).sort((a, b) => (b.spend || 0) - (a.spend || 0)),
    topBySpend: [...clients].sort((a, b) => b.spend - a.spend).filter((c) => c.spend > 0).slice(0, 8),
    topByVisits: [...clients].sort((a, b) => b.visits - a.visits).filter((c) => c.visits > 0).slice(0, 8),
    avgLifetimeValue,
    newVsReturningWindow: { neww: newInWindow, returning: returningInWindow },
  };
}

// ── Family 3: schedule + utilization ──────────────────────────────────
export interface HeatCell {
  dow: number; // 0-6
  slotIndex: number;
  count: number;
}
export interface ScheduleInsights {
  heatmap: HeatCell[];
  maxHeat: number;
  busiestDay: { dow: number; count: number } | null;
  busiestSlot: { slot: string; count: number } | null;
  utilization: number; // 0-1 over trailing window
  bookedSlots: number;
  availableSlots: number;
  cancelRate: number; // cancelled / (all decided)
  denyRate: number;
  upcoming: { date: string; label: string; count: number }[];
}

function slotIndexOf(time: string): number {
  const i = TIME_SLOTS.indexOf(time);
  return i;
}

export function scheduleInsights(bookings: Booking[], content: SiteContent, range: RangeKey): ScheduleInsights {
  // Heatmap over ALL active bookings (busiest patterns are cumulative).
  const grid = new Map<string, number>();
  let maxHeat = 0;
  const dayTotals = new Array(7).fill(0);
  const slotTotals = new Array(TIME_SLOTS.length).fill(0);

  for (const b of bookings) {
    if (!isActive(b)) continue;
    const dow = parseBookingDate(b.booking_date).getDay();
    const si = slotIndexOf(b.booking_time);
    if (si < 0) continue;
    const k = `${dow}:${si}`;
    const next = (grid.get(k) ?? 0) + 1;
    grid.set(k, next);
    if (next > maxHeat) maxHeat = next;
    dayTotals[dow] += 1;
    slotTotals[si] += 1;
  }
  const heatmap: HeatCell[] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let si = 0; si < TIME_SLOTS.length; si++) {
      heatmap.push({ dow, slotIndex: si, count: grid.get(`${dow}:${si}`) ?? 0 });
    }
  }

  const busiestDayIdx = dayTotals.reduce((m, v, i) => (v > dayTotals[m] ? i : m), 0);
  const busiestSlotIdx = slotTotals.reduce((m, v, i) => (v > slotTotals[m] ? i : m), 0);

  // Utilization across the trailing window.
  const { start, end } = rangeWindow(range);
  let available = 0;
  let booked = 0;
  const today = startOfToday();
  for (let d = new Date(start); d < end; d = addDays(d, 1)) {
    const iso = toISO(d);
    const dowKey = String(d.getDay());
    const slots =
      iso in content.dateAvailability
        ? content.dateAvailability[iso]
        : content.weeklyAvailability[dowKey] ?? [];
    available += slots.length;
  }
  for (const b of bookings) {
    const d = parseBookingDate(b.booking_date);
    if (isActive(b) && d >= start && d < end) booked += 1;
  }

  // Rates across all decided bookings.
  const decided = bookings.filter((b) => b.status !== "pending").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const denied = bookings.filter((b) => b.status === "denied").length;

  // Upcoming load: next 14 days.
  const upMap = new Map<string, number>();
  for (const b of bookings) {
    const d = parseBookingDate(b.booking_date);
    if (isActive(b) && d >= today && d < addDays(today, 14)) {
      const iso = toISO(d);
      upMap.set(iso, (upMap.get(iso) ?? 0) + 1);
    }
  }
  const upcoming = Array.from(upMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([iso, count]) => ({
      date: iso,
      label: parseBookingDate(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      count,
    }));

  return {
    heatmap,
    maxHeat,
    busiestDay: dayTotals[busiestDayIdx] > 0 ? { dow: busiestDayIdx, count: dayTotals[busiestDayIdx] } : null,
    busiestSlot: slotTotals[busiestSlotIdx] > 0 ? { slot: TIME_SLOTS[busiestSlotIdx], count: slotTotals[busiestSlotIdx] } : null,
    utilization: available ? Math.min(1, booked / available) : 0,
    bookedSlots: booked,
    availableSlots: available,
    cancelRate: decided ? cancelled / decided : 0,
    denyRate: decided ? denied / decided : 0,
    upcoming,
  };
}

// ── Family 4: service + payment mix ───────────────────────────────────
export interface ServiceStat {
  service: string;
  count: number; // active
  revenue: number; // cents, accepted
}
export interface MixInsights {
  services: ServiceStat[];
  totalRevenue: number;
  onlineCount: number;
  inStoreCount: number;
  onlineRevenue: number;
  inStoreRevenue: number;
  discountedCount: number; // bookings priced below list (a discount was live)
}

export function mixInsights(bookings: Booking[], content: SiteContent): MixInsights {
  const svcMap = new Map<string, ServiceStat>();
  let totalRevenue = 0;
  let onlineCount = 0;
  let inStoreCount = 0;
  let onlineRevenue = 0;
  let inStoreRevenue = 0;
  let discountedCount = 0;

  const listPrice = new Map<string, number>();
  for (const s of content.serviceConfigs) listPrice.set(s.name, s.amount);

  for (const b of bookings) {
    if (!isActive(b)) continue;
    const rev = bookingRevenue(b);
    const entry = svcMap.get(b.service) ?? { service: b.service, count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += rev;
    svcMap.set(b.service, entry);
    totalRevenue += rev;
    if (b.payment_method === "online") {
      onlineCount += 1;
      onlineRevenue += rev;
    } else {
      inStoreCount += 1;
      inStoreRevenue += rev;
    }
    const list = listPrice.get(b.service);
    if (list && (b.service_price_cents ?? 0) > 0 && (b.service_price_cents ?? 0) < list) discountedCount += 1;
  }

  return {
    services: Array.from(svcMap.values()).sort((a, b) => b.count - a.count),
    totalRevenue,
    onlineCount,
    inStoreCount,
    onlineRevenue,
    inStoreRevenue,
    discountedCount,
  };
}

// ── Small shared helpers ──────────────────────────────────────────────
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}
export function formatPhone(phone: string): string {
  const d = normalizePhone(phone);
  return d.length === 10 ? d.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3") : phone;
}
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
