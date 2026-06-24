import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getStorageStats, getRecentActivity, runCleanup } from "@/lib/maintenance";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdmin(user.phone)) return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [stats, activity] = await Promise.all([getStorageStats(), getRecentActivity()]);
  return NextResponse.json({ stats, activity });
}

export async function POST() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const removed = await runCleanup();
  const stats = await getStorageStats();
  return NextResponse.json({ ok: true, removed, stats });
}
