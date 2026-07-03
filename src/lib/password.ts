import crypto from "node:crypto";

const KEY_LEN = 64;
const MIN_LENGTH = 8;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters.`;
  return null;
}

/** scrypt hash, stored as "salt:hash" (both hex). */
export function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LEN, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LEN, (err, derivedKey) => {
      if (err) return reject(err);
      const expected = Buffer.from(hash, "hex");
      if (expected.length !== derivedKey.length) return resolve(false);
      resolve(crypto.timingSafeEqual(expected, derivedKey));
    });
  });
}
