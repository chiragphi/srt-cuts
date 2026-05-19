"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { formatPrice, parseDollarAmount, type ServiceConfig } from "@/lib/services";

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
  pending: { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.3)", text: "#FCD34D" },
  accepted: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.28)", text: "#4ADE80" },
  denied: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.28)", text: "#F87171" },
};

const BOOKING_TABS = ["All", "Pending", "Accepted", "Denied"] as const;
const ADMIN_TABS = ["Bookings", "Content", "Schedule", "Taxes", "Growth"] as const;
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
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 pt-[env(safe-area-inset-top)]">
        <div className="app-shell h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/srt-logo.png" alt="SRT" width={28} height={28} className="object-contain" />
            <span className="text-sm font-semibold tracking-wider text-white/80 uppercase">Admin</span>
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

      <main className="app-shell py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="app-title font-semibold text-white mb-2">
            Control Center
          </h1>
          <p className="text-sm" style={{ color: "#6E6E73" }}>
            {counts.Pending} pending · {counts.Accepted} accepted · {customers.length} customers
          </p>
        </div>

        <div className="flex gap-1 mb-6 sm:mb-8 p-1 rounded-2xl overflow-x-auto bg-white/[0.04] border border-white/10">
          {ADMIN_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setAdminTab(t)}
              className="shrink-0 min-h-10 px-4 py-2 rounded-xl text-sm transition-all duration-200 font-sans cursor-pointer border-none"
              style={{ background: adminTab === t ? "rgba(139,92,246,0.2)" : "transparent", color: adminTab === t ? "#C4B5FD" : "#6E6E73" }}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {adminTab === "Bookings" && (
              <section>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 sm:mb-8">
                  {Object.entries(counts).map(([label, value]) => (
                    <div key={label} className="app-card p-4 sm:p-5">
                      <p className="text-sm text-white/45">{label}</p>
                      <p className="text-3xl font-semibold text-white mt-2">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 mb-6 sm:mb-8 p-1 rounded-2xl overflow-x-auto bg-white/[0.04] border border-white/10">
                  {BOOKING_TABS.map((t) => (
                    <button key={t} onClick={() => setBookingTab(t)} className="shrink-0 min-h-10 px-4 py-2 rounded-xl text-sm transition-all duration-200 border-none cursor-pointer" style={{ background: bookingTab === t ? "rgba(139,92,246,0.2)" : "transparent", color: bookingTab === t ? "#C4B5FD" : "#6E6E73" }}>
                      {t} {counts[t] > 0 ? counts[t] : ""}
                    </button>
                  ))}
                </div>
                <BookingList bookings={filtered} acting={acting} act={act} setPaymentStatus={setPaymentStatus} />
              </section>
            )}

            {adminTab === "Content" && (
              <section className="space-y-6">
                <Panel title="Services and Prices">
                  <Repeater
                    items={content.serviceConfigs}
                    empty={{ name: "Fade", amount: 3000, duration: "45 min", desc: "", detail: "" }}
                    onChange={(serviceConfigs) => setContent({ ...content, serviceConfigs })}
                    render={(item, update) => (
                      <ServiceEditor service={item} update={update} />
                    )}
                  />
                  <div className="rounded-xl border border-purple-400/20 bg-purple-400/10 p-4 text-sm text-purple-100">
                    Prices are full price only. Customers can pay that full amount with Venmo or in store.
                  </div>
                </Panel>

                <Panel title="Homepage Essentials">
                  <Field label="Hero image URL" value={content.heroImageUrl} onChange={(heroImageUrl) => setContent({ ...content, heroImageUrl })} />
                  <Field label="Barber name" value={content.barberName} onChange={(barberName) => setContent({ ...content, barberName })} />
                  <Field label="Barber photo URL" value={content.barberPhotoUrl} onChange={(barberPhotoUrl) => setContent({ ...content, barberPhotoUrl })} />
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
                        <Field label="Image URL" value={item.imageUrl} onChange={(imageUrl) => update({ ...item, imageUrl })} />
                        <Area label="Caption" value={item.caption} onChange={(caption) => update({ ...item, caption })} />
                      </>
                    )}
                  />
                </Panel>

                <Panel title="Reviews, Location, Socials">
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
                <Panel title="Schedule Blocks">
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
                <TaxTracker
                  bookings={bookings}
                  content={content}
                  taxSummary={taxSummary}
                  setContent={setContent}
                />
                <SaveBar saving={saving} saveMessage={saveMessage} onSave={() => saveContent()} />
              </section>
            )}

            {adminTab === "Growth" && (
              <section className="space-y-6">
                <Panel title="Offers">
                  <Area label="Loyalty offer" value={content.loyaltyOffer} onChange={(loyaltyOffer) => setContent({ ...content, loyaltyOffer })} />
                  <Area label="Referral offer" value={content.referralOffer} onChange={(referralOffer) => setContent({ ...content, referralOffer })} />
                </Panel>
                <Panel title="Upgrade Checklist">
                  <div className="grid md:grid-cols-2 gap-3">
                    {UPGRADE_CHECKLIST.map((item, i) => (
                      <div key={item} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/75">
                        <span className="text-purple-300 mr-2">{String(i + 1).padStart(2, "0")}</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Customer History">
                  <div className="space-y-3">
                    {customers.map(({ phone, rows }) => (
                      <div key={phone} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-white font-medium">{rows[0]?.user_name}</p>
                        <p className="text-sm mt-1" style={{ color: "#86868B" }}>{formatPhone(phone)} · {rows.length} bookings</p>
                      </div>
                    ))}
                  </div>
                </Panel>
                <SaveBar saving={saving} saveMessage={saveMessage} onSave={() => saveContent()} />
              </section>
            )}
          </>
        )}
      </main>
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
      <Panel title="Venmo Tax Tracker">
        <div className="grid md:grid-cols-4 gap-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-2xl border p-4"
              style={{
                background: row.highlight ? "rgba(139,92,246,0.14)" : "rgba(255,255,255,0.03)",
                borderColor: row.highlight ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.1)",
              }}
            >
              <p className="text-sm text-white/45">{row.label}</p>
              <p className="text-2xl font-semibold text-white mt-2">{row.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed" style={{ color: "#C7C7CC" }}>
          This only counts Venmo bookings you mark paid in admin. In-store payments are ignored.
          The set-aside uses {TAX_YEAR} single-filer federal brackets, the standard deduction, Utah&apos;s flat income tax rate,
          self-employment tax, and a {Math.round(SAFE_TAX_BUFFER * 100)}% safety buffer. It is an estimate for planning,
          not tax advice.
        </div>
      </Panel>

      <Panel title="Tax Breakdown">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <TaxLine label="Self-employment tax" value={taxSummary.selfEmploymentTax} />
          <TaxLine label="Federal income tax" value={taxSummary.federalIncomeTax} />
          <TaxLine label="Utah income tax" value={taxSummary.utahIncomeTax} />
          <TaxLine label="Effective set-aside rate" value={`${Math.round(taxSummary.effectiveRate * 100)}%`} />
        </div>
        <div className="text-sm leading-relaxed" style={{ color: "#86868B" }}>
          Expenses lower the profit estimate because business income is generally taxed on profit, not gross sales.
          Keep receipts for items like chairs, lights, capes, clippers, supplies, booking software, and payment fees.
        </div>
      </Panel>

      <Panel title="Expense Deductions">
        <Repeater
          items={content.taxExpenses}
          empty={{ name: "", amount: 0 }}
          onChange={(taxExpenses) => setContent({ ...content, taxExpenses })}
          render={(item, update) => (
            <div className="grid sm:grid-cols-[1fr_180px] gap-4">
              <Field label="Item" value={item.name} onChange={(name) => update({ ...item, name })} />
              <Field label="Cost" value={formatPrice(item.amount)} onChange={(value) => update({ ...item, amount: parseDollarAmount(value) })} />
            </div>
          )}
        />
      </Panel>

      <Panel title="Paid Venmo Bookings">
        {paidVenmoBookings.length ? (
          <div className="space-y-3">
            {paidVenmoBookings.map((b) => (
              <div key={b.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{b.user_name}</p>
                  <p className="text-sm mt-1" style={{ color: "#86868B" }}>{b.service} · {new Date(b.booking_date + "T00:00:00").toLocaleDateString("en-US")}</p>
                </div>
                <p className="text-white font-semibold">{formatPrice(b.service_price_cents ?? 0)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-sm" style={{ color: "#6E6E73" }}>No paid Venmo bookings yet.</div>
        )}
      </Panel>
    </>
  );
}

function TaxLine({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-white/45">{label}</p>
      <p className="text-xl font-semibold text-white mt-2">{typeof value === "number" ? formatPrice(value) : value}</p>
    </div>
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
    return <div className="text-center py-20 text-sm" style={{ color: "#6E6E73" }}>No bookings here.</div>;
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {bookings.map((b, i) => {
          const sc = STATUS_COLORS[b.status];
          const displayDate = new Date(b.booking_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          return (
            <motion.div key={b.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3, delay: i * 0.04 }} className="app-card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="font-medium text-white text-base truncate">{b.user_name}</p>
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm" style={{ color: "#86868B" }}>
                    <span>{b.service}</span><span>·</span><span>{displayDate}</span><span>·</span><span>{b.booking_time}</span><span>·</span>
                    <span>{formatPrice(b.service_price_cents ?? 0)}</span><span>·</span>
                    <span>{b.payment_method === "online" ? "Venmo" : "In store"}: {b.payment_status.replace(/_/g, " ")}</span><span>·</span>
                    <a href={`tel:${b.user_phone}`} className="hover:text-purple-400 transition-colors">{formatPhone(b.user_phone)}</a>
                  </div>
                  {b.notes && <p className="text-sm mt-2 italic" style={{ color: "#6E6E73" }}>&ldquo;{b.notes}&rdquo;</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 shrink-0 sm:flex">
                  {b.payment_method === "online" && (
                    <button
                      className="min-h-11 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer border border-purple-400/25 bg-purple-400/10 text-purple-200"
                      disabled={!!acting}
                      onClick={() => setPaymentStatus(b.id, b.payment_status === "paid" ? "unpaid" : "paid")}
                    >
                      {acting === b.id + "paid" || acting === b.id + "unpaid" ? "..." : b.payment_status === "paid" ? "Mark unpaid" : "Mark paid"}
                    </button>
                  )}
                  {b.status === "pending" && (
                    <>
                      <button className="min-h-11 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer border border-green-400/25 bg-green-400/10 text-green-300" disabled={!!acting} onClick={() => act(b.id, "accepted")}>{acting === b.id + "accepted" ? "..." : "Accept"}</button>
                      <button className="min-h-11 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer border border-red-400/25 bg-red-400/10 text-red-300" disabled={!!acting} onClick={() => act(b.id, "denied")}>{acting === b.id + "denied" ? "..." : "Deny"}</button>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="app-card p-4 sm:p-6 space-y-5">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs text-white/40 mb-2 tracking-wide uppercase">{label}</span>
      <input className="input-field" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs text-white/40 mb-2 tracking-wide uppercase">{label}</span>
      <textarea className="input-field resize-none" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Repeater<T extends object>({ items, empty, onChange, render }: { items: T[]; empty: T; onChange: (items: T[]) => void; render: (item: T, update: (item: T) => void) => React.ReactNode }) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
          {render(item, (next) => onChange(items.map((row, i) => i === index ? next : row)))}
          <button className="text-sm text-red-300 hover:text-red-200 bg-transparent border-none cursor-pointer" onClick={() => onChange(items.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
      <button className="btn-ghost text-sm px-4 py-2" onClick={() => onChange([...items, empty])}>
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
    <div className="sticky bottom-4 z-30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/10 bg-black/85 backdrop-blur-xl p-4">
      <p className="text-sm" style={{ color: saveMessage === "Saved." ? "#4ADE80" : "#F87171" }}>{saveMessage || "Remember to save changes."}</p>
      <div className="grid gap-2 sm:flex">
        <button className="btn-primary text-sm px-5 py-2" disabled={saving} onClick={onSave}>{saving ? "Saving..." : "Save"}</button>
      </div>
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
