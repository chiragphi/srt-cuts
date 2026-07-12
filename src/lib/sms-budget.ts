import { supabaseAdmin } from "@/lib/supabase";

/**
 * Global SMS send budget — the circuit breaker that guarantees credits can
 * never drain all at once through the app, no matter which endpoint is
 * abused. Every Textbelt attempt (OTP, booking texts, reminders) is logged
 * to sms_log and counted against hourly/daily caps before sending.
 *
 * This is the app-wide backstop; per-IP and per-phone limits on the OTP
 * endpoint (verify/start) catch targeted abuse before it gets here.
 *
 * If sms_log doesn't exist yet the budget fails OPEN with a loud log —
 * booking texts breaking would be worse than a window without the cap.
 * Run the sms_log block in supabase-schema.sql to arm it.
 */

function intEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// Generous for a one-chair shop (a fully booked day is ~60 texts including
// reminders); far below "drained in seconds". Override via env if it pinches.
export const SMS_HOURLY_CAP = intEnv("SMS_HOURLY_CAP", 25);
export const SMS_DAILY_CAP = intEnv("SMS_DAILY_CAP", 100);

export type SmsKind = "otp" | "notify";

async function sentSince(sinceMs: number): Promise<number | null> {
  const { count, error } = await supabaseAdmin
    .from("sms_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(sinceMs).toISOString());
  if (error) {
    console.error(`⚠️ SMS budget check unavailable (${error.message}) — sending without a cap. Run the sms_log migration in supabase-schema.sql.`);
    return null;
  }
  return count ?? 0;
}

/** Reason the send must be blocked, or null when within budget. */
export async function smsBudgetExceeded(): Promise<string | null> {
  const hour = await sentSince(Date.now() - 60 * 60 * 1000);
  if (hour === null) return null; // fail open: table missing / DB hiccup
  if (hour >= SMS_HOURLY_CAP)
    return `hourly SMS cap reached (${hour}/${SMS_HOURLY_CAP})`;

  const day = await sentSince(Date.now() - 24 * 60 * 60 * 1000);
  if (day !== null && day >= SMS_DAILY_CAP)
    return `daily SMS cap reached (${day}/${SMS_DAILY_CAP})`;

  return null;
}

/** Record a send attempt (called BEFORE the Textbelt request, so even a
 * crashed send counts — a retry storm can't slip under the cap). */
export async function logSmsAttempt(phone: string, kind: SmsKind): Promise<void> {
  const { error } = await supabaseAdmin.from("sms_log").insert({ phone, kind });
  if (error) console.error(`sms_log write failed (${error.message}) — send proceeds unlogged.`);
}

/** Texts attempted in the last 24h, for the admin System view. Null = unknown. */
export async function smsSentToday(): Promise<number | null> {
  return sentSince(Date.now() - 24 * 60 * 60 * 1000);
}
