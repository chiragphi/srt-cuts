import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyPhone } from "@/lib/sms-client";
import { SMS } from "@/lib/sms-messages";
import { mergeSiteContent } from "@/lib/site-content";

/**
 * 30-minute appointment reminders, invoked by Vercel Cron (see vercel.json).
 *
 * Every 5 minutes this scans today's accepted bookings and texts both the
 * customer and the admin for any appointment starting within the next 30
 * minutes that hasn't been reminded yet. `bookings.reminder_sent_at` is
 * claimed (conditional update) BEFORE sending, so overlapping cron runs can
 * never double-text anyone.
 *
 * Same auth as the cleanup cron: if CRON_SECRET is set, require it as a
 * Bearer token. The claim column makes replays harmless either way.
 */

const REMINDER_WINDOW_MS = 30 * 60 * 1000;

// Booking slots are wall-clock times at the shop (Herriman, UT). Vercel runs
// in UTC, so "30 minutes from now" must be computed in the shop's zone.
const SHOP_TZ = process.env.SHOP_TZ?.trim() || "America/Denver";

/** Convert a slot label ("9:00 AM") to 24h "HH:MM:SS". */
function slotTo24h(time: string): string {
  const [raw, period] = time.split(" ");
  const [h, m] = raw.split(":").map(Number);
  const hours = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
  return `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** What time (UTC ms) is `date` + `time24` on the shop's wall clock? */
function shopTimeToUtcMs(date: string, time24: string): number {
  // Parse as if UTC, then subtract the shop zone's offset at that instant.
  const asUtc = Date.parse(`${date}T${time24}Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(asUtc));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const zonedAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - (zonedAsUtc - asUtc);
}

/** Today's date ("YYYY-MM-DD") on the shop's wall clock. */
function shopToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ, dateStyle: "short" }).format(new Date());
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select("id, user_name, user_phone, service, booking_date, booking_time")
    .eq("booking_date", shopToday())
    .eq("status", "accepted")
    .is("reminder_sent_at", null);

  if (error) {
    // Most likely cause: the reminder_sent_at migration hasn't been run yet.
    console.error(`Reminder cron query failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const due = (bookings ?? []).filter((b) => {
    const msUntilStart = shopTimeToUtcMs(b.booking_date, slotTo24h(b.booking_time)) - now;
    return msUntilStart > 0 && msUntilStart <= REMINDER_WINDOW_MS;
  });

  if (due.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const adminPhone = process.env.ADMIN_PHONE?.trim();
  if (!adminPhone)
    console.error("ADMIN_PHONE not set — sending customer reminders only. Set it in the deployment env and redeploy.");

  const { data: siteRow } = await supabaseAdmin
    .from("site_content")
    .select("content")
    .eq("id", "main")
    .maybeSingle();
  const address = mergeSiteContent(siteRow?.content).address;

  let sent = 0;
  for (const b of due) {
    // Claim before sending so a concurrent/replayed run skips this booking.
    const { data: claimed } = await supabaseAdmin
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", b.id)
      .is("reminder_sent_at", null)
      .select("id");
    if (!claimed?.length) continue;

    await notifyPhone(b.user_phone, SMS.reminderCustomer(b.user_name, b.service, b.booking_time, address));
    if (adminPhone)
      await notifyPhone(adminPhone, SMS.reminderAdmin(b.user_name, b.user_phone, b.service, b.booking_time));
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
