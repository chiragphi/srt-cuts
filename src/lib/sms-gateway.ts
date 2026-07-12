import crypto from "node:crypto";

/**
 * Phone-verification primitives: code generation + TOTP fallback.
 *
 * SMS delivery itself lives in `sms-client.ts`. This module
 * keeps the delivery-agnostic pieces: 6-digit code generation and an
 * RFC 6238 TOTP implementation used when SMS can't be delivered.
 *
 * (The old email-to-SMS carrier-gateway machinery that used to live here was
 * removed when carriers shut those gateways down.)
 */

export const OTP_TTL_MS = 10 * 60 * 1000; // codes are valid for 10 minutes
export const TOTP_ISSUER = "SRT Cuts";

/** Normalize a US phone to 10 digits (strips +1, spaces, dashes, parens). */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

/** Cryptographically-random 6-digit code, zero-padded ("000000"–"999999"). */
export function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
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
