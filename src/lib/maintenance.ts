import { supabaseAdmin } from "./supabase";

/**
 * Storage maintenance for SRT Cuts.
 *
 * The only tables that grow without bound are auth ephemera: `otp_codes`
 * (one row per login code, never cleared) and `sessions` (one row per login,
 * kept 30 days). Cleaning those is the real Supabase storage optimization.
 *
 * Cleanup NEVER touches customer data — bookings, users, and site_content are
 * left intact. It only removes rows that are already dead weight: used or
 * expired OTP codes, and sessions past their expiry (which can no longer
 * authenticate anyway).
 */

async function countWhere(
  table: string,
  build: (q: ReturnType<typeof baseCount>) => ReturnType<typeof baseCount>
): Promise<number> {
  const { count } = await build(baseCount(table));
  return count ?? 0;
}

function baseCount(table: string) {
  return supabaseAdmin.from(table).select("*", { count: "exact", head: true });
}

export interface StorageStats {
  otp: { total: number; stale: number };
  sessions: { total: number; expired: number };
  bookings: { total: number; pending: number; accepted: number; denied: number };
  users: { total: number };
}

export async function getStorageStats(): Promise<StorageStats> {
  const nowIso = new Date().toISOString();

  const [
    otpTotal,
    otpUsed,
    otpExpiredUnused,
    sessionsTotal,
    sessionsExpired,
    bookingsTotal,
    bookingsPending,
    bookingsAccepted,
    bookingsDenied,
    usersTotal,
  ] = await Promise.all([
    countWhere("otp_codes", (q) => q),
    countWhere("otp_codes", (q) => q.eq("used", true)),
    countWhere("otp_codes", (q) => q.eq("used", false).lt("expires_at", nowIso)),
    countWhere("sessions", (q) => q),
    countWhere("sessions", (q) => q.lt("expires_at", nowIso)),
    countWhere("bookings", (q) => q),
    countWhere("bookings", (q) => q.eq("status", "pending")),
    countWhere("bookings", (q) => q.eq("status", "accepted")),
    countWhere("bookings", (q) => q.eq("status", "denied")),
    countWhere("users", (q) => q),
  ]);

  return {
    otp: { total: otpTotal, stale: otpUsed + otpExpiredUnused },
    sessions: { total: sessionsTotal, expired: sessionsExpired },
    bookings: { total: bookingsTotal, pending: bookingsPending, accepted: bookingsAccepted, denied: bookingsDenied },
    users: { total: usersTotal },
  };
}

export interface CleanupResult {
  otpRemoved: number;
  sessionsRemoved: number;
  ranAt: string;
}

export async function runCleanup(): Promise<CleanupResult> {
  const nowIso = new Date().toISOString();

  // OTP codes: remove everything already used, then anything expired.
  const { data: usedOtp } = await supabaseAdmin.from("otp_codes").delete().eq("used", true).select("id");
  const { data: expiredOtp } = await supabaseAdmin.from("otp_codes").delete().lt("expires_at", nowIso).select("id");

  // Sessions: remove anything past expiry — it can no longer authenticate.
  const { data: expiredSessions } = await supabaseAdmin.from("sessions").delete().lt("expires_at", nowIso).select("token");

  return {
    otpRemoved: (usedOtp?.length ?? 0) + (expiredOtp?.length ?? 0),
    sessionsRemoved: expiredSessions?.length ?? 0,
    ranAt: nowIso,
  };
}

export interface ActivityItem {
  id: string;
  kind: "pending" | "accepted" | "denied";
  customer: string;
  service: string;
  bookingDate: string;
  bookingTime: string;
  at: string;
}

export async function getRecentActivity(limit = 20): Promise<ActivityItem[]> {
  const { data } = await supabaseAdmin
    .from("bookings")
    .select("id, user_name, service, booking_date, booking_time, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((b) => ({
    id: b.id as string,
    kind: b.status as ActivityItem["kind"],
    customer: (b.user_name as string) ?? "Customer",
    service: (b.service as string) ?? "",
    bookingDate: (b.booking_date as string) ?? "",
    bookingTime: (b.booking_time as string) ?? "",
    at: (b.created_at as string) ?? "",
  }));
}
