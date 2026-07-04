import { NextRequest, NextResponse } from "next/server";
import { getRealSession, getSessionContext, isAdmin } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import {
  signViewAs,
  viewAsCookie,
  clearViewAsCookie,
  fetchUserById,
  logImpersonation,
} from "@/lib/impersonation";

function normalize(p: string) {
  return p.replace(/\D/g, "").slice(-10);
}

async function resolveTarget(userId?: string, phone?: string) {
  if (userId) return fetchUserById(userId);
  if (phone) {
    const norm = normalize(phone);
    // One-chair barber: the users table is tiny, so match on normalized phone.
    const { data } = await supabaseAdmin.from("users").select("id, phone, name");
    const match = (data ?? []).find((u) => normalize(u.phone) === norm);
    return match ? { id: match.id, phone: match.phone, name: match.name } : null;
  }
  return null;
}

// Start impersonation. Admin-only, verified against the REAL session so an
// already-impersonated request can never escalate.
export async function POST(req: NextRequest) {
  const real = await getRealSession();
  if (!real || !isAdmin(real.phone)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { userId?: string; phone?: string };
  const target = await resolveTarget(body.userId, body.phone);
  if (!target) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Never let an admin impersonate another admin (or themselves into a loop).
  if (isAdmin(target.phone)) {
    return NextResponse.json({ error: "Cannot view as an admin account" }, { status: 400 });
  }

  const token = await signViewAs(target.id, real.id);
  await logImpersonation(real.id, target.id, "start");

  return NextResponse.json(
    { ok: true, user: { id: target.id, name: target.name, phone: target.phone } },
    { headers: { "Set-Cookie": viewAsCookie(token) } }
  );
}

// Stop impersonation. Clearing the view-as cookie is always safe, so this needs
// no admin check — it only ever removes an elevated view.
export async function DELETE() {
  const ctx = await getSessionContext();
  if (ctx.isImpersonating && ctx.realUser && ctx.user) {
    await logImpersonation(ctx.realUser.id, ctx.user.id, "stop");
  }
  return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": clearViewAsCookie() } });
}

// Current impersonation state for the persistent banner.
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx.isImpersonating || !ctx.user || !ctx.realUser) {
    return NextResponse.json({ active: false });
  }
  return NextResponse.json({
    active: true,
    user: { id: ctx.user.id, name: ctx.user.name, phone: ctx.user.phone },
    admin: { id: ctx.realUser.id, name: ctx.realUser.name },
  });
}
