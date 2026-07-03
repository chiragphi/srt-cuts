import {
  normalizePhone,
  generateCode,
  generateTotpSecret,
  buildOtpAuthUrl,
  TOTP_ISSUER,
  OTP_TTL_MS,
} from "@/lib/sms-gateway";

/**
 * SMS delivery via the Textbelt API (https://textbelt.com).
 *
 * Textbelt takes a phone number + message over plain HTTPS — no carrier
 * lookup, no number provisioning, no 10DLC registration. Credits are
 * prepaid (~US$0.01/text); when they run out sends fail with
 * "Out of quota", verification degrades to TOTP, and we log loudly.
 *
 * Needs one env var: TEXTBELT_API_KEY.
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

/** Send one text through Textbelt. Throws on HTTP/network errors; returns
 * `success: false` (with `error`) when Textbelt rejects the send. */
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

/**
 * Send a verification code to a phone number.
 *
 * Texts the code via Textbelt; if the send fails for any reason (bad key,
 * out of quota, undeliverable number, network error) falls back to a TOTP
 * secret so an SMS outage can never lock users out of login.
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

  let result: TextbeltResponse;
  try {
    result = await sendTextbelt(number, message);
  } catch (error) {
    return totpFallback(
      `SMS send failed (${error instanceof Error ? error.message : String(error)}).`,
      account,
    );
  }
  if (!result.success) {
    return totpFallback(`SMS send failed (${result.error ?? "unknown Textbelt error"}).`, account);
  }

  return {
    method: "sms",
    channel: number,
    carrier: "textbelt",
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

  let result: TextbeltResponse;
  try {
    result = await sendTextbelt(number, message);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
  if (!result.success) {
    return { ok: false, reason: result.error ?? "unknown Textbelt error" };
  }

  return { ok: true, channel: number, carrier: "textbelt" };
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
 * Read the remaining Textbelt credit balance. Free — consumes no credits.
 * Returns null when the key is missing or the check fails; callers should
 * treat that as "unknown", not zero.
 */
export async function getSmsQuota(): Promise<number | null> {
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
