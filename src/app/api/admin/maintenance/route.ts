import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getStorageStats, getRecentActivity, runCleanup } from "@/lib/maintenance";
import { getSmsProvider, getSmsQuota, LOW_QUOTA_THRESHOLD } from "@/lib/sms-client";
import { smsSentToday, SMS_DAILY_CAP } from "@/lib/sms-budget";

export const runtime = "nodejs";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdmin(user.phone)) return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [stats, activity, quotaRemaining, sentToday] = await Promise.all([
    getStorageStats(),
    getRecentActivity(),
    getSmsQuota(),
    smsSentToday(),
  ]);
  return NextResponse.json({
    stats,
    activity,
    sms: {
      provider: getSmsProvider(),
      quotaRemaining,
      low: quotaRemaining !== null && quotaRemaining <= LOW_QUOTA_THRESHOLD,
      sentToday,
      dailyCap: SMS_DAILY_CAP,
      // Whether the deployed runtime actually sees ADMIN_PHONE. When false,
      // booking/cancel/reschedule alerts to the owner are silently skipped.
      adminAlerts: Boolean(process.env.ADMIN_PHONE?.trim()),
    },
  });
}

export async function POST() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const removed = await runCleanup();
  const stats = await getStorageStats();
  return NextResponse.json({ ok: true, removed, stats });
}
