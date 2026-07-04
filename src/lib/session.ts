import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";
import { getViewAsClaims, fetchUserById } from "./impersonation";

const COOKIE = "srt_session";
const EXPIRY_DAYS = 30;

export interface SessionUser {
  id: string;
  phone: string;
  name: string;
}

/**
 * The real signed-in user behind `srt_session`, ignoring any impersonation.
 * Use this whenever you need the true identity (admin gating, starting/stopping
 * impersonation) rather than the effective/impersonated one.
 */
export async function getRealSession(): Promise<SessionUser | null> {
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
  return (user as SessionUser) ?? null;
}

/**
 * The EFFECTIVE session used for reads across the app. Identical to the real
 * session, except: when the real session is an admin AND a valid `srt_view_as`
 * cookie is present, it resolves to the impersonated customer — so pages render
 * that customer's logged-in view. A non-admin session can never activate
 * impersonation. Admin routes gate on `isAdmin(user.phone)`, which is false for
 * the impersonated customer, so impersonation is automatically read-only-safe.
 */
export async function getSession(): Promise<SessionUser | null> {
  const real = await getRealSession();
  if (!real || !isAdmin(real.phone)) return real;

  const claims = await getViewAsClaims();
  if (!claims) return real;

  const impersonated = await fetchUserById(claims.sub);
  return impersonated ?? real;
}

export interface SessionContext {
  user: SessionUser | null; // effective (possibly impersonated)
  realUser: SessionUser | null; // true admin/user behind the cookie
  isImpersonating: boolean;
}

/** Full context for banners/guards: who you really are vs. who you're viewing as. */
export async function getSessionContext(): Promise<SessionContext> {
  const real = await getRealSession();
  if (!real || !isAdmin(real.phone)) {
    return { user: real, realUser: real, isImpersonating: false };
  }
  const claims = await getViewAsClaims();
  if (!claims) return { user: real, realUser: real, isImpersonating: false };
  const impersonated = await fetchUserById(claims.sub);
  if (!impersonated) return { user: real, realUser: real, isImpersonating: false };
  return { user: impersonated, realUser: real, isImpersonating: true };
}

/**
 * True when the current request is an admin viewing as a customer. Customer
 * mutation routes use this to stay read-only-safe during impersonation — the
 * admin can SEE the customer's world but not create/cancel bookings (which
 * would fire real SMS) on their behalf.
 */
export async function isImpersonating(): Promise<boolean> {
  return (await getSessionContext()).isImpersonating;
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
