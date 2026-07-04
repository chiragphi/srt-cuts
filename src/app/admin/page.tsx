"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { computeClients, type Booking } from "@/lib/analytics";
import { AdminDataContext, type AdminData } from "@/components/admin/data";
import { type ViewId } from "@/components/admin/nav";
import { RailNav, OperatorMark } from "@/components/admin/Rail";
import { TopBar } from "@/components/admin/TopBar";
import { CustomerPicker } from "@/components/admin/CustomerPicker";
import { Spinner } from "@/components/admin/primitives";
import { ViewFade } from "@/components/admin/motion";
import { OverviewView } from "@/components/admin/views/OverviewView";
import { CalendarView } from "@/components/admin/views/CalendarView";
import { BookingsView } from "@/components/admin/views/BookingsView";
import { ClientsView } from "@/components/admin/views/ClientsView";
import { InsightsView } from "@/components/admin/views/InsightsView";
import { MoneyView } from "@/components/admin/views/MoneyView";
import { ContentView } from "@/components/admin/views/ContentView";
import { ScheduleView } from "@/components/admin/views/ScheduleView";
import { AssistantView } from "@/components/admin/views/AssistantView";
import { SystemView } from "@/components/admin/views/SystemView";

const META: Record<ViewId, { title: string; subtitle?: string }> = {
  overview: { title: "Overview", subtitle: "Your cockpit at a glance" },
  calendar: { title: "Calendar", subtitle: "Bookings and open slots" },
  bookings: { title: "Bookings", subtitle: "Accept, deny, and get paid" },
  clients: { title: "Clients", subtitle: "History, spend, and cadence" },
  insights: { title: "Insights", subtitle: "The full analytics picture" },
  money: { title: "Money", subtitle: "Revenue and tax set-aside" },
  content: { title: "Content", subtitle: "Everything on your storefront" },
  schedule: { title: "Schedule", subtitle: "Availability and policies" },
  assistant: { title: "Assistant", subtitle: "Run the shop by chat" },
  system: { title: "System", subtitle: "Health and maintenance" },
};

export default function AdminPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [content, setContentState] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [view, setView] = useState<ViewId>("overview");
  const [drawer, setDrawer] = useState(false);
  const [viewAsOpen, setViewAsOpen] = useState(false);
  const [impersonatingPhone, setImpersonatingPhone] = useState<string | null>(null);

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
    setContentState(contentData.content ?? DEFAULT_SITE_CONTENT);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const act = useCallback(
    async (id: string, status: "accepted" | "denied") => {
      setActing(id + status);
      await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setActing(null);
      await load();
    },
    [load]
  );

  const del = useCallback(
    async (id: string) => {
      setActing(id + "delete");
      await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      setActing(null);
      await load();
    },
    [load]
  );

  const setPaymentStatus = useCallback(
    async (id: string, paymentStatus: "unpaid" | "paid" | "refunded") => {
      setActing(id + paymentStatus);
      await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus }),
      });
      setActing(null);
      await load();
    },
    [load]
  );

  const saveContent = useCallback(
    async (next: SiteContent = content) => {
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
      setContentState(data.content);
      setSaveMessage("Saved.");
    },
    [content]
  );

  const impersonate = useCallback(async (phone: string) => {
    setImpersonatingPhone(phone);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        setImpersonatingPhone(null);
        setViewAsOpen(false);
        return;
      }
      // Land on the customer home as that customer; the global banner takes over.
      window.location.href = "/";
    } catch {
      setImpersonatingPhone(null);
    }
  }, []);

  const clients = useMemo(() => computeClients(bookings), [bookings]);
  const pendingCount = useMemo(() => bookings.filter((b) => b.status === "pending").length, [bookings]);

  const goTo = useCallback((v: ViewId) => {
    setView(v);
    setDrawer(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const ctx: AdminData = {
    bookings,
    content,
    clients,
    setContent: setContentState,
    saveContent,
    saving,
    saveMessage,
    reload: load,
    acting,
    act,
    del,
    setPaymentStatus,
    goTo,
    openViewAs: () => setViewAsOpen(true),
    impersonate,
    impersonatingPhone,
  };

  const meta = META[view];

  return (
    <AdminDataContext.Provider value={ctx}>
      <div style={{ minHeight: "100dvh", display: "flex" }}>
        {/* Desktop rail */}
        <aside
          className="hidden lg:flex"
          style={{
            width: 250,
            flex: "none",
            flexDirection: "column",
            gap: 28,
            padding: "24px 16px",
            borderRight: "1px solid var(--a-line)",
            position: "sticky",
            top: 0,
            height: "100dvh",
            background: "var(--a-surface)",
            zIndex: "var(--z-rail)" as unknown as number,
          }}
        >
          <OperatorMark />
          <div style={{ flex: 1, overflowY: "auto" }}>
            <RailNav active={view} onSelect={goTo} pendingCount={pendingCount} />
          </div>
          <EnvMark />
        </aside>

        {/* Main column */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <TopBar
            title={meta.title}
            subtitle={meta.subtitle}
            onMenu={() => setDrawer(true)}
            onViewAs={() => setViewAsOpen(true)}
            onSignOut={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/");
            }}
          />
          <main
            style={{
              flex: 1,
              width: "100%",
              maxWidth: "var(--a-content)",
              marginInline: "auto",
              padding: "clamp(20px, 3vw, 40px) clamp(16px, 3vw, 40px) 96px",
            }}
          >
            {loading ? (
              <Spinner />
            ) : (
              <AnimatePresence mode="wait">
                <ViewFade id={view} key={view}>
                  {view === "overview" && <OverviewView />}
                  {view === "calendar" && <CalendarView />}
                  {view === "bookings" && <BookingsView />}
                  {view === "clients" && <ClientsView />}
                  {view === "insights" && <InsightsView />}
                  {view === "money" && <MoneyView />}
                  {view === "content" && <ContentView />}
                  {view === "schedule" && <ScheduleView />}
                  {view === "assistant" && <AssistantView />}
                  {view === "system" && <SystemView />}
                </ViewFade>
              </AnimatePresence>
            )}
          </main>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {drawer && (
            <motion.div
              className="lg:hidden"
              style={{ position: "fixed", inset: 0, zIndex: "var(--z-overlay)" as unknown as number }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawer(false)}
            >
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }} />
              <motion.aside
                onClick={(e) => e.stopPropagation()}
                initial={reduce ? undefined : { x: -280 }}
                animate={reduce ? undefined : { x: 0 }}
                exit={reduce ? undefined : { x: -280 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "relative",
                  width: 262,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                  padding: "24px 16px",
                  background: "var(--a-surface)",
                  borderRight: "1px solid var(--a-line)",
                }}
              >
                <div className="flex items-center justify-between">
                  <OperatorMark />
                  <button
                    className="ax-btn ax-btn--sm"
                    aria-label="Close menu"
                    onClick={() => setDrawer(false)}
                    style={{ width: 36, height: 36, minHeight: 36, padding: 0 }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <RailNav active={view} onSelect={goTo} pendingCount={pendingCount} />
                </div>
                <EnvMark />
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <CustomerPicker
          open={viewAsOpen}
          clients={clients}
          busyPhone={impersonatingPhone}
          onClose={() => setViewAsOpen(false)}
          onPick={(phone) => impersonate(phone)}
        />
      </div>
    </AdminDataContext.Provider>
  );
}

function EnvMark() {
  return (
    <div style={{ padding: "0 12px", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--s-ok)", flex: "none" }} />
      <span style={{ fontSize: 12, color: "var(--a-text-3)" }}>Production · srtcuts.hair</span>
    </div>
  );
}
