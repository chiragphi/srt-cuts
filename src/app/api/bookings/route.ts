import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { sendSMS, SMS } from "@/lib/twilio";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("user_id", user.id)
    .order("booking_date", { ascending: true });

  return NextResponse.json({ bookings: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { service, date, time, notes } = await req.json();
  if (!service || !date || !time)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .insert({
      user_id: user.id,
      user_name: user.name,
      user_phone: user.phone,
      service,
      booking_date: date,
      booking_time: time,
      notes: notes ?? "",
      status: "pending",
    })
    .select()
    .single();

  if (error || !booking)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Notify customer
  try {
    await sendSMS(
      user.phone,
      SMS.bookingCreatedCustomer(user.name, service, displayDate, time)
    );
  } catch {}

  // Notify admin
  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    try {
      await sendSMS(
        adminPhone,
        SMS.bookingCreatedAdmin(user.name, user.phone, service, displayDate, time)
      );
    } catch {}
  }

  return NextResponse.json({ booking }, { status: 201 });
}
