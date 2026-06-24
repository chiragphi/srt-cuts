import { NextRequest, NextResponse } from "next/server";
import { runCleanup } from "@/lib/maintenance";

/**
 * Monthly storage cleanup, invoked by Vercel Cron (see vercel.json).
 *
 * If CRON_SECRET is set, Vercel sends it as a Bearer token and we require it.
 * The job only deletes expired/used auth rows (no customer data), so a missing
 * secret degrades safely rather than exposing anything destructive.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const removed = await runCleanup();
  return NextResponse.json({ ok: true, ...removed });
}
