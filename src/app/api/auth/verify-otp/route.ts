import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSession, setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { phone, code, name } = await req.json();
  if (!phone || !code)
    return NextResponse.json({ error: "Phone and code required" }, { status: 400 });

  const digits = phone.replace(/\D/g, "").slice(-10);
  const displayName = typeof name === "string" ? name.trim() : "";
  if (digits.length !== 10)
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

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

  const { data: user, error: userLookupError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("phone", digits)
    .maybeSingle();

  if (userLookupError)
    return NextResponse.json({ error: "Failed to load account" }, { status: 500 });

  if (!user && !displayName)
    return NextResponse.json({ error: "Name required" }, { status: 400 });

  const { error: useOtpError } = await supabaseAdmin
    .from("otp_codes")
    .update({ used: true })
    .eq("id", otp.id);

  if (useOtpError)
    return NextResponse.json({ error: "Failed to verify code" }, { status: 500 });

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
    const { error: updateUserError } = await supabaseAdmin
      .from("users")
      .update({ name: displayName })
      .eq("id", user.id);

    if (updateUserError)
      return NextResponse.json({ error: "Failed to update account" }, { status: 500 });

    sessionUser = { ...user, name: displayName };
  }

  const token = await createSession(sessionUser.id);
  const cookieHeader = setSessionCookie(token);

  return NextResponse.json(
    { ok: true, user: { id: sessionUser.id, phone: sessionUser.phone, name: sessionUser.name } },
    { headers: { "Set-Cookie": cookieHeader } }
  );
}
