import { NextRequest, NextResponse } from "next/server";
import { getSession, isImpersonating } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyPhone } from "@/lib/sms-client";
import { SMS } from "@/lib/sms-messages";
import { mergeSiteContent } from "@/lib/site-content";

const CUTOFF_MS = 24 * 60 * 60 * 1000; // no self-service changes within 24h

/** Convert a slot label ("9:00 AM") to 24h "HH:MM:SS". */
function slotTo24h(time: string): string {
  const [raw, period] = time.split(" ");
  const [h, m] = raw.split(":").map(Number);
  const hours = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
  return `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** Local Date for the start of a booking (date + slot time). */
function bookingStart(date: string, time: string): Date {
  return new Date(`${date}T${slotTo24h(time)}`);
}

function displayDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isImpersonating())
    return NextResponse.json({ error: "Read-only while viewing as a customer." }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const action = body.action as "cancel" | "reschedule";
  if (action !== "cancel" && action !== "reschedule")
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  // Owner-scoped lookup: a booking that isn't yours reads as not found.
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  if (booking.status === "cancelled" || booking.status === "denied")
    return NextResponse.json({ error: "This booking can no longer be changed." }, { status: 409 });

  if (bookingStart(booking.booking_date, booking.booking_time).getTime() - Date.now() < CUTOFF_MS)
    return NextResponse.json(
      { error: "Too close to your appointment — text us for last-minute changes." },
      { status: 409 }
    );

  const adminPhone = process.env.ADMIN_PHONE?.trim();
  if (!adminPhone)
    console.error("ADMIN_PHONE not set — skipping admin alert for booking change. Set it in the deployment env and redeploy.");

  // ── Cancel ────────────────────────────────────────────────────────
  if (action === "cancel") {
    const { data: updated, error } = await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();
    if (error || !updated)
      return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });

    if (adminPhone)
      await notifyPhone(
        adminPhone,
        SMS.bookingCancelledAdmin(
          booking.user_name,
          booking.user_phone,
          booking.service,
          displayDate(booking.booking_date),
          booking.booking_time
        )
      );

    return NextResponse.json({ booking: updated });
  }

  // ── Reschedule ────────────────────────────────────────────────────
  const { date, time } = body as { date?: string; time?: string };
  if (!date || !time) return NextResponse.json({ error: "Pick a new date and time." }, { status: 400 });

  if (bookingStart(date, time).getTime() - Date.now() < CUTOFF_MS)
    return NextResponse.json(
      { error: "Pick a time at least 24 hours out." },
      { status: 409 }
    );

  const { data: siteContent } = await supabaseAdmin
    .from("site_content")
    .select("content")
    .eq("id", "main")
    .maybeSingle();
  const content = mergeSiteContent(siteContent?.content);

  if (content.scheduleBlocks.some((b) => b.date === date))
    return NextResponse.json({ error: "That day is unavailable." }, { status: 409 });

  const dow = String(new Date(date + "T00:00:00").getDay());
  const openSlots = date in content.dateAvailability ? content.dateAvailability[date] : content.weeklyAvailability[dow] ?? [];
  if (!openSlots.includes(time))
    return NextResponse.json({ error: "That time isn't open. Pick another slot." }, { status: 409 });

  // Slot must not already be taken by a confirmed booking (ignore this one).
  const { data: clash } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("booking_date", date)
    .eq("booking_time", time)
    .eq("status", "accepted")
    .neq("id", id)
    .maybeSingle();
  if (clash)
    return NextResponse.json({ error: "That time is already booked. Pick another slot." }, { status: 409 });

  const { data: updated, error } = await supabaseAdmin
    .from("bookings")
    .update({ booking_date: date, booking_time: time, status: "pending" })
    .eq("id", id)
    .select()
    .single();
  if (error || !updated)
    return NextResponse.json({ error: "Failed to reschedule booking" }, { status: 500 });

  if (adminPhone)
    await notifyPhone(
      adminPhone,
      SMS.bookingRescheduledAdmin(
        booking.user_name,
        booking.user_phone,
        booking.service,
        displayDate(booking.booking_date),
        booking.booking_time,
        displayDate(date),
        time
      )
    );

  return NextResponse.json({ booking: updated });
}
