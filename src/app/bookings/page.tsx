"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, Clock, RotateCcw, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import { formatPrice } from "@/lib/services";
import { useAuth } from "@/context/auth";

interface Booking {
  id: string;
  service: string;
  booking_date: string;
  booking_time: string;
  status: "pending" | "accepted" | "denied";
  service_price_cents: number;
  notes: string;
  created_at: string;
}

const STATUS = {
  pending: { label: "Pending", icon: Clock, color: "var(--warn)", bg: "var(--warn-bg)" },
  accepted: { label: "Confirmed", icon: Check, color: "var(--ok)", bg: "var(--ok-bg)" },
  denied: { label: "Declined", icon: X, color: "var(--danger)", bg: "var(--danger-bg)" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const } }),
};

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth?redirect=/bookings");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/bookings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setBookings(d?.bookings ?? []);
        setLoading(false);
      })
      .catch(() => {
        setBookings([]);
        setLoading(false);
      });
  }, [user]);

  const today = new Date().toISOString().split("T")[0];

  const filtered = (bookings ?? [])
    .filter((b) => {
      if (filter === "upcoming") return b.booking_date >= today;
      if (filter === "past") return b.booking_date < today;
      return true;
    })
    .sort((a, b) => b.booking_date.localeCompare(a.booking_date));

  const upcomingCount = (bookings ?? []).filter((b) => b.booking_date >= today).length;

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="spin h-6 w-6 rounded-full border-2 border-[var(--line-strong)] border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="has-tabbar min-h-screen px-5 pb-28 pt-24 sm:pb-16">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-7">
            <p className="idx mb-3">[ ACCOUNT ]</p>
            <h1 className="display display--lg">My bookings</h1>
            {user && (
              <p className="mt-2 text-sm text-[var(--mute)]">
                {user.name} · {upcomingCount} upcoming
              </p>
            )}
          </div>

          <div className="mb-6 flex gap-2">
            {(["all", "upcoming", "past"] as const).map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="rounded-full border px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.1em] transition-colors"
                  style={{
                    borderColor: active ? "transparent" : "var(--line-strong)",
                    background: active ? "var(--accent)" : "transparent",
                    color: active ? "#ffffff" : "var(--mute)",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="panel-fill p-5">
                  <div className="space-y-3">
                    <div className="shimmer h-4 w-32 rounded-full" />
                    <div className="shimmer h-3 w-48 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="panel-fill p-12 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[6px] bg-[var(--accent)]/14 text-[var(--accent-deep)]">
                <CalendarDays size={26} />
              </div>
              <p className="font-display text-2xl uppercase">
                {filter === "upcoming" ? "Nothing upcoming" : "No bookings yet"}
              </p>
              <p className="mb-6 mt-2 text-sm text-[var(--mute)]">
                {filter === "upcoming" ? "Ready for your next cut?" : "Your appointments show up here once you book."}
              </p>
              <Link href="/book" className="btn btn--accent inline-flex">
                Book now <ArrowUpRight size={16} strokeWidth={2.5} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((b, i) => {
                const cfg = STATUS[b.status];
                const Icon = cfg.icon;
                const displayDate = new Date(b.booking_date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                });
                const isPast = b.booking_date < today;

                return (
                  <motion.div
                    key={b.id}
                    className="panel-fill p-5"
                    initial="hidden"
                    animate="show"
                    variants={fadeUp}
                    custom={i}
                    style={{ opacity: isPast ? 0.72 : 1 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-xl uppercase leading-none">{b.service}</p>
                        <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.06em] text-[var(--mute)]">
                          {displayDate} · {b.booking_time}
                        </p>
                      </div>
                      <span
                        className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em]"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        <Icon size={12} strokeWidth={3} /> {cfg.label}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-4">
                      <span className="spec text-[var(--accent-deep)]">{formatPrice(b.service_price_cents)}</span>
                      {b.status === "accepted" && (
                        <Link
                          href="/book"
                          className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--mute)] transition-colors hover:text-[var(--accent-deep)]"
                        >
                          <RotateCcw size={13} /> {isPast ? "Book again" : "Rebook"}
                        </Link>
                      )}
                    </div>

                    {b.notes && (
                      <p className="mt-3 border-t border-[var(--line)] pt-3 text-xs text-[var(--mute)]">{b.notes}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/book" className="btn btn--accent inline-flex">
              Book an appointment <ArrowUpRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
