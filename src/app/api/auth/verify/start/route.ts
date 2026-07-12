import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizePhone } from "@/lib/auth-bypass";
import { requestPhoneVerification } from "@/lib/sms-client";

export const runtime = "nodejs";

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/** One-way hash of the client IP for privacy — we never need to recover it. */
function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`srt-ip-v1:${ip}`).digest("hex").slice(0, 24);
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// Minimum gap between code requests for the same phone. Server-enforced so
// hammering the endpoint can't drain SMS credits; the client mirrors it with
// a countdown on the resend button.
const RESEND_COOLDOWN_MS = 60_000;
// Max SMS requests per unique IP per hour — stops bots cycling through phone numbers.
const IP_LIMIT_PER_HOUR = 5;
// Hard global ceiling per hour — circuit breaker for runaway abuse.
const GLOBAL_LIMIT_PER_HOUR = 200;

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  const digits = normalizePhone(phone ?? "");
  if (digits.length !== 10)
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const ipHash = hashIp(getClientIp(req));

  // Global hourly circuit breaker — if this trips, something is very wrong.
  const { count: globalCount } = await supabaseAdmin
    .from("otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("method", "sms")
    .gte("created_at", oneHourAgo);

  if ((globalCount ?? 0) >= GLOBAL_LIMIT_PER_HOUR) {
    console.error(
      `⚠️ Global SMS circuit breaker tripped (${globalCount}/${GLOBAL_LIMIT_PER_HOUR}/hr) — possible bot attack.`,
    );
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  // Per-IP rate limit — prevents one machine from rotating through phone numbers.
  // Requires ip_hash column on otp_codes (see supabase/migrations/add_ip_hash.sql).
  const { count: ipCount } = await supabaseAdmin
    .from("otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", oneHourAgo);

  if ((ipCount ?? 0) >= IP_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many requests from your network. Try again in an hour." },
      { status: 429 },
    );
  }

  const { data: last } = await supabaseAdmin
    .from("otp_codes")
    .select("created_at")
    .eq("phone", digits)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.created_at) {
    const elapsed = Date.now() - new Date(last.created_at).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: `Please wait ${retryAfter}s before requesting another code.`, retryAfter },
        { status: 429 },
      );
    }
  }

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
      ip_hash: ipHash,
      method: "sms",
      code: hashCode(result.code),
      expires_at: new Date(result.expiresAt).toISOString(),
    });
    return NextResponse.json({ method: "sms" });
  }

  await supabaseAdmin.from("otp_codes").insert({
    phone: digits,
    ip_hash: ipHash,
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
