import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ user: null, isAdmin: false }, { status: 401 });
  return NextResponse.json({ user, isAdmin: isAdmin(user.phone) });
}
