import crypto from "node:crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";

const COOKIE = "srt_device";
const EXPIRY_DAYS = 180;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Mark this device as trusted for `userId`. Returns the raw token to store in a cookie. */
export async function trustDevice(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  await supabaseAdmin.from("trusted_devices").insert({
    user_id: userId,
    token_hash: hashToken(token),
  });
  return token;
}

/** Resolve the device cookie on the current request to a signed-in user, if trusted. */
export async function getTrustedDeviceUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;

  const { data } = await supabaseAdmin
    .from("trusted_devices")
    .select("id, user_id, users(id, phone, name)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!data) return null;

  await supabaseAdmin
    .from("trusted_devices")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  const user = Array.isArray(data.users) ? data.users[0] : data.users;
  return user as { id: string; phone: string; name: string } | null;
}

/** Revoke the device cookie on the current request (called on logout). */
export async function revokeTrustedDevice(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return;
  await supabaseAdmin.from("trusted_devices").delete().eq("token_hash", hashToken(token));
}

export function setDeviceCookie(token: string): string {
  const expires = new Date();
  expires.setDate(expires.getDate() + EXPIRY_DAYS);
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}`;
}

export function clearDeviceCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
