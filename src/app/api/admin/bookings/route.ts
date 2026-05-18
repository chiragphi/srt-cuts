import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const user = await getSession();
  if (!user || !isAdmin(user.phone))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });

  return NextResponse.json({ bookings: data ?? [] });
}
