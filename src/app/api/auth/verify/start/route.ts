import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizePhone } from "@/lib/auth-bypass";
import { requestPhoneVerification } from "@/lib/sms-client";

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  const digits = normalizePhone(phone ?? "");
  if (digits.length !== 10)
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

  // Invalidate any previous unused verification attempt for this phone.
  await supabaseAdmin.from("otp_codes").update({ used: true }).eq("phone", digits).eq("used", false);

  let result;
  try {
    result = await requestPhoneVerification(digits, digits);
  } catch (error) {
    console.error("Verification service unavailable:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Text verification is temporarily unavailable. Please try again in a few minutes." },
      { status: 503 },
    );
  }

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  if (result.method === "sms") {
    await supabaseAdmin.from("otp_codes").insert({
      phone: digits,
      method: "sms",
      code: hashCode(result.code),
      expires_at: new Date(result.expiresAt).toISOString(),
    });
    return NextResponse.json({ method: "sms" });
  }

  await supabaseAdmin.from("otp_codes").insert({
    phone: digits,
    method: "totp",
    totp_secret: result.secret,
    expires_at: expiresAt,
  });
  return NextResponse.json({
    method: "totp",
    otpAuthUrl: result.otpAuthUrl,
    secret: result.secret,
    reason: result.reason,
  });
}
