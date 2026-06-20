"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import LoyaltyCard from "@/components/LoyaltyCard";
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

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "#b88a2d",
    bg: "rgba(234,179,8,0.08)",
    border: "rgba(234,179,8,0.2)",
  },
  accepted: {
    label: "Confirmed",
    icon: CheckCircle2,
    color: "#16a34a",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.2)",
  },
  denied: {
    label: "Declined",
    icon: XCircle,
    color: "#dc2626",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: "easeOut" as const },
  }),
};

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "upcoming" | "past">("all");

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

  const filteredBookings = (bookings ?? []).filter((b) => {
    if (activeFilter === "upcoming") return b.booking_date >= today;
    if (activeFilter === "past") return b.booking_date < today;
    return true;
  }).sort((a, b) => b.booking_date.localeCompare(a.booking_date));

  const upcomingCount = (bookings ?? []).filter((b) => b.booking_date >= today).length;

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-[#e8b84b] animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-24 pb-28 sm:pb-16 mobile-page-pad">
        <div className="app-shell max-w-2xl">
          <LoyaltyCard className="mb-6" />

          <motion.div
            className="mb-7"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="mobile-section-label mb-2">Account</p>
            <h1 className="app-title font-semibold text-[#f5f0e6] mb-2">My Bookings</h1>
            {user && (
              <p className="text-sm text-[#8c857a]">
                {user.name} · {upcomingCount} upcoming
              </p>
            )}
          </motion.div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6">
            {(["all", "upcoming", "past"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className="px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all"
                style={{
                  background: activeFilter === f ? "linear-gradient(135deg, #f0cd66 0%, #d4a017 52%, #b5841f 100%)" : "rgba(255,255,255,0.04)",
                  color: activeFilter === f ? "#1c1402" : "#cfc8ba",
                  border: activeFilter === f ? "1px solid rgba(212,160,23,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: activeFilter === f ? "0 8px 20px rgba(212,160,23,0.2)" : "none",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="app-card p-5">
                  <div className="space-y-3">
                    <div className="skeleton h-4 w-32 rounded-full" />
                    <div className="skeleton h-3 w-48 rounded-full" />
                    <div className="skeleton h-3 w-24 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <motion.div
              className="app-card p-10 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex h-16 w-16 mx-auto mb-5 items-center justify-center rounded-2xl bg-[#e8b84b]/12">
                <CalendarDays size={28} className="text-[#e8b84b]" />
              </div>
              <p className="font-semibold text-[#f5f0e6] mb-2">
                {activeFilter === "upcoming" ? "No upcoming bookings" : "No bookings yet"}
              </p>
              <p className="text-sm text-[#8c857a] mb-6">
                {activeFilter === "upcoming"
                  ? "Ready to book your next cut?"
                  : "Your appointments will appear here after you book."}
              </p>
              <Link href="/book" className="btn-primary inline-flex">
                Book now <ArrowRight size={16} />
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking, i) => {
                const config = STATUS_CONFIG[booking.status];
                const StatusIcon = config.icon;
                const displayDate = new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                });
                const isPast = booking.booking_date < today;

                return (
                  <motion.div
                    key={booking.id}
                    className="app-card p-5"
                    initial="hidden"
                    animate="show"
                    variants={fadeUp}
                    custom={i}
                    style={{ opacity: isPast ? 0.75 : 1 }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="font-semibold text-[#f5f0e6] text-base">{booking.service}</p>
                        <p className="text-sm text-[#8c857a] mt-1">{displayDate} at {booking.booking_time}</p>
                      </div>
                      <div
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 shrink-0"
                        style={{ background: config.bg, border: `1px solid ${config.border}` }}
                      >
                        <StatusIcon size={13} style={{ color: config.color }} />
                        <span className="text-xs font-semibold" style={{ color: config.color }}>
                          {config.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/[0.07] pt-4">
                      <span className="text-sm font-semibold text-[#e8b84b]">
                        {formatPrice(booking.service_price_cents)}
                      </span>
                      {!isPast && booking.status === "accepted" && (
                        <Link
                          href={`/book`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8c857a] hover:text-[#e8b84b] transition-colors"
                        >
                          <RefreshCw size={13} /> Rebook
                        </Link>
                      )}
                      {isPast && booking.status === "accepted" && (
                        <Link
                          href="/book"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#e8b84b] hover:text-[#f5f0e6] transition-colors"
                        >
                          <RefreshCw size={13} /> Book again
                        </Link>
                      )}
                    </div>

                    {booking.notes && (
                      <p className="mt-3 text-xs text-[#8c857a] border-t border-white/[0.07] pt-3">{booking.notes}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/book" className="btn-primary inline-flex">
              Book an appointment <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
