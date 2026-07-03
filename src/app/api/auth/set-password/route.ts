import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizePhone } from "@/lib/auth-bypass";
import { readVerifiedToken } from "@/lib/verify-token";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";
import { trustDevice, setDeviceCookie } from "@/lib/device-trust";

export async function POST(req: NextRequest) {
  const { phone, password, verifiedToken } = await req.json();
  const digits = normalizePhone(phone ?? "");

  const tokenPhone = typeof verifiedToken === "string" ? await readVerifiedToken(verifiedToken) : null;
  if (!tokenPhone || tokenPhone !== digits)
    return NextResponse.json({ error: "Verification expired. Please verify your phone again." }, { status: 401 });

  const strengthError = validatePasswordStrength(String(password ?? ""));
  if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

  const { data: user } = await supabaseAdmin.from("users").select("*").eq("phone", digits).maybeSingle();
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const passwordHash = await hashPassword(password);
  await supabaseAdmin.from("users").update({ password_hash: passwordHash }).eq("id", user.id);

  const sessionToken = await createSession(user.id);
  const deviceToken = await trustDevice(user.id);

  const headers = new Headers();
  headers.append("Set-Cookie", setSessionCookie(sessionToken));
  headers.append("Set-Cookie", setDeviceCookie(deviceToken));

  return NextResponse.json(
    { ok: true, user: { id: user.id, phone: user.phone, name: user.name } },
    { headers }
  );
}
