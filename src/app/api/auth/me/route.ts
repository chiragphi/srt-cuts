import { NextResponse } from "next/server";
import { getSession, isAdmin, createSession, setSessionCookie } from "@/lib/session";
import { getTrustedDeviceUser } from "@/lib/device-trust";

export async function GET() {
  const user = await getSession();
  if (user) return NextResponse.json({ user, isAdmin: isAdmin(user.phone) });

  // No session, but this browser may be a trusted device — auto sign-in.
  const deviceUser = await getTrustedDeviceUser();
  if (!deviceUser) return NextResponse.json({ user: null, isAdmin: false }, { status: 401 });

  const token = await createSession(deviceUser.id);
  return NextResponse.json(
    { user: deviceUser, isAdmin: isAdmin(deviceUser.phone) },
    { headers: { "Set-Cookie": setSessionCookie(token) } }
  );
}
