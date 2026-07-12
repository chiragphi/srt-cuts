import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyPhone } from "@/lib/sms-client";
import { SMS } from "@/lib/sms-messages";
import { mergeSiteContent } from "@/lib/site-content";
import { bookingStartUtcMs, shopToday } from "@/lib/shop-time";

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
    const msUntilStart = bookingStartUtcMs(b.booking_date, b.booking_time) - now;
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
