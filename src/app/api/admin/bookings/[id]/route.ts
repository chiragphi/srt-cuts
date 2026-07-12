import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyPhone } from "@/lib/sms-client";
import { SMS } from "@/lib/sms-messages";
import { TIME_SLOTS } from "@/lib/schedule";
import { mergeSiteContent } from "@/lib/site-content";

export const runtime = "nodejs";

const longDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

// Pulled when a text may go out: the street address (kept off the public
// site, shared with confirmed customers) and the admin's SMS switches.
async function siteContent() {
  const { data } = await supabaseAdmin
    .from("site_content")
    .select("content")
    .eq("id", "main")
    .maybeSingle();
  return mergeSiteContent(data?.content);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !isAdmin(user.phone))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { status, paymentStatus, bookingDate, bookingTime, notify } = await req.json();

  const updates: {
    status?: "accepted" | "denied";
    payment_status?: "unpaid" | "paid" | "refunded";
    booking_date?: string;
    booking_time?: string;
  } = {};

  if (status) {
    if (status !== "accepted" && status !== "denied")
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    updates.status = status;
  }
  if (paymentStatus) {
    if (paymentStatus !== "unpaid" && paymentStatus !== "paid" && paymentStatus !== "refunded")
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    updates.payment_status = paymentStatus;
  }

  // Reschedule: admin moves the booking to a new day/time. Either field may be
  // sent; both are validated so we never write a garbage slot.
  const isReschedule = bookingDate !== undefined || bookingTime !== undefined;
  if (bookingDate !== undefined) {
    if (typeof bookingDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate))
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    updates.booking_date = bookingDate;
  }
  if (bookingTime !== undefined) {
    if (typeof bookingTime !== "string" || !TIME_SLOTS.includes(bookingTime))
      return NextResponse.json({ error: "Invalid time" }, { status: 400 });
    updates.booking_time = bookingTime;
  }

  if (!Object.keys(updates).length)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (!booking)
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const content = await siteContent();

  if (status && content.smsPrefs.customerBookingTexts) {
    const msg =
      status === "accepted"
        ? SMS.bookingAccepted(booking.user_name, booking.service, longDate(booking.booking_date), booking.booking_time, content.address)
        : SMS.bookingDenied(booking.user_name, booking.service, longDate(booking.booking_date), booking.booking_time);
    await notifyPhone(booking.user_phone, msg);
  }

  // Only text about a move when the admin asked us to (they may have told the
  // client in person already).
  if (isReschedule && notify && content.smsPrefs.customerBookingTexts) {
    await notifyPhone(
      booking.user_phone,
      SMS.bookingMovedCustomer(booking.user_name, booking.service, longDate(booking.booking_date), booking.booking_time, content.address)
    );
  }

  return NextResponse.json({ booking });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !isAdmin(user.phone))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from("bookings").delete().eq("id", id);

  if (error)
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
