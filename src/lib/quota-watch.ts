import { supabaseAdmin } from "@/lib/supabase";
import { getSmsProvider, getSmsQuota, sendAdminAlertSms } from "@/lib/sms-client";

/**
 * Credit-drain tripwire, run on every reminder-cron tick (~5 min).
 *
 * Textbelt offers no key security at all — no IP locks, spend limits, or
 * alerts — so this watches the balance from our side. It remembers the last
 * reading (a `quota_watch` row in site_content, invisible to the admin UI
 * which only reads id "main") and texts the admin when either:
 *   - the balance fell faster than the app could legitimately send between
 *     two ticks (an external drain like the 2026-07-12 incident), or
 *   - the balance crossed the low-water mark.
 *
 * The alert bypasses the send budget (it must fire when sends are being
 * blocked) and fires at most once per 6 hours.
 */

// The app can send at most a handful of texts per 5-minute tick; a bigger
// drop means someone is using the key directly.
const DRAIN_DROP = 20;
const LOW_WATER = 25;
const ALERT_GAP_MS = 6 * 60 * 60 * 1000;

interface WatchState {
  lastQuota?: number;
  lastAlertAt?: string | null;
}

export async function watchQuota(): Promise<{ quota: number | null; alerted: boolean }> {
  if (getSmsProvider() !== "textbelt") return { quota: null, alerted: false };

  const quota = await getSmsQuota();
  if (quota === null) return { quota, alerted: false }; // key missing or Textbelt down

  const { data } = await supabaseAdmin
    .from("site_content")
    .select("content")
    .eq("id", "quota_watch")
    .maybeSingle();
  const prev = (data?.content ?? {}) as WatchState;

  const drop = typeof prev.lastQuota === "number" ? prev.lastQuota - quota : 0;
  const crossedLowWater = quota <= LOW_WATER && (prev.lastQuota ?? Infinity) > LOW_WATER;
  const lastAlertMs = prev.lastAlertAt ? Date.parse(prev.lastAlertAt) : 0;
  const alertable = Date.now() - lastAlertMs > ALERT_GAP_MS;

  let alerted = false;
  const adminPhone = process.env.ADMIN_PHONE?.trim();
  // quota <= 0 → the alarm text itself can't send; don't burn a failed
  // attempt every tick, just keep recording readings.
  if (adminPhone && alertable && quota > 0 && (drop >= DRAIN_DROP || crossedLowWater)) {
    const message =
      drop >= DRAIN_DROP
        ? `⚠️ SRT alarm: Textbelt credits dropped ${prev.lastQuota} -> ${quota} in the last few minutes. If this wasn't you, the key is compromised: email Textbelt support and rotate the key NOW.`
        : `SRT heads up: Textbelt credits are low (${quota} left). Top up soon or texts will stop sending.`;
    const result = await sendAdminAlertSms(adminPhone, message);
    alerted = result.ok;
    if (!result.ok) console.error(`Quota alarm text failed: ${result.reason}`);
  }

  await supabaseAdmin.from("site_content").upsert({
    id: "quota_watch",
    content: {
      lastQuota: quota,
      lastAlertAt: alerted ? new Date().toISOString() : prev.lastAlertAt ?? null,
    } satisfies WatchState,
    updated_at: new Date().toISOString(),
  });

  return { quota, alerted };
}
