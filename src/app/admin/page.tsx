"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { formatPrice, parseDollarAmount, type ServiceConfig } from "@/lib/services";
import { TIME_SLOTS, DAYS_OF_WEEK } from "@/lib/schedule";
import AdminAgent from "@/components/AdminAgent";
import SystemPanel from "@/components/SystemPanel";

interface Booking {
  id: string;
  user_name: string;
  user_phone: string;
  service: string;
  booking_date: string;
  booking_time: string;
  notes: string;
  status: "pending" | "accepted" | "denied";
  service_price_cents: number;
  payment_method: "in_store" | "online";
  payment_status: "pay_in_store" | "unpaid" | "paid" | "refunded";
  created_at: string;
}

interface TaxSummary {
  venmoGross: number;
  expenses: number;
  profit: number;
  selfEmploymentTax: number;
  federalIncomeTax: number;
  utahIncomeTax: number;
  guardianSetAside: number;
  effectiveRate: number;
}

const STATUS_COLORS = {
  pending: { bg: "rgba(154,123,26,0.12)", text: "#8a6d12" },
  accepted: { bg: "rgba(47,125,70,0.12)", text: "#2f7d46" },
  denied: { bg: "rgba(197,54,14,0.12)", text: "#c5360e" },
};

const BOOKING_TABS = ["All", "Pending", "Accepted", "Denied"] as const;
const ADMIN_TABS = ["Bookings", "Content", "Schedule", "Taxes", "Growth", "System"] as const;
type BookingTab = typeof BOOKING_TABS[number];
type AdminTab = typeof ADMIN_TABS[number];

const TAX_YEAR = 2026;
const STANDARD_DEDUCTION_SINGLE = 16100;
const UTAH_INCOME_TAX_RATE = 0.045;
const SE_TAXABLE_MULTIPLIER = 0.9235;
const SOCIAL_SECURITY_WAGE_BASE = 184500;
const SAFE_TAX_BUFFER = 0.15;
const FEDERAL_SINGLE_BRACKETS = [
  { over: 0, base: 0, rate: 0.1 },
  { over: 12400, base: 1240, rate: 0.12 },
  { over: 50400, base: 5800, rate: 0.22 },
  { over: 105700, base: 17966, rate: 0.24 },
  { over: 201775, base: 41024, rate: 0.32 },
  { over: 256225, base: 58448, rate: 0.35 },
  { over: 640600, base: 192979.25, rate: 0.37 },
];

const UPGRADE_CHECKLIST = [
  "Upload real haircut gallery photos",
  "Add richer service details and durations",
  "Preview availability in booking",
  "Keep booking flow polished and step-based",
  "Block unavailable days in Schedule",
  "Review pending bookings quickly",
  "Prepare deposit/payment language",
  "Add cancellation and reschedule policy",
  "Set SMS reminder copy",
  "Track Google Calendar sync note",
  "Add testimonials or review quotes",
  "Add map and parking/location details",
  "Set a strong hero image",
  "Keep mobile booking one tap from the header",
  "Show price and duration labels",
  "Add barber profile photo and bio",
  "Add Instagram/TikTok links",
  "Add free lineup or dollar-off rewards",
  "Review customer history in bookings",
  "Track Venmo tax set-asides",
  "Keep metadata, errors, and empty states clean",
];

export default function AdminPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [bookingTab, setBookingTab] = useState<BookingTab>("All");
  const [adminTab, setAdminTab] = useState<AdminTab>("Bookings");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [bookingRes, contentRes] = await Promise.all([
      fetch("/api/admin/bookings"),
      fetch("/api/admin/site-content"),
    ]);

    if (bookingRes.status === 403 || bookingRes.status === 401) {
      router.replace("/");
      return;
    }

    const bookingData = await bookingRes.json();
    const contentData = contentRes.ok ? await contentRes.json() : { content: DEFAULT_SITE_CONTENT };
    setBookings(bookingData.bookings ?? []);
    setContent(contentData.content ?? DEFAULT_SITE_CONTENT);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

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

  async function saveContent(next = content) {
    setSaving(true);
    setSaveMessage("");
    const res = await fetch("/api/admin/site-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) {
      setSaveMessage(data.error ?? "Could not save.");
      return;
    }
    setContent(data.content);
    setSaveMessage("Saved.");
  }

  async function setPaymentStatus(id: string, paymentStatus: "unpaid" | "paid" | "refunded") {
    setActing(id + paymentStatus);
    await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus }),
    });
    setActing(null);
    await load();
  }

  const counts = {
    All: bookings.length,
    Pending: bookings.filter((b) => b.status === "pending").length,
    Accepted: bookings.filter((b) => b.status === "accepted").length,
    Denied: bookings.filter((b) => b.status === "denied").length,
  };

  const filtered = bookings.filter((b) => bookingTab === "All" ? true : b.status === bookingTab.toLowerCase());
  const customers = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach((b) => map.set(b.user_phone, [...(map.get(b.user_phone) ?? []), b]));
    return Array.from(map.entries()).map(([phone, rows]) => ({ phone, rows }));
  }, [bookings]);
  const taxSummary = useMemo(() => calculateTaxSummary(bookings, content.taxExpenses), [bookings, content.taxExpenses]);

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="shell flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="wordmark">
              SRT<span className="hot">.</span>CUTS
            </span>
            <span className="chip">Admin</span>
          </div>
          <button
            className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--mute)] transition-colors hover:text-[var(--ink)]"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/");
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <main className="shell py-8 sm:py-12">
        <div className="mb-8">
          <p className="idx mb-3">[ CONTROL CENTER ]</p>
          <h1 className="display display--lg">Control center</h1>
          <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--mute)]">
            {counts.Pending} pending · {counts.Accepted} accepted · {customers.length} customers
          </p>
        </div>

        <AdminAgent onRefresh={load} />

        <div className="mb-8 flex gap-1.5 overflow-x-auto pb-1">
          {ADMIN_TABS.map((t) => (
            <Pill key={t} active={adminTab === t} onClick={() => setAdminTab(t)}>
              {t}
            </Pill>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spin h-6 w-6 rounded-full border-2 border-[var(--line-strong)] border-t-[var(--accent)]" />
          </div>
        ) : (
          <>
            {adminTab === "Bookings" && (
              <section>
                <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 md:grid-cols-4">
                  {Object.entries(counts).map(([label, value]) => (
                    <div key={label} className="panel-fill p-4 sm:p-5">
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--mute)]">{label}</p>
                      <p className="spec mt-2 text-3xl">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1 sm:mb-8">
                  {BOOKING_TABS.map((t) => (
                    <Pill key={t} active={bookingTab === t} onClick={() => setBookingTab(t)}>
                      {t} {counts[t] > 0 ? counts[t] : ""}
                    </Pill>
                  ))}
                </div>
                <BookingList bookings={filtered} acting={acting} act={act} setPaymentStatus={setPaymentStatus} />
              </section>
            )}

            {adminTab === "Content" && (
              <section className="space-y-6">
                <Panel title="Services & prices">
                  <Repeater
                    items={content.serviceConfigs}
                    empty={{ name: "Fade", amount: 3000, duration: "45 min", desc: "", detail: "" }}
                    onChange={(serviceConfigs) => setContent({ ...content, serviceConfigs })}
                    render={(item, update) => <ServiceEditor service={item} update={update} />}
                  />
                  <Note>Prices are full price only. Customers can pay that full amount with Venmo or in store.</Note>
                </Panel>

                <Panel title="Homepage image links">
                  <ImageField label="Hero image direct link" value={content.heroImageUrl} onChange={(heroImageUrl) => setContent({ ...content, heroImageUrl })} />
                  <ImageField label="Barber photo direct link" value={content.barberPhotoUrl} onChange={(barberPhotoUrl) => setContent({ ...content, barberPhotoUrl })} />
                  <Note>Paste direct image URLs here — uploaded image links, Supabase Storage links, or public links ending in an image file.</Note>
                </Panel>

                <Panel title="Homepage essentials">
                  <Field label="Barber name" value={content.barberName} onChange={(barberName) => setContent({ ...content, barberName })} />
                  <Area label="Barber bio" value={content.barberBio} onChange={(barberBio) => setContent({ ...content, barberBio })} />
                  <Field label="Specialties, comma separated" value={content.specialties.join(", ")} onChange={(v) => setContent({ ...content, specialties: splitList(v) })} />
                </Panel>

                <Panel title="Gallery">
                  <Repeater
                    items={content.gallery}
                    empty={{ title: "", imageUrl: "", caption: "" }}
                    onChange={(gallery) => setContent({ ...content, gallery })}
                    render={(item, update) => (
                      <>
                        <Field label="Title" value={item.title} onChange={(title) => update({ ...item, title })} />
                        <ImageField label="Gallery image direct link" value={item.imageUrl} onChange={(imageUrl) => update({ ...item, imageUrl })} />
                        <Area label="Caption" value={item.caption} onChange={(caption) => update({ ...item, caption })} />
                      </>
                    )}
                  />
                </Panel>

                <Panel title="Reviews, location, socials">
                  <Repeater
                    items={content.testimonials}
                    empty={{ quote: "", name: "" }}
                    onChange={(testimonials) => setContent({ ...content, testimonials })}
                    render={(item, update) => (
                      <>
                        <Area label="Quote" value={item.quote} onChange={(quote) => update({ ...item, quote })} />
                        <Field label="Name" value={item.name} onChange={(name) => update({ ...item, name })} />
                      </>
                    )}
                  />
                  <Field label="Address / service area" value={content.address} onChange={(address) => setContent({ ...content, address })} />
                  <Field label="Map URL" value={content.mapUrl} onChange={(mapUrl) => setContent({ ...content, mapUrl })} />
                  <Area label="Parking note" value={content.parkingNote} onChange={(parkingNote) => setContent({ ...content, parkingNote })} />
                  <Field label="Instagram URL" value={content.instagramUrl} onChange={(instagramUrl) => setContent({ ...content, instagramUrl })} />
                  <Field label="TikTok URL" value={content.tiktokUrl} onChange={(tiktokUrl) => setContent({ ...content, tiktokUrl })} />
                  <Field label="Venmo link" value={content.venmoUrl} onChange={(venmoUrl) => setContent({ ...content, venmoUrl })} />
                </Panel>

                <SaveBar saving={saving} saveMessage={saveMessage} onSave={() => saveContent()} />
              </section>
            )}

            {adminTab === "Schedule" && (
              <section className="space-y-6">
                <DateAvailabilityEditor
                  dateAvailability={content.dateAvailability}
                  weeklyAvailability={content.weeklyAvailability}
                  onChange={(dateAvailability) => setContent({ ...content, dateAvailability })}
                />
                <AvailabilityEditor
                  availability={content.weeklyAvailability}
                  onChange={(weeklyAvailability) => setContent({ ...content, weeklyAvailability })}
                />
                <Panel title="Blocked dates">
                  <Repeater
                    items={content.scheduleBlocks}
                    empty={{ date: "", reason: "" }}
                    onChange={(scheduleBlocks) => setContent({ ...content, scheduleBlocks })}
                    render={(item, update) => (
                      <>
                        <Field label="Date" type="date" value={item.date} onChange={(date) => update({ ...item, date })} />
                        <Field label="Reason" value={item.reason} onChange={(reason) => update({ ...item, reason })} />
                      </>
                    )}
                  />
                </Panel>
                <Panel title="Policies">
                  <Area label="Payment note" value={content.depositNote} onChange={(depositNote) => setContent({ ...content, depositNote })} />
                  <Area label="Cancellation/reschedule policy" value={content.cancellationPolicy} onChange={(cancellationPolicy) => setContent({ ...content, cancellationPolicy })} />
                  <Area label="SMS reminder policy" value={content.reminderPolicy} onChange={(reminderPolicy) => setContent({ ...content, reminderPolicy })} />
                  <Area label="Google Calendar note" value={content.googleCalendarNote} onChange={(googleCalendarNote) => setContent({ ...content, googleCalendarNote })} />
                </Panel>
                <SaveBar saving={saving} saveMessage={saveMessage} onSave={() => saveContent()} />
              </section>
            )}

            {adminTab === "Taxes" && (
              <section className="space-y-6">
                <TaxTracker bookings={bookings} content={content} taxSummary={taxSummary} setContent={setContent} />
                <SaveBar saving={saving} saveMessage={saveMessage} onSave={() => saveContent()} />
              </section>
            )}

            {adminTab === "Growth" && (
              <section className="space-y-6">
                <Panel title="Offers">
                  <Area label="Loyalty offer" value={content.loyaltyOffer} onChange={(loyaltyOffer) => setContent({ ...content, loyaltyOffer })} />
                  <Area label="Referral offer" value={content.referralOffer} onChange={(referralOffer) => setContent({ ...content, referralOffer })} />
                </Panel>
                <Panel title="Upgrade checklist">
                  <div className="grid gap-2 md:grid-cols-2">
                    {UPGRADE_CHECKLIST.map((item, i) => (
                      <div key={item} className="flex items-start gap-3 rounded-[4px] border border-[var(--line)] p-4 text-sm">
                        <span className="idx mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Customer history">
                  <div className="space-y-2">
                    {customers.map(({ phone, rows }) => (
                      <div key={phone} className="flex items-center justify-between gap-4 rounded-[4px] border border-[var(--line)] p-4">
                        <p className="font-display text-lg uppercase leading-none">{rows[0]?.user_name}</p>
                        <p className="spec text-sm text-[var(--mute)]">{formatPhone(phone)} · {rows.length}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
                <SaveBar saving={saving} saveMessage={saveMessage} onSave={() => saveContent()} />
              </section>
            )}

            {adminTab === "System" && <SystemPanel />}
          </>
        )}
      </main>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full border px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.1em] transition-colors"
      style={{
        borderColor: active ? "transparent" : "var(--line-strong)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#ffffff" : "var(--mute)",
      }}
    >
      {children}
    </button>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[4px] border border-[var(--accent)]/30 bg-[rgba(91,70,240,0.06)] p-4 text-sm leading-relaxed text-[var(--ink)]">
      {children}
    </div>
  );
}

function TaxTracker({
  bookings,
  content,
  taxSummary,
  setContent,
}: {
  bookings: Booking[];
  content: SiteContent;
  taxSummary: TaxSummary;
  setContent: (content: SiteContent) => void;
}) {
  const paidVenmoBookings = bookings.filter((b) => b.payment_method === "online" && b.payment_status === "paid");
  const rows = [
    { label: "Paid Venmo sales", value: formatPrice(taxSummary.venmoGross) },
    { label: "Expense deductions", value: `-${formatPrice(taxSummary.expenses)}` },
    { label: "Estimated profit", value: formatPrice(taxSummary.profit) },
    { label: "Guardian set-aside", value: formatPrice(taxSummary.guardianSetAside), highlight: true },
  ];

  return (
    <>
      <Panel title="Venmo tax tracker">
        <div className="grid gap-3 md:grid-cols-4">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-[4px] border p-4"
              style={{
                background: row.highlight ? "rgba(91,70,240,0.08)" : "transparent",
                borderColor: row.highlight ? "var(--accent)" : "var(--line)",
              }}
            >
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--mute)]">{row.label}</p>
              <p className="spec mt-2 text-2xl">{row.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[4px] border border-[var(--line)] p-4 text-sm leading-relaxed text-[var(--mute)]">
          This only counts Venmo bookings you mark paid in admin. In-store payments are ignored. The set-aside uses {TAX_YEAR} single-filer
          federal brackets, the standard deduction, Utah&apos;s flat income tax rate, self-employment tax, and a {Math.round(SAFE_TAX_BUFFER * 100)}%
          safety buffer. It is an estimate for planning, not tax advice.
        </div>
      </Panel>

      <Panel title="Tax breakdown">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TaxLine label="Self-employment tax" value={taxSummary.selfEmploymentTax} />
          <TaxLine label="Federal income tax" value={taxSummary.federalIncomeTax} />
          <TaxLine label="Utah income tax" value={taxSummary.utahIncomeTax} />
          <TaxLine label="Effective set-aside rate" value={`${Math.round(taxSummary.effectiveRate * 100)}%`} />
        </div>
        <div className="text-sm leading-relaxed text-[var(--mute)]">
          Expenses lower the profit estimate because business income is generally taxed on profit, not gross sales. Keep receipts for items like
          chairs, lights, capes, clippers, supplies, booking software, and payment fees.
        </div>
      </Panel>

      <Panel title="Expense deductions">
        <Repeater
          items={content.taxExpenses}
          empty={{ name: "", amount: 0 }}
          onChange={(taxExpenses) => setContent({ ...content, taxExpenses })}
          render={(item, update) => (
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <Field label="Item" value={item.name} onChange={(name) => update({ ...item, name })} />
              <Field label="Cost" value={formatPrice(item.amount)} onChange={(value) => update({ ...item, amount: parseDollarAmount(value) })} />
            </div>
          )}
        />
      </Panel>

      <Panel title="Paid Venmo bookings">
        {paidVenmoBookings.length ? (
          <div className="space-y-2">
            {paidVenmoBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-4 rounded-[4px] border border-[var(--line)] p-4">
                <div className="min-w-0">
                  <p className="font-display text-lg uppercase leading-none">{b.user_name}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--mute)]">
                    {b.service} · {new Date(b.booking_date + "T00:00:00").toLocaleDateString("en-US")}
                  </p>
                </div>
                <p className="spec text-[var(--accent-deep)]">{formatPrice(b.service_price_cents ?? 0)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-[var(--mute)]">No paid Venmo bookings yet.</div>
        )}
      </Panel>
    </>
  );
}

function TaxLine({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[4px] border border-[var(--line)] p-4">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--mute)]">{label}</p>
      <p className="spec mt-2 text-xl">{typeof value === "number" ? formatPrice(value) : value}</p>
    </div>
  );
}

function ActionButton({
  tone,
  disabled,
  onClick,
  children,
}: {
  tone: "accept" | "deny" | "accent";
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const colors =
    tone === "accept"
      ? { border: "rgba(47,125,70,0.4)", bg: "rgba(47,125,70,0.1)", text: "#2f7d46" }
      : tone === "deny"
      ? { border: "rgba(197,54,14,0.4)", bg: "rgba(197,54,14,0.08)", text: "#c5360e" }
      : { border: "var(--accent)", bg: "rgba(91,70,240,0.08)", text: "var(--accent-deep)" };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="min-h-11 rounded-[4px] border px-4 font-mono text-[12px] font-bold uppercase tracking-[0.08em] transition-opacity disabled:opacity-40"
      style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
    >
      {children}
    </button>
  );
}

function BookingList({
  bookings,
  acting,
  act,
  setPaymentStatus,
}: {
  bookings: Booking[];
  acting: string | null;
  act: (id: string, status: "accepted" | "denied") => void;
  setPaymentStatus: (id: string, paymentStatus: "unpaid" | "paid" | "refunded") => void;
}) {
  if (!bookings.length) {
    return <div className="py-20 text-center text-sm text-[var(--mute)]">No bookings here.</div>;
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {bookings.map((b, i) => {
          const sc = STATUS_COLORS[b.status];
          const displayDate = new Date(b.booking_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          return (
            <motion.div key={b.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3, delay: i * 0.04 }} className="panel-fill p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="truncate font-display text-xl uppercase leading-none">{b.user_name}</p>
                    <span className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.06em]" style={{ background: sc.bg, color: sc.text }}>
                      {b.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-[12px] uppercase tracking-[0.04em] text-[var(--mute)]">
                    <span>{b.service}</span><span>·</span><span>{displayDate}</span><span>·</span><span>{b.booking_time}</span><span>·</span>
                    <span className="text-[var(--accent-deep)]">{formatPrice(b.service_price_cents ?? 0)}</span><span>·</span>
                    <span>{b.payment_method === "online" ? "Venmo" : "In store"}: {b.payment_status.replace(/_/g, " ")}</span><span>·</span>
                    <a href={`tel:${b.user_phone}`} className="transition-colors hover:text-[var(--accent-deep)]">{formatPhone(b.user_phone)}</a>
                  </div>
                  {b.notes && <p className="mt-2 text-sm italic text-[var(--mute)]">&ldquo;{b.notes}&rdquo;</p>}
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                  {b.payment_method === "online" && (
                    <ActionButton tone="accent" disabled={!!acting} onClick={() => setPaymentStatus(b.id, b.payment_status === "paid" ? "unpaid" : "paid")}>
                      {acting === b.id + "paid" || acting === b.id + "unpaid" ? "…" : b.payment_status === "paid" ? "Mark unpaid" : "Mark paid"}
                    </ActionButton>
                  )}
                  {b.status === "pending" && (
                    <>
                      <ActionButton tone="accept" disabled={!!acting} onClick={() => act(b.id, "accepted")}>{acting === b.id + "accepted" ? "…" : "Accept"}</ActionButton>
                      <ActionButton tone="deny" disabled={!!acting} onClick={() => act(b.id, "denied")}>{acting === b.id + "denied" ? "…" : "Deny"}</ActionButton>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function SlotChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold transition-all duration-150 active:scale-95"
      style={{
        background: active ? "var(--accent)" : "transparent",
        borderColor: active ? "transparent" : "var(--line-strong)",
        color: active ? "#ffffff" : "var(--mute)",
      }}
    >
      {children}
    </button>
  );
}

function MiniAction({ tone, onClick, children }: { tone: "accent" | "deny" | "mute"; onClick: () => void; children: React.ReactNode }) {
  const color = tone === "accent" ? "var(--accent-deep)" : tone === "deny" ? "#c5360e" : "var(--mute)";
  return (
    <button type="button" onClick={onClick} className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-opacity hover:opacity-70" style={{ color }}>
      {children}
    </button>
  );
}

function DateAvailabilityEditor({
  dateAvailability,
  weeklyAvailability,
  onChange,
}: {
  dateAvailability: Record<string, string[]>;
  weeklyAvailability: Record<string, string[]>;
  onChange: (v: Record<string, string[]>) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const today = new Date();
  const dates: string[] = [];
  for (let i = 1; i <= 18; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  function toggle(iso: string, slot: string) {
    const current = dateAvailability[iso] ?? weeklyAvailability[String(new Date(iso + "T00:00:00").getDay())] ?? [];
    const next = current.includes(slot)
      ? current.filter((t) => t !== slot)
      : [...current, slot].sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b));
    onChange({ ...dateAvailability, [iso]: next });
  }

  function setAll(iso: string) {
    onChange({ ...dateAvailability, [iso]: [...TIME_SLOTS] });
  }

  function clearAll(iso: string) {
    onChange({ ...dateAvailability, [iso]: [] });
  }

  function clearOverride(iso: string) {
    const next = { ...dateAvailability };
    delete next[iso];
    onChange(next);
  }

  return (
    <section className="panel-fill space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl uppercase">Date-specific availability</h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--mute)]">Next 18 days</p>
      </div>

      <Note>Override availability for specific dates. These take priority over the weekly schedule. Dates without an override use the weekly default.</Note>

      <div className="space-y-2">
        {dates.map((iso) => {
          const d = new Date(iso + "T00:00:00");
          const dow = String(d.getDay());
          const hasOverride = iso in dateAvailability;
          const slots = hasOverride ? dateAvailability[iso] : (weeklyAvailability[dow] ?? []);
          const isOpen = expanded === iso;
          const displaySlots = hasOverride ? dateAvailability[iso] : null;

          const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          const badge = hasOverride
            ? displaySlots!.length === 0
              ? "Closed (override)"
              : `${displaySlots!.length} slots (override)`
            : slots.length === 0
            ? "Closed (weekly)"
            : `${slots.length} slots (weekly)`;
          const badgeAccent = hasOverride && displaySlots!.length > 0;
          const badgeClosed = hasOverride && displaySlots!.length === 0;

          return (
            <div key={iso} className="overflow-hidden rounded-[4px] border border-[var(--line)]">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => setExpanded(isOpen ? null : iso)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[13px] font-bold uppercase tracking-[0.04em]">{label}</span>
                  <span
                    className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em]"
                    style={{
                      background: badgeAccent ? "rgba(91,70,240,0.12)" : badgeClosed ? "rgba(197,54,14,0.1)" : "transparent",
                      border: badgeAccent || badgeClosed ? "none" : "1px solid var(--line-strong)",
                      color: badgeAccent ? "var(--accent-deep)" : badgeClosed ? "#c5360e" : "var(--mute)",
                    }}
                  >
                    {badge}
                  </span>
                </div>
                <span className="text-[var(--mute)]">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-[var(--line)] px-4 pb-4 pt-3">
                  <div className="flex gap-4">
                    <MiniAction tone="accent" onClick={() => setAll(iso)}>Select all</MiniAction>
                    <MiniAction tone="deny" onClick={() => clearAll(iso)}>Close day</MiniAction>
                    {hasOverride && <MiniAction tone="mute" onClick={() => clearOverride(iso)}>Reset to weekly</MiniAction>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TIME_SLOTS.map((slot) => (
                      <SlotChip key={slot} active={slots.includes(slot)} onClick={() => toggle(iso, slot)}>
                        {slot}
                      </SlotChip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AvailabilityEditor({
  availability,
  onChange,
}: {
  availability: Record<string, string[]>;
  onChange: (v: Record<string, string[]>) => void;
}) {
  function toggle(dow: string, slot: string) {
    const current = availability[dow] ?? [];
    const next = current.includes(slot)
      ? current.filter((t) => t !== slot)
      : [...current, slot].sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b));
    onChange({ ...availability, [dow]: next });
  }

  function setAll(dow: string) {
    onChange({ ...availability, [dow]: [...TIME_SLOTS] });
  }

  function clearAll(dow: string) {
    onChange({ ...availability, [dow]: [] });
  }

  return (
    <section className="panel-fill space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl uppercase">Weekly availability</h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--mute)]">Tap to toggle</p>
      </div>

      <Note>Only the times you enable here appear for customers to book. Days with no slots set are grayed out in the calendar.</Note>

      <div className="space-y-5">
        {DAYS_OF_WEEK.map((dayName, dow) => {
          const key = String(dow);
          const active = availability[key] ?? [];
          const allOn = active.length === TIME_SLOTS.length;
          return (
            <div key={key}>
              <div className="mb-2.5 flex items-center justify-between">
                <p className="font-mono text-[13px] font-bold uppercase tracking-[0.06em]">{dayName}</p>
                <MiniAction tone="accent" onClick={() => (allOn ? clearAll(key) : setAll(key))}>
                  {allOn ? "Clear all" : "Select all"}
                </MiniAction>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TIME_SLOTS.map((slot) => (
                  <SlotChip key={slot} active={active.includes(slot)} onClick={() => toggle(key, slot)}>
                    {slot}
                  </SlotChip>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel-fill space-y-5 p-4 sm:p-6">
      <h2 className="font-display text-2xl uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input className="field" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <textarea className="field resize-none" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const src = value.trim();

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_140px] sm:items-end">
      <Field label={label} value={value} onChange={onChange} />
      <div className="overflow-hidden rounded-[4px] border border-[var(--line)]">
        <div className="relative aspect-[4/3]">
          {src ? (
            <Image src={src} alt={label} fill sizes="140px" className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--mute)]">
              No image
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Repeater<T extends object>({ items, empty, onChange, render }: { items: T[]; empty: T; onChange: (items: T[]) => void; render: (item: T, update: (item: T) => void) => React.ReactNode }) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="space-y-4 rounded-[4px] border border-[var(--line)] p-4">
          {render(item, (next) => onChange(items.map((row, i) => (i === index ? next : row))))}
          <MiniAction tone="deny" onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove</MiniAction>
        </div>
      ))}
      <button className="btn btn--ghost !min-h-[44px]" onClick={() => onChange([...items, empty])}>
        Add item
      </button>
    </div>
  );
}

function ServiceEditor({ service, update }: { service: ServiceConfig; update: (service: ServiceConfig) => void }) {
  return (
    <>
      <Field label="Service name" value={service.name} onChange={(name) => update({ ...service, name: name as ServiceConfig["name"] })} />
      <Field label="Price" value={formatPrice(service.amount)} onChange={(value) => update({ ...service, amount: parseDollarAmount(value) })} />
      <Field label="Duration" value={service.duration} onChange={(duration) => update({ ...service, duration })} />
      <Area label="Short description" value={service.desc} onChange={(desc) => update({ ...service, desc })} />
      <Area label="Detail" value={service.detail} onChange={(detail) => update({ ...service, detail })} />
    </>
  );
}

function SaveBar({ saving, saveMessage, onSave }: { saving: boolean; saveMessage: string; onSave: () => void }) {
  return (
    <div className="sticky bottom-4 z-30 flex flex-col gap-3 rounded-[6px] border border-[var(--line-strong)] bg-[var(--paper)]/92 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
      <p className="font-mono text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: saveMessage === "Saved." ? "#2f7d46" : saveMessage ? "#c5360e" : "var(--mute)" }}>
        {saveMessage || "Remember to save changes."}
      </p>
      <button className="btn btn--accent !min-h-[46px]" disabled={saving} onClick={onSave}>
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "").slice(-10);
  return d.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
}

function calculateTaxSummary(bookings: Booking[], taxExpenses: SiteContent["taxExpenses"]): TaxSummary {
  const venmoGross = bookings
    .filter((b) => b.payment_method === "online" && b.payment_status === "paid")
    .reduce((sum, b) => sum + (b.service_price_cents ?? 0), 0);
  const expenses = taxExpenses.reduce((sum, item) => sum + Math.max(0, item.amount || 0), 0);
  const profit = Math.max(0, venmoGross - expenses);
  const profitDollars = profit / 100;
  const selfEmploymentTaxDollars = calculateSelfEmploymentTax(profitDollars);
  const federalIncomeTaxDollars = calculateFederalIncomeTax(profitDollars, selfEmploymentTaxDollars);
  const utahIncomeTaxDollars = profitDollars * UTAH_INCOME_TAX_RATE;
  const estimatedTax = selfEmploymentTaxDollars + federalIncomeTaxDollars + utahIncomeTaxDollars;
  const guardianSetAside = Math.ceil((estimatedTax * (1 + SAFE_TAX_BUFFER)) * 100);

  return {
    venmoGross,
    expenses,
    profit,
    selfEmploymentTax: Math.round(selfEmploymentTaxDollars * 100),
    federalIncomeTax: Math.round(federalIncomeTaxDollars * 100),
    utahIncomeTax: Math.round(utahIncomeTaxDollars * 100),
    guardianSetAside,
    effectiveRate: profit > 0 ? guardianSetAside / profit : 0,
  };
}

function calculateSelfEmploymentTax(profitDollars: number) {
  if (profitDollars < 400) return 0;

  const netEarnings = profitDollars * SE_TAXABLE_MULTIPLIER;
  const socialSecurityTax = Math.min(netEarnings, SOCIAL_SECURITY_WAGE_BASE) * 0.124;
  const medicareTax = netEarnings * 0.029;
  return socialSecurityTax + medicareTax;
}

function calculateFederalIncomeTax(profitDollars: number, selfEmploymentTaxDollars: number) {
  const taxableIncome = Math.max(0, profitDollars - (selfEmploymentTaxDollars / 2) - STANDARD_DEDUCTION_SINGLE);
  const bracket = FEDERAL_SINGLE_BRACKETS.reduce((current, next) => taxableIncome >= next.over ? next : current, FEDERAL_SINGLE_BRACKETS[0]);
  return bracket.base + ((taxableIncome - bracket.over) * bracket.rate);
}
