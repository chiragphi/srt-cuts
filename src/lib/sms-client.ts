/**
 * Client for the standalone verification service running on the Windows PC.
 * Your site (this Next app) calls this instead of doing the SMS work itself.
 *
 * Needs two env vars on the SITE side:
 *   SMS_SERVICE_URL   - the Cloudflare Tunnel URL of the Windows PC service
 *   SMS_SERVICE_TOKEN - the same shared secret the service checks
 */

// Mirror of the service's return shape (see sms-service/server.ts).
export type VerificationResult =
  | { method: "sms"; channel: string; carrier: string; code: string; expiresAt: number }
  | { method: "totp"; reason: string; carrier: string | null; secret: string; otpAuthUrl: string };

export type NotificationResult =
  | { ok: true; channel: string; carrier: string }
  | { ok: false; reason: string };

async function callService<T>(path: string, body: Record<string, string>): Promise<T> {
  const url = process.env.SMS_SERVICE_URL;
  const token = process.env.SMS_SERVICE_TOKEN;
  if (!url || !token) {
    throw new Error("SMS_SERVICE_URL / SMS_SERVICE_TOKEN are not configured.");
  }

  const res = await fetch(`${url.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    // Don't hang the caller forever if the home PC is unreachable.
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({ error: res.statusText }))) as {
      error?: string;
    };
    throw new Error(error || `SMS service returned ${res.status}`);
  }

  return (await res.json()) as T;
}

/**
 * Ask the Windows PC to verify a phone number.
 * @param phone   the user's phone number
 * @param account stable user id (email/username) used to label a TOTP entry
 */
export function requestPhoneVerification(phone: string, account: string): Promise<VerificationResult> {
  return callService<VerificationResult>("/verify", { phone, account });
}

/**
 * Ask the Windows PC to send a one-way text notification (booking
 * confirmations, admin alerts). Best-effort — no TOTP fallback. Callers
 * should catch/log failures rather than let them block the calling action.
 */
export function sendGatewaySms(phone: string, message: string): Promise<NotificationResult> {
  return callService<NotificationResult>("/send", { phone, message });
}

/**
 * Fire-and-forget version of sendGatewaySms for booking notifications: never
 * throws, just logs. The gateway/verification service is best-effort — a
 * failed text should never block a booking action.
 */
export async function notifyPhone(phone: string, message: string): Promise<void> {
  try {
    const result = await sendGatewaySms(phone, message);
    if (!result.ok) console.error(`Notification to ${phone} failed: ${result.reason}`);
  } catch (error) {
    console.error(`Notification to ${phone} failed:`, error instanceof Error ? error.message : error);
  }
}
