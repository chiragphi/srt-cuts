import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendSMS, SMS } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10)
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

  // Invalidate old unused OTPs
  await supabaseAdmin
    .from("otp_codes")
    .update({ used: true })
    .eq("phone", digits)
    .eq("used", false);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await supabaseAdmin.from("otp_codes").insert({ phone: digits, code, expires_at: expiresAt });

  try {
    await sendSMS(digits, SMS.otp(code));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send SMS";
    console.error("OTP SMS failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
