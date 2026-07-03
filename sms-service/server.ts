/**
 * Standalone phone-verification + notification microservice.
 *
 * Runs on the always-on Windows PC. Two jobs, both called by your site:
 *   POST /verify - look up the carrier and email a 6-digit code via the SMS
 *                  gateway, or return a TOTP secret when the carrier can't
 *                  be resolved (login / phone verification flow).
 *   POST /send   - best-effort one-way text notification (booking
 *                  confirmations, admin alerts). No TOTP fallback — there's
 *                  nothing to fall back to for a notification.
 *
 * Your site (on Vercel/Netlify/etc.) is the only thing that should call this.
 * It is exposed to the internet through a Cloudflare Tunnel, so it is locked
 * down two ways:
 *   1. A shared secret (SMS_SERVICE_TOKEN) required on every request.
 *   2. Per-number rate limiting, so a leaked token can't be used to blast
 *      texts at one number.
 *
 * Run it:  npm run sms-service   (uses tsx — no build step, reads .env.local)
 */

import http from "node:http";
import crypto from "node:crypto";
import dotenv from "dotenv";

// Loads .env.local — this runs standalone, not through Next.js's env loading.
// Everything below is inside main() because sms-gateway.ts reads process.env
// at module load time, so it must be imported (dynamically) after config()
// runs; tsx transpiles this file to CJS, which doesn't support top-level
// await, hence the wrapping async function instead of a bare await.
dotenv.config({ path: ".env.local" });

async function main() {
  const { verifyUserPhoneNumber, sendPhoneNotification, normalizePhone } = await import(
    "../src/lib/sms-gateway"
  );

  // --- Config (all from env; see .env.example) -------------------------------
  const PORT = Number(process.env.SMS_SERVICE_PORT ?? 8787);
  const TOKEN = process.env.SMS_SERVICE_TOKEN ?? "";

  // Refuse to start as an open relay. A missing token would let anyone who
  // finds the URL send texts, so this is a hard stop rather than a warning.
  if (!TOKEN || TOKEN.length < 16) {
    console.error(
      "FATAL: SMS_SERVICE_TOKEN is missing or too short. Set a long random secret " +
        "(e.g. `openssl rand -hex 32`) in your env before starting.",
    );
    process.exit(1);
  }

  // --- Rate limiting (in-memory; fine for a single instance) -----------------
  const MAX_PER_NUMBER_PER_MIN = 1;
  const MAX_PER_NUMBER_PER_DAY = 5;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const numberHits = new Map<string, number[]>(); // phone -> request timestamps

  function rateLimit(phone: string): { ok: boolean; reason?: string } {
    const now = Date.now();
    const recent = (numberHits.get(phone) ?? []).filter((t) => now - t < DAY_MS);
    const inLastMinute = recent.filter((t) => now - t < 60_000).length;
    if (inLastMinute >= MAX_PER_NUMBER_PER_MIN) {
      return { ok: false, reason: "Please wait a minute before requesting another code." };
    }
    if (recent.length >= MAX_PER_NUMBER_PER_DAY) {
      return { ok: false, reason: "Daily verification limit reached for this number." };
    }
    recent.push(now);
    numberHits.set(phone, recent);
    return { ok: true };
  }

  // --- Auth --------------------------------------------------------------------
  function authorized(req: http.IncomingMessage): boolean {
    const header = req.headers["authorization"] ?? "";
    const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
    // Length-guarded constant-time compare to avoid leaking the token via timing.
    if (provided.length !== TOKEN.length) return false;
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(TOKEN));
  }

  // --- Helpers -------------------------------------------------------------
  function json(res: http.ServerResponse, status: number, body: unknown): void {
    const payload = JSON.stringify(body);
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(payload);
  }

  function readBody(req: http.IncomingMessage, limitBytes = 4096): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
        if (data.length > limitBytes) reject(new Error("Request body too large"));
      });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });
  }

  // --- Server ----------------------------------------------------------------
  const server = http.createServer(async (req, res) => {
    // Unauthenticated health check so the tunnel / monitoring can ping it.
    if (req.method === "GET" && req.url === "/health") {
      return json(res, 200, { ok: true });
    }

    if (req.method !== "POST" || (req.url !== "/verify" && req.url !== "/send")) {
      return json(res, 404, { error: "Not found" });
    }

    if (!authorized(req)) {
      return json(res, 401, { error: "Unauthorized" });
    }

    if (req.url === "/verify") {
      // Parse the request: { phone: string, account?: string }
      let phone: string;
      let account: string;
      try {
        const body = JSON.parse(await readBody(req)) as { phone?: string; account?: string };
        if (!body.phone || typeof body.phone !== "string") {
          return json(res, 400, { error: "Missing 'phone'." });
        }
        phone = body.phone;
        account = typeof body.account === "string" && body.account ? body.account : phone;
      } catch {
        return json(res, 400, { error: "Invalid JSON body." });
      }

      const limit = rateLimit(normalizePhone(phone));
      if (!limit.ok) return json(res, 429, { error: limit.reason });

      // Never log the code/secret.
      try {
        const result = await verifyUserPhoneNumber(phone, account);
        console.log(
          `[verify] ${normalizePhone(phone)} -> ${result.method}` +
            (result.method === "sms" ? ` (${result.carrier})` : ` (${result.reason})`),
        );
        return json(res, 200, result);
      } catch (err) {
        console.error("[verify] unexpected error:", (err as Error).message);
        return json(res, 500, { error: "Verification failed. Try again." });
      }
    }

    // req.url === "/send" — best-effort notification, no fallback.
    let phone: string;
    let message: string;
    try {
      const body = JSON.parse(await readBody(req)) as { phone?: string; message?: string };
      if (!body.phone || typeof body.phone !== "string") {
        return json(res, 400, { error: "Missing 'phone'." });
      }
      if (!body.message || typeof body.message !== "string") {
        return json(res, 400, { error: "Missing 'message'." });
      }
      phone = body.phone;
      message = body.message;
    } catch {
      return json(res, 400, { error: "Invalid JSON body." });
    }

    const limit = rateLimit(normalizePhone(phone));
    if (!limit.ok) return json(res, 429, { error: limit.reason });

    try {
      const result = await sendPhoneNotification(phone, message);
      console.log(
        `[send] ${normalizePhone(phone)} -> ${result.ok ? `sent (${result.carrier})` : `failed (${result.reason})`}`,
      );
      return json(res, 200, result);
    } catch (err) {
      console.error("[send] unexpected error:", (err as Error).message);
      return json(res, 500, { error: "Send failed." });
    }
  });

  server.listen(PORT, () => {
    console.log(`SMS verification service listening on http://localhost:${PORT}`);
  });
}

main();
