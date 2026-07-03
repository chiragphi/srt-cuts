import crypto from "node:crypto";
import nodemailer from "nodemailer";

/**
 * Free SMS-over-email delivery + TOTP fallback for phone verification.
 *
 * Flow (see `verifyUserPhoneNumber`):
 *   1. Generate a 6-digit code.
 *   2. Look up the number's carrier via numlookupapi.com.
 *   3. Map the carrier to its email-to-SMS gateway and email the code there
 *      through Gmail SMTP (nodemailer).
 *   4. If the carrier is unknown / not a mobile line / has no gateway, fall
 *      back to a standard TOTP secret the user adds to Google Authenticator,
 *      Microsoft Authenticator, or the iPhone Passwords app.
 *
 * ⚠️ Honest production caveats — read before shipping:
 *   - Carrier email-to-SMS gateways are unreliable and actively being shut
 *     down. AT&T's `txt.att.net` was discontinued in 2025; others rate-limit
 *     or silently drop mail from consumer Gmail accounts. Treat SMS delivery
 *     as best-effort, and prefer the TOTP path for anything security-critical.
 *   - Gmail caps sending (~500 msgs/day) and may flag automated bursts.
 *   - Only send to numbers whose owner asked to receive the code (your own
 *     signups). Do not use this to message numbers that didn't opt in.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// 👉 PASTE YOUR FREE numlookupapi.com API KEY HERE (or set NUMLOOKUP_API_KEY).
//    Environment variable wins; the string below is a convenience fallback.
const NUMLOOKUP_API_KEY = process.env.NUMLOOKUP_API_KEY ?? "PASTE_YOUR_API_KEY_HERE";

// Gmail SMTP. Use a Gmail **App Password** (Google Account → Security →
// 2-Step Verification → App passwords), NOT your normal login password.
const GMAIL_USER = process.env.GMAIL_USER ?? "you@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? "PASTE_16_CHAR_APP_PASSWORD";

const OTP_TTL_MS = 10 * 60 * 1000; // codes are valid for 10 minutes
const TOTP_ISSUER = "SRT Cuts";

// ---------------------------------------------------------------------------
// Carrier → email-to-SMS gateway map
// ---------------------------------------------------------------------------
// numlookupapi returns a free-text `carrier` string (e.g. "Verizon Wireless",
// "AT&T Mobility", "T-Mobile USA, Inc."). We match on lowercase keywords so
// small naming variations still resolve. First match wins.
//
// This is NOT every US provider — there are hundreds of MVNOs. Most don't run
// their own gateway; they ride on Verizon / AT&T / T-Mobile, so we route them
// to the *host network's* domain (grouped below). Anything unmatched falls
// through to the TOTP path — that's intentional: a wrong gateway silently
// black-holes the code, an unmatched carrier still gets a working authenticator.
const CARRIER_GATEWAYS: { keywords: string[]; gateway: string }[] = [
  // --- Carriers with their own dedicated gateway ---
  { keywords: ["verizon"], gateway: "vtext.com" },
  { keywords: ["at&t", "att", "cingular"], gateway: "txt.att.net" },
  { keywords: ["t-mobile", "tmobile"], gateway: "tmomail.net" },
  { keywords: ["sprint"], gateway: "messaging.sprintpcs.com" }, // legacy; folded into T-Mobile
  { keywords: ["boost"], gateway: "sms.myboostmobile.com" },
  { keywords: ["cricket"], gateway: "sms.cricketwireless.net" },
  { keywords: ["metro"], gateway: "mymetropcs.com" },
  { keywords: ["us cellular", "uscellular"], gateway: "email.uscc.net" },
  { keywords: ["virgin"], gateway: "vmobl.com" },
  { keywords: ["google fi", "google-fi", "project fi"], gateway: "msg.fi.google.com" },
  { keywords: ["consumer cellular"], gateway: "mailmymobile.net" },
  { keywords: ["republic"], gateway: "text.republicwireless.com" },
  { keywords: ["simple mobile"], gateway: "smtext.com" },
  { keywords: ["ting"], gateway: "message.ting.com" },

  // --- MVNOs on the VERIZON network → vtext.com ---
  { keywords: ["visible"], gateway: "vtext.com" },
  { keywords: ["xfinity"], gateway: "vtext.com" },
  { keywords: ["spectrum"], gateway: "vtext.com" },
  { keywords: ["total wireless", "total by verizon"], gateway: "vtext.com" },
  { keywords: ["straight talk", "tracfone"], gateway: "vtext.com" },
  { keywords: ["page plus", "pageplus"], gateway: "vtext.com" },

  // --- MVNOs on the AT&T network → txt.att.net ---
  { keywords: ["h2o"], gateway: "txt.att.net" },
  { keywords: ["red pocket"], gateway: "txt.att.net" },

  // --- MVNOs on the T-MOBILE network → tmomail.net ---
  { keywords: ["mint"], gateway: "tmomail.net" },
  { keywords: ["ultra mobile", "ultra"], gateway: "tmomail.net" },
  { keywords: ["tello"], gateway: "tmomail.net" },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Normalize a US phone to 10 digits (strips +1, spaces, dashes, parens). */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

/** Cryptographically-random 6-digit code, zero-padded ("000000"–"999999"). */
export function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// ---------------------------------------------------------------------------
// Carrier lookup
// ---------------------------------------------------------------------------

export interface CarrierInfo {
  carrier: string | null; // raw carrier name from the API, if any
  lineType: string | null; // "mobile", "landline", etc.
  valid: boolean;
}

/**
 * Look up a phone number's carrier via numlookupapi.com.
 * Docs: GET https://api.numlookupapi.com/v1/validate/{number}?apikey=KEY
 * Throws on network / auth errors so the caller can decide how to degrade.
 */
export async function lookupCarrier(phone: string): Promise<CarrierInfo> {
  if (!NUMLOOKUP_API_KEY || NUMLOOKUP_API_KEY === "PASTE_YOUR_API_KEY_HERE") {
    throw new Error("numlookupapi key is not configured (set NUMLOOKUP_API_KEY).");
  }

  const number = normalizePhone(phone);
  const url =
    `https://api.numlookupapi.com/v1/validate/${encodeURIComponent(number)}` +
    `?country_code=US&apikey=${encodeURIComponent(NUMLOOKUP_API_KEY)}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`numlookupapi request failed: ${res.status} ${res.statusText}`);
  }

  // Parse the JSON response and pull out the fields we care about.
  const data = (await res.json()) as {
    valid?: boolean;
    carrier?: string;
    line_type?: string;
  };

  return {
    valid: Boolean(data.valid),
    carrier: data.carrier?.trim() || null,
    lineType: data.line_type?.trim().toLowerCase() || null,
  };
}

/**
 * Map a raw carrier string to its email-to-SMS gateway domain.
 * Returns null when nothing matches (→ triggers the TOTP fallback).
 */
export function resolveGateway(carrier: string | null): string | null {
  if (!carrier) return null;
  const name = carrier.toLowerCase();
  for (const entry of CARRIER_GATEWAYS) {
    if (entry.keywords.some((kw) => name.includes(kw))) {
      return entry.gateway;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Email → SMS delivery (nodemailer + Gmail SMTP)
// ---------------------------------------------------------------------------

let cachedTransport: nodemailer.Transporter | null = null;

/** Reuse a single Gmail SMTP transport across calls. */
function getTransport(): nodemailer.Transporter {
  if (cachedTransport) return cachedTransport;
  if (!GMAIL_USER || GMAIL_APP_PASSWORD.startsWith("PASTE_")) {
    throw new Error("Gmail SMTP is not configured (set GMAIL_USER / GMAIL_APP_PASSWORD).");
  }
  cachedTransport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
  return cachedTransport;
}

export type NotificationResult =
  | { ok: true; channel: string; carrier: string }
  | { ok: false; reason: string };

/**
 * Best-effort text notification (booking confirmations, admin alerts, etc.)
 * with no TOTP fallback — there's nothing to fall back to for a one-way
 * notification. Callers should never let this block the surrounding action;
 * just log the failure.
 */
export async function sendPhoneNotification(phone: string, message: string): Promise<NotificationResult> {
  const number = normalizePhone(phone);
  if (number.length !== 10) return { ok: false, reason: "Not a valid 10-digit US number." };

  let info: CarrierInfo;
  try {
    info = await lookupCarrier(number);
  } catch (err) {
    return { ok: false, reason: `Carrier lookup failed: ${(err as Error).message}` };
  }

  const gateway = resolveGateway(info.carrier);
  if (!gateway) {
    return { ok: false, reason: `No gateway for carrier "${info.carrier ?? "unknown"}".` };
  }

  try {
    await sendViaGateway(number, gateway, message);
  } catch (err) {
    return { ok: false, reason: `Gateway send failed: ${(err as Error).message}` };
  }

  return { ok: true, channel: `${number}@${gateway}`, carrier: info.carrier ?? "unknown" };
}

/** Send `text` to `10-digit-number@gateway`. */
export async function sendViaGateway(number: string, gateway: string, text: string): Promise<void> {
  const to = `${number}@${gateway}`;
  await getTransport().sendMail({
    from: GMAIL_USER,
    to,
    // Gateways turn the *body* into the SMS; keep the subject empty/short so
    // it doesn't get prepended to the message on some carriers.
    subject: "",
    text,
  });
}

// ---------------------------------------------------------------------------
// TOTP fallback (RFC 6238) — no external dependency, uses node:crypto.
// Compatible with Google Authenticator, Microsoft Authenticator, and the
// iPhone Passwords app (all speak standard otpauth:// TOTP).
// ---------------------------------------------------------------------------

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function toBase32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function fromBase32(str: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of str.replace(/=+$/, "").toUpperCase()) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Generate a new base32 TOTP secret (160-bit, the RFC-recommended size). */
export function generateTotpSecret(): string {
  return toBase32(crypto.randomBytes(20));
}

/**
 * Build the otpauth:// URI to hand the user (render it as a QR code, or let
 * them tap-to-copy the secret into their authenticator app).
 */
export function buildOtpAuthUrl(secret: string, account: string): string {
  const label = encodeURIComponent(`${TOTP_ISSUER}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer: TOTP_ISSUER,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Compute the 6-digit TOTP for a given secret at a given time step. */
function totpAt(secret: string, counter: number): string {
  const key = fromBase32(secret);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return (bin % 1_000_000).toString().padStart(6, "0");
}

/**
 * Verify a user-entered TOTP code against a secret. Accepts the current
 * 30-second window plus one step on either side to tolerate clock skew.
 */
export function verifyTotp(secret: string, token: string): boolean {
  const step = Math.floor(Date.now() / 1000 / 30);
  const clean = token.replace(/\D/g, "");
  for (let w = -1; w <= 1; w++) {
    // Constant-time compare to avoid leaking timing information.
    const expected = totpAt(secret, step + w);
    if (expected.length === clean.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// The one function that ties it all together
// ---------------------------------------------------------------------------

export type VerificationResult =
  | {
      method: "sms";
      channel: string; // e.g. "5551234567@vtext.com"
      carrier: string;
      code: string; // ⚠️ store this server-side (hashed); never send to the client
      expiresAt: number; // epoch ms
    }
  | {
      method: "totp";
      reason: string; // why we fell back
      carrier: string | null;
      secret: string; // ⚠️ store server-side, tied to the user
      otpAuthUrl: string; // show as QR / copyable secret
    };

/**
 * Verify a user's phone number end-to-end.
 *
 * @param phone   the user's phone number (any format; US assumed)
 * @param account a stable identifier for the user (email/username) — used to
 *                label the TOTP entry if we fall back.
 *
 * Returns either an "sms" result (code was texted; persist it and prompt the
 * user to type it back) or a "totp" result (carrier unknown → give them an
 * authenticator secret instead). Both paths are verified the same way from
 * your side: compare the entered code, or call `verifyTotp`.
 */
export async function verifyUserPhoneNumber(
  phone: string,
  account: string,
): Promise<VerificationResult> {
  const number = normalizePhone(phone);
  if (number.length !== 10) {
    // Can't route a bad number by SMS — go straight to the app-based path.
    return totpFallback("Phone number is not a valid 10-digit US number.", null, account);
  }

  // 1. Look up the carrier. Any failure here degrades to TOTP rather than
  //    leaving the user stuck.
  let info: CarrierInfo;
  try {
    info = await lookupCarrier(number);
  } catch (err) {
    return totpFallback(
      `Carrier lookup failed (${(err as Error).message}).`,
      null,
      account,
    );
  }

  // 2. Only mobile lines can receive SMS; landlines/VoIP go to TOTP.
  if (info.lineType && info.lineType !== "mobile") {
    return totpFallback(`Line type is "${info.lineType}", not mobile.`, info.carrier, account);
  }

  // 3. Map the carrier to a gateway. Unknown carrier → TOTP.
  const gateway = resolveGateway(info.carrier);
  if (!gateway) {
    return totpFallback(
      info.carrier
        ? `No email-to-SMS gateway known for carrier "${info.carrier}".`
        : "Carrier could not be determined.",
      info.carrier,
      account,
    );
  }

  // 4. Send the code via the gateway. If the email send itself throws, fall
  //    back so the user still has a path to verify.
  const code = generateCode();
  const message = `Your ${TOTP_ISSUER} verification code is ${code}. It expires in 10 minutes.`;
  try {
    await sendViaGateway(number, gateway, message);
  } catch (err) {
    return totpFallback(
      `Gateway send failed (${(err as Error).message}).`,
      info.carrier,
      account,
    );
  }

  return {
    method: "sms",
    channel: `${number}@${gateway}`,
    carrier: info.carrier ?? "unknown",
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
  };
}

/** Build a TOTP fallback result with a fresh secret. */
function totpFallback(reason: string, carrier: string | null, account: string): VerificationResult {
  const secret = generateTotpSecret();
  return {
    method: "totp",
    reason,
    carrier,
    secret,
    otpAuthUrl: buildOtpAuthUrl(secret, account),
  };
}
