import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createBypassSession, getAuthBypass, normalizePhone } from "@/lib/auth-bypass";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

  const bypass = getAuthBypass(phone);
  if (bypass) {
    try {
      const cookieHeader = await createBypassSession({ phone: bypass.phone, name: bypass.name });
      return NextResponse.json(
        { bypass: true, redirect: bypass.redirect },
        { headers: { "Set-Cookie": cookieHeader } }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sign in";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const digits = normalizePhone(phone);
  if (digits.length !== 10)
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("password_hash")
    .eq("phone", digits)
    .maybeSingle();

  return NextResponse.json({
    exists: Boolean(user),
    hasPassword: Boolean(user?.password_hash),
  });
}
