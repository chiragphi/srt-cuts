import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyPhone } from "@/lib/sms-client";
import { SMS } from "@/lib/sms-messages";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !isAdmin(user.phone))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { status, paymentStatus } = await req.json();

  const updates: { status?: "accepted" | "denied"; payment_status?: "unpaid" | "paid" | "refunded" } = {};
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

  if (status) {
    const displayDate = new Date(booking.booking_date + "T00:00:00").toLocaleDateString(
      "en-US",
      { weekday: "long", month: "long", day: "numeric" }
    );

    const msg =
      status === "accepted"
        ? SMS.bookingAccepted(booking.user_name, booking.service, displayDate, booking.booking_time)
        : SMS.bookingDenied(booking.user_name, booking.service, displayDate, booking.booking_time);
    await notifyPhone(booking.user_phone, msg);
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
