import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  normalizePhone,
  generateCode,
  generateTotpSecret,
  buildOtpAuthUrl,
  TOTP_ISSUER,
  OTP_TTL_MS,
} from "@/lib/sms-gateway";
import { smsBudgetExceeded, logSmsAttempt, type SmsKind } from "@/lib/sms-budget";

/**
 * SMS delivery.
 *
 * Default provider is Textbelt. For the temporary local-Mac bridge, set:
 *   SMS_PROVIDER=mac
 *
 * Mac mode uses the local Messages app through AppleScript, so the server
 * must run on the Mac that is signed in to Messages with SMS forwarding
 * enabled. It also starts caffeinate so the Mac stays awake while this Node
 * process is alive.
 */

// Warn well before credits actually run out (~a week of headroom at
// current volume) so there's time to top up.
export const LOW_QUOTA_THRESHOLD = 25;

export type VerificationResult =
  | { method: "sms"; channel: string; carrier: string; code: string; expiresAt: number }
  | { method: "totp"; reason: string; carrier: string | null; secret: string; otpAuthUrl: string };

export type NotificationResult =
  | { ok: true; channel: string; carrier: string }
  | { ok: false; reason: string };

interface TextbeltResponse {
  success: boolean;
  error?: string;
  textId?: string;
  quotaRemaining?: number;
}

type SmsProvider = "textbelt" | "mac";
type SendSmsResponse = TextbeltResponse & { carrier: SmsProvider };

const execFileAsync = promisify(execFile);

declare global {
  var __srtCaffeinateStarted: boolean | undefined;
}

export function getSmsProvider(): SmsProvider {
  return process.env.SMS_PROVIDER?.toLowerCase() === "mac" ? "mac" : "textbelt";
}

function keepMacAwake(): void {
  if (getSmsProvider() !== "mac") return;
  if (process.env.MAC_SMS_KEEP_AWAKE === "false") return;
  if (globalThis.__srtCaffeinateStarted) return;

  const child = execFile("caffeinate", ["-dimsu", "-w", String(process.pid)], (error) => {
    if (error) console.error(`Mac keep-awake stopped: ${error.message}`);
    globalThis.__srtCaffeinateStarted = false;
  });
  child.unref();
  globalThis.__srtCaffeinateStarted = true;
}

async function sendMacSms(phone: string, message: string): Promise<TextbeltResponse> {
  keepMacAwake();

  const script = `
on run argv
  set targetPhone to item 1 of argv
  set targetMessage to item 2 of argv
  tell application "Messages"
    set targetService to first service whose service type = iMessage
    set targetBuddy to buddy targetPhone of targetService
    send targetMessage to targetBuddy
  end tell
end run
`;

  try {
    await execFileAsync("osascript", ["-e", script, phone, message], { timeout: 20_000 });
    return { success: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Mac Messages send failed: ${reason}` };
  }
}

async function sendTextbelt(phone: string, message: string): Promise<TextbeltResponse> {
  const key = process.env.TEXTBELT_API_KEY;
  if (!key) {
    throw new Error("TEXTBELT_API_KEY is not configured.");
  }

  const res = await fetch("https://textbelt.com/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message, key }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Textbelt returned ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as TextbeltResponse;

  if (typeof data.quotaRemaining === "number" && data.quotaRemaining <= LOW_QUOTA_THRESHOLD) {
    console.error(
      `⚠️ Textbelt quota low: ${data.quotaRemaining} credits left — top up at https://textbelt.com/purchase before texts stop sending.`,
    );
  }

  return data;
}

/** Send one text through the configured provider. Throws on HTTP/network
 * errors; returns `success: false` when the provider rejects the send or the
 * app-wide send budget is exhausted. Every attempt is logged to sms_log. */
async function sendSms(
  phone: string,
  message: string,
  kind: SmsKind,
  opts?: { bypassBudget?: boolean },
): Promise<SendSmsResponse> {
  const provider = getSmsProvider();
  if (!opts?.bypassBudget) {
    const blocked = await smsBudgetExceeded();
    if (blocked) {
      console.error(`⚠️ SMS to ${phone} blocked: ${blocked}. Raise SMS_HOURLY_CAP/SMS_DAILY_CAP if this is legitimate volume.`);
      return { success: false, error: blocked, carrier: provider };
    }
  }
  await logSmsAttempt(phone, kind);

  const result = provider === "mac" ? await sendMacSms(phone, message) : await sendTextbelt(phone, message);
  return { ...result, carrier: provider };
}

/**
 * Send a verification code to a phone number.
 *
 * Texts the code via the configured provider; if the send fails for any
 * reason (bad key, out of quota, undeliverable number, network error) falls
 * back to a TOTP secret so an SMS outage can never lock users out of login.
 *
 * @param phone   the user's phone number
 * @param account stable user id (email/username) used to label a TOTP entry
 */
export async function requestPhoneVerification(
  phone: string,
  account: string,
): Promise<VerificationResult> {
  const number = normalizePhone(phone);
  if (number.length !== 10) {
    return totpFallback("Phone number is not a valid 10-digit US number.", account);
  }

  const code = generateCode();
  const message = `Your ${TOTP_ISSUER} verification code is ${code}. It expires in 10 minutes.`;

  let result: SendSmsResponse;
  try {
    // Over-budget sends return success:false and land in the TOTP fallback
    // below — login stays possible even mid-attack.
    result = await sendSms(number, message, "otp");
  } catch (error) {
    return totpFallback(
      `SMS send failed (${error instanceof Error ? error.message : String(error)}).`,
      account,
    );
  }
  if (!result.success) {
    return totpFallback(`SMS send failed (${result.error ?? "unknown SMS provider error"}).`, account);
  }

  return {
    method: "sms",
    channel: number,
    carrier: result.carrier,
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
  };
}

/**
 * Send a one-way text notification (booking confirmations, admin alerts).
 * Best-effort — no TOTP fallback. Callers should catch/log failures rather
 * than let them block the calling action.
 */
export async function sendGatewaySms(phone: string, message: string): Promise<NotificationResult> {
  const number = normalizePhone(phone);
  if (number.length !== 10) {
    return { ok: false, reason: "Not a valid 10-digit US number." };
  }

  let result: SendSmsResponse;
  try {
    result = await sendSms(number, message, "notify");
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
  if (!result.success) {
    return { ok: false, reason: result.error ?? "unknown SMS provider error" };
  }

  return { ok: true, channel: number, carrier: result.carrier };
}

/**
 * Fire-and-forget version of sendGatewaySms for booking notifications: never
 * throws, just logs. SMS is best-effort — a failed text should never block a
 * booking action.
 */
export async function notifyPhone(phone: string, message: string): Promise<void> {
  try {
    const result = await sendGatewaySms(phone, message);
    if (!result.ok) console.error(`Notification to ${phone} failed: ${result.reason}`);
  } catch (error) {
    console.error(`Notification to ${phone} failed:`, error instanceof Error ? error.message : error);
  }
}

/**
 * Security-alarm text to the admin (quota-drain alerts). Skips the send
 * budget on purpose: the alarm must fire precisely when everything else is
 * being blocked. Rate-limited by its caller (one alert per 6h), still logged.
 */
export async function sendAdminAlertSms(phone: string, message: string): Promise<NotificationResult> {
  const number = normalizePhone(phone);
  if (number.length !== 10) return { ok: false, reason: "Not a valid 10-digit US number." };
  try {
    const result = await sendSms(number, message, "notify", { bypassBudget: true });
    if (!result.success) return { ok: false, reason: result.error ?? "unknown SMS provider error" };
    return { ok: true, channel: number, carrier: result.carrier };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Read the remaining Textbelt credit balance. Free — consumes no credits.
 * Returns null when the key is missing or the check fails; callers should
 * treat that as "unknown", not zero.
 */
export async function getSmsQuota(): Promise<number | null> {
  if (getSmsProvider() !== "textbelt") return null;

  const key = process.env.TEXTBELT_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`https://textbelt.com/quota/${encodeURIComponent(key)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { success?: boolean; quotaRemaining?: number };
    return data.success && typeof data.quotaRemaining === "number" ? data.quotaRemaining : null;
  } catch {
    return null;
  }
}

/** Build a TOTP fallback result with a fresh secret. */
function totpFallback(reason: string, account: string): VerificationResult {
  const secret = generateTotpSecret();
  return {
    method: "totp",
    reason,
    carrier: null,
    secret,
    otpAuthUrl: buildOtpAuthUrl(secret, account),
  };
}
