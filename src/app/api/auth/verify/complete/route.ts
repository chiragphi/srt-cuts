import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizePhone } from "@/lib/auth-bypass";
import { verifyTotp } from "@/lib/sms-gateway";
import { issueVerifiedToken } from "@/lib/verify-token";

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const { phone, code, name } = await req.json();
  const digits = normalizePhone(phone ?? "");
  const displayName = typeof name === "string" ? name.trim() : "";
  if (digits.length !== 10 || !code)
    return NextResponse.json({ error: "Phone and code required" }, { status: 400 });

  const { data: pending } = await supabaseAdmin
    .from("otp_codes")
    .select("*")
    .eq("phone", digits)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!pending) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  const cleanCode = String(code).replace(/\D/g, "");
  let valid = false;
  if (pending.method === "totp") {
    valid = Boolean(pending.totp_secret) && verifyTotp(pending.totp_secret, cleanCode);
  } else {
    const provided = hashCode(cleanCode);
    valid =
      typeof pending.code === "string" &&
      provided.length === pending.code.length &&
      crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(pending.code));
  }

  if (!valid) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  await supabaseAdmin.from("otp_codes").update({ used: true }).eq("id", pending.id);

  const { data: user, error: userLookupError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("phone", digits)
    .maybeSingle();

  if (userLookupError)
    return NextResponse.json({ error: "Failed to load account" }, { status: 500 });

  if (!user && !displayName)
    return NextResponse.json({ error: "Name required" }, { status: 400 });

  let sessionUser = user;
  if (!user) {
    const { data: newUser, error: createUserError } = await supabaseAdmin
      .from("users")
      .insert({ phone: digits, name: displayName })
      .select()
      .single();

    if (createUserError || !newUser)
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });

    sessionUser = newUser;
  } else if (displayName && displayName !== user.name) {
    await supabaseAdmin.from("users").update({ name: displayName }).eq("id", user.id);
    sessionUser = { ...user, name: displayName };
  }

  const verifiedToken = await issueVerifiedToken(digits);

  return NextResponse.json({
    ok: true,
    verifiedToken,
    isNewUser: !user,
    hadPassword: Boolean(user?.password_hash),
    name: sessionUser.name,
  });
}
