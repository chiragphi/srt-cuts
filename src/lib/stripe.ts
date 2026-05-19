import { createHmac, timingSafeEqual } from "crypto";

const STRIPE_API = "https://api.stripe.com/v1";

function getSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return key;
}

async function stripeRequest<T>(path: string, body: URLSearchParams) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Stripe request failed");
  return data as T;
}

async function stripeGet<T>(path: string) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Stripe request failed");
  return data as T;
}

export interface StripeProduct {
  id: string;
}

export interface StripePrice {
  id: string;
  unit_amount: number;
  product: string;
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
}

export async function createStripeProduct(name: string) {
  const body = new URLSearchParams();
  body.set("name", name);
  body.set("metadata[source]", "srt-cuts");
  return stripeRequest<StripeProduct>("/products", body);
}

export async function updateStripeProduct(productId: string, name: string) {
  const body = new URLSearchParams();
  body.set("name", name);
  return stripeRequest<StripeProduct>(`/products/${productId}`, body);
}

export async function createStripePrice(productId: string, amount: number, lookupKey: string) {
  const body = new URLSearchParams();
  body.set("product", productId);
  body.set("currency", "usd");
  body.set("unit_amount", String(amount));
  body.set("lookup_key", lookupKey);
  body.set("transfer_lookup_key", "true");
  return stripeRequest<StripePrice>("/prices", body);
}

export async function archiveStripePrice(priceId: string) {
  const body = new URLSearchParams();
  body.set("active", "false");
  return stripeRequest<StripePrice>(`/prices/${priceId}`, body);
}

export async function getStripePrice(priceId: string) {
  return stripeGet<StripePrice>(`/prices/${priceId}`);
}

export async function createCheckoutSession(params: {
  priceId: string;
  bookingId: string;
  successUrl: string;
  cancelUrl: string;
  customerName: string;
  customerPhone: string;
}) {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("line_items[0][price]", params.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("client_reference_id", params.bookingId);
  body.set("success_url", params.successUrl);
  body.set("cancel_url", params.cancelUrl);
  body.set("metadata[booking_id]", params.bookingId);
  body.set("payment_intent_data[metadata][booking_id]", params.bookingId);
  body.set("customer_creation", "if_required");
  body.set("metadata[customer_name]", params.customerName);
  body.set("metadata[customer_phone]", params.customerPhone);
  return stripeRequest<StripeCheckoutSession>("/checkout/sessions", body);
}

export function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}
