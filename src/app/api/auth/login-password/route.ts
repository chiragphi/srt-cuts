import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizePhone } from "@/lib/auth-bypass";
import { verifyPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";
import { trustDevice, setDeviceCookie } from "@/lib/device-trust";

export async function POST(req: NextRequest) {
  const { phone, password } = await req.json();
  const digits = normalizePhone(phone ?? "");
  if (digits.length !== 10 || !password)
    return NextResponse.json({ error: "Phone and password required" }, { status: 400 });

  const { data: user } = await supabaseAdmin.from("users").select("*").eq("phone", digits).maybeSingle();

  const genericError = () => NextResponse.json({ error: "Invalid phone or password." }, { status: 401 });

  if (!user || !user.password_hash) return genericError();

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return genericError();

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
