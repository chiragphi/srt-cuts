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

const STATUS_COLORS = {
  pending: { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.3)", text: "#FCD34D" },
  accepted: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.28)", text: "#4ADE80" },
  denied: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.28)", text: "#F87171" },
};

const BOOKING_TABS = ["All", "Pending", "Accepted", "Denied"] as const;
const ADMIN_TABS = ["Bookings", "Content", "Schedule", "Growth"] as const;
type BookingTab = typeof BOOKING_TABS[number];
type AdminTab = typeof ADMIN_TABS[number];

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
  "Use mobile sticky booking",
  "Show price and duration labels",
  "Add barber profile photo and bio",
  "Add Instagram/TikTok links",
  "Add loyalty and referral offers",
  "Review customer history in bookings",
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

  async function syncStripe() {
    setSaving(true);
    setSaveMessage("");
    const saved = await fetch("/api/admin/site-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    if (!saved.ok) {
      const data = await saved.json();
      setSaving(false);
      setSaveMessage(data.error ?? "Could not save before Stripe sync.");
      return;
    }

    const res = await fetch("/api/admin/site-content/sync-stripe", { method: "POST" });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) {
      setSaveMessage(data.error ?? "Stripe sync failed.");
      return;
    }
    setContent(data.content);
    setSaveMessage("Saved and synced to Stripe.");
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

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
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

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-semibold text-white mb-1" style={{ fontSize: 36, letterSpacing: "-0.03em" }}>
            Control Center
          </h1>
          <p className="text-sm" style={{ color: "#6E6E73" }}>
            {counts.Pending} pending · {counts.Accepted} accepted · {customers.length} customers
          </p>
        </div>

        <div className="flex flex-wrap gap-1 mb-8 p-1 rounded-xl w-fit bg-white/[0.04] border border-white/10">
          {ADMIN_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setAdminTab(t)}
              className="px-4 py-2 rounded-lg text-sm transition-all duration-200 font-sans cursor-pointer border-none"
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
                <div className="grid md:grid-cols-4 gap-3 mb-8">
                  {Object.entries(counts).map(([label, value]) => (
                    <div key={label} className="glass rounded-2xl p-5">
                      <p className="text-sm text-white/45">{label}</p>
                      <p className="text-3xl font-semibold text-white mt-2">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit bg-white/[0.04] border border-white/10">
                  {BOOKING_TABS.map((t) => (
                    <button key={t} onClick={() => setBookingTab(t)} className="px-4 py-2 rounded-lg text-sm transition-all duration-200 border-none cursor-pointer" style={{ background: bookingTab === t ? "rgba(139,92,246,0.2)" : "transparent", color: bookingTab === t ? "#C4B5FD" : "#6E6E73" }}>
                      {t} {counts[t] > 0 ? counts[t] : ""}
                    </button>
                  ))}
                </div>
                <BookingList bookings={filtered} acting={acting} act={act} />
              </section>
            )}

            {adminTab === "Content" && (
              <section className="space-y-6">
                <Panel title="Services, Prices, and Stripe">
                  <Repeater
                    items={content.serviceConfigs}
                    empty={{ name: "Fade", amount: 3000, duration: "45 min", desc: "", detail: "" }}
                    onChange={(serviceConfigs) => setContent({ ...content, serviceConfigs })}
                    render={(item, update) => (
                      <ServiceEditor service={item} update={update} />
                    )}
                  />
                  <div className="rounded-xl border border-purple-400/20 bg-purple-400/10 p-4 text-sm text-purple-100">
                    Prices are full price only. Customers can pay that full amount online with Stripe or in store.
                    When you change a price, use Save and sync Stripe so Stripe gets a new active Price.
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
                </Panel>

                <SaveBar saving={saving} saveMessage={saveMessage} onSave={() => saveContent()} onSync={syncStripe} />
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

function BookingList({ bookings, acting, act }: { bookings: Booking[]; acting: string | null; act: (id: string, status: "accepted" | "denied") => void }) {
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
            <motion.div key={b.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3, delay: i * 0.04 }} className="rounded-2xl p-5 bg-white/[0.03] border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium text-white text-base truncate">{b.user_name}</p>
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm" style={{ color: "#86868B" }}>
                    <span>{b.service}</span><span>·</span><span>{displayDate}</span><span>·</span><span>{b.booking_time}</span><span>·</span>
                    <span>{formatPrice(b.service_price_cents ?? 0)}</span><span>·</span>
                    <span>{b.payment_method === "online" ? "Online" : "In store"}: {b.payment_status.replace(/_/g, " ")}</span><span>·</span>
                    <a href={`tel:${b.user_phone}`} className="hover:text-purple-400 transition-colors">{formatPhone(b.user_phone)}</a>
                  </div>
                  {b.notes && <p className="text-sm mt-2 italic" style={{ color: "#6E6E73" }}>&ldquo;{b.notes}&rdquo;</p>}
                </div>
                {b.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer border border-green-400/25 bg-green-400/10 text-green-300" disabled={!!acting} onClick={() => act(b.id, "accepted")}>{acting === b.id + "accepted" ? "..." : "Accept"}</button>
                    <button className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer border border-red-400/25 bg-red-400/10 text-red-300" disabled={!!acting} onClick={() => act(b.id, "denied")}>{acting === b.id + "denied" ? "..." : "Deny"}</button>
                  </div>
                )}
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
    <section className="glass rounded-2xl p-6 space-y-5">
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
        <div key={index} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
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
      <div className="grid sm:grid-cols-2 gap-3 text-xs" style={{ color: "#6E6E73" }}>
        <span>Stripe product: {service.stripeProductId || "Not synced"}</span>
        <span>Stripe price: {service.stripePriceId || "Not synced"}</span>
      </div>
    </>
  );
}

function SaveBar({ saving, saveMessage, onSave, onSync }: { saving: boolean; saveMessage: string; onSave: () => void; onSync?: () => void }) {
  return (
    <div className="sticky bottom-4 z-30 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/85 backdrop-blur-xl p-4">
      <p className="text-sm" style={{ color: saveMessage === "Saved." ? "#4ADE80" : "#F87171" }}>{saveMessage || "Remember to save changes."}</p>
      <div className="flex gap-2">
        {onSync && <button className="btn-ghost text-sm px-5 py-2" disabled={saving} onClick={onSync}>{saving ? "Working..." : "Save and sync Stripe"}</button>}
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
