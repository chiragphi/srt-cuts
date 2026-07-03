import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";
import { revokeTrustedDevice, clearDeviceCookie } from "@/lib/device-trust";

export async function POST() {
  await revokeTrustedDevice();

  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookie());
  headers.append("Set-Cookie", clearDeviceCookie());

  return NextResponse.json({ ok: true }, { headers });
}
