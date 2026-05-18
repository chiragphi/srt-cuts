import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSession, setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { phone, code, name } = await req.json();
  if (!phone || !code)
    return NextResponse.json({ error: "Phone and code required" }, { status: 400 });

  const digits = phone.replace(/\D/g, "").slice(-10);

  const { data: otp } = await supabaseAdmin
    .from("otp_codes")
    .select("*")
    .eq("phone", digits)
    .eq("code", code)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!otp)
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  // Mark OTP used
  await supabaseAdmin.from("otp_codes").update({ used: true }).eq("id", otp.id);

  // Upsert user
  let { data: user } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("phone", digits)
    .single();

  if (!user) {
    const { data: newUser } = await supabaseAdmin
      .from("users")
      .insert({ phone: digits, name: name || "Guest" })
      .select()
      .single();
    user = newUser;
  } else if (name && name !== user.name) {
    await supabaseAdmin.from("users").update({ name }).eq("id", user.id);
    user.name = name;
  }

  const token = await createSession(user.id);
  const cookieHeader = setSessionCookie(token);

  return NextResponse.json(
    { ok: true, user: { id: user.id, phone: user.phone, name: user.name } },
    { headers: { "Set-Cookie": cookieHeader } }
  );
}
