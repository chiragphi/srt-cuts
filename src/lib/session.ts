import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";

const COOKIE = "srt_session";
const EXPIRY_DAYS = 30;

export interface SessionUser {
  id: string;
  phone: string;
  name: string;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;

  const { data } = await supabaseAdmin
    .from("sessions")
    .select("expires_at, users(id, phone, name)")
    .eq("token", token)
    .single();

  if (!data || new Date(data.expires_at) < new Date()) return null;
  const user = Array.isArray(data.users) ? data.users[0] : data.users;
  return user as SessionUser;
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS);

  await supabaseAdmin.from("sessions").insert({
    token,
    user_id: userId,
    expires_at: expiresAt.toISOString(),
  });

  return token;
}

export function setSessionCookie(token: string) {
  // Called from route handlers — returns Set-Cookie header value
  const expires = new Date();
  expires.setDate(expires.getDate() + EXPIRY_DAYS);
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function isAdmin(phone: string): boolean {
  const adminPhone = process.env.ADMIN_PHONE;
  if (!adminPhone) return false;
  const normalize = (p: string) => p.replace(/\D/g, "").slice(-10);
  return normalize(phone) === normalize(adminPhone);
}
