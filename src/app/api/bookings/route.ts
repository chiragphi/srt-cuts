import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { sendSMS, SMS } from "@/lib/twilio";
import { mergeSiteContent } from "@/lib/site-content";

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

  const { service, date, time, notes, paymentMethod } = await req.json();
  if (!service || !date || !time)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (paymentMethod !== "online" && paymentMethod !== "in_store")
    return NextResponse.json({ error: "Choose a payment method" }, { status: 400 });

  const { data: siteContent } = await supabaseAdmin
    .from("site_content")
    .select("content")
    .eq("id", "main")
    .maybeSingle();
  const content = mergeSiteContent(siteContent?.content);
  const selectedService = content.serviceConfigs.find((item) => item.name === service);
  if (!selectedService)
    return NextResponse.json({ error: "Invalid service" }, { status: 400 });

  if (paymentMethod === "online" && !content.venmoUrl) {
    return NextResponse.json(
      { error: "Venmo payment is not ready yet. Please choose pay in store." },
      { status: 400 }
    );
  }

  const block = content.scheduleBlocks.find((b) => b.date === date);
  if (block) {
    return NextResponse.json(
      { error: `That day is unavailable: ${block.reason}` },
      { status: 409 }
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("booking_date", date)
    .eq("booking_time", time)
    .eq("status", "accepted")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "That time is already booked. Please choose another slot." },
      { status: 409 }
    );
  }

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
      service_price_cents: selectedService.amount,
      payment_method: paymentMethod,
      payment_status: paymentMethod === "online" ? "unpaid" : "pay_in_store",
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

  if (paymentMethod === "online") {
    return NextResponse.json({ booking, paymentUrl: content.venmoUrl }, { status: 201 });
  }

  return NextResponse.json({ booking }, { status: 201 });
}
