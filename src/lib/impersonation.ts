// "View as customer" impersonation — cookie-based, no schema change required.
// A short-TTL JWT (signed with AUTH_TOKEN_SECRET) rides in a SEPARATE cookie
// from the real session. It is only ever honored when the REAL session belongs
// to an admin (enforced in session.ts). Enforcement lives entirely in our
// session layer — the app talks to Supabase through the service role, so this
// is never Postgres RLS.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";

export const VIEW_AS_COOKIE = "srt_view_as";
const TTL_SECONDS = 60 * 60; // 1 hour — long enough for a support session, short enough to be safe

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) throw new Error("AUTH_TOKEN_SECRET is missing.");
  return new TextEncoder().encode(secret);
}

export interface ViewAsClaims {
  sub: string; // impersonated user id
  adminId: string; // real admin user id (audit trail)
}

export async function signViewAs(userId: string, adminId: string): Promise<string> {
  return new SignJWT({ sub: userId, adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function readViewAs(token: string): Promise<ViewAsClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub === "string" && typeof payload.adminId === "string") {
      return { sub: payload.sub, adminId: payload.adminId };
    }
    return null;
  } catch {
    return null;
  }
}

/** Reads the raw view-as claims from the request cookie (does NOT verify admin). */
export async function getViewAsClaims(): Promise<ViewAsClaims | null> {
  const store = await cookies();
  const token = store.get(VIEW_AS_COOKIE)?.value;
  if (!token) return null;
  return readViewAs(token);
}

export interface BasicUser {
  id: string;
  phone: string;
  name: string;
}

export async function fetchUserById(id: string): Promise<BasicUser | null> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id, phone, name")
    .eq("id", id)
    .single();
  return (data as BasicUser) ?? null;
}

export function viewAsCookie(token: string): string {
  return `${VIEW_AS_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_SECONDS}`;
}
export function clearViewAsCookie(): string {
  return `${VIEW_AS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/** Best-effort audit log; silently no-ops if the optional table is absent. */
export async function logImpersonation(adminId: string, targetUserId: string, action: "start" | "stop") {
  try {
    await supabaseAdmin.from("impersonation_log").insert({
      admin_id: adminId,
      target_user_id: targetUserId,
      action,
    });
  } catch {
    // Optional table (see supabase-schema.sql). Never block on it.
  }
}
