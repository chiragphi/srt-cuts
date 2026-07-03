import { SignJWT, jwtVerify } from "jose";

const TTL_SECONDS = 10 * 60; // 10 minutes — just long enough to finish set-password/login

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) throw new Error("AUTH_TOKEN_SECRET is missing.");
  return new TextEncoder().encode(secret);
}

/**
 * Proves the given phone number just passed phone/TOTP verification (or a
 * password check), so set-password / login-password can't be called cold.
 */
export async function issueVerifiedToken(phone: string): Promise<string> {
  return new SignJWT({ phone })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function readVerifiedToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.phone === "string" ? payload.phone : null;
  } catch {
    return null;
  }
}
