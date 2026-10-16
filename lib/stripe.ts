const API = "https://api.stripe.com/v1";
const VERSION = "2026-07-29.dahlia";

type StripeErrorBody = { error?: { message?: string; code?: string } };

export class StripeApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "StripeApiError";
  }
}

export function stripeConfig() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  };
}

export async function stripeRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: URLSearchParams; idempotencyKey?: string } = {},
) {
  const { secretKey } = stripeConfig();
  if (!secretKey) throw new StripeApiError("A Stripe ainda não foi conectada ao ambiente da TIME.", 503, "stripe_not_configured");
  const headers = new Headers({ Authorization: `Bearer ${secretKey}`, "Stripe-Version": VERSION });
  if (options.body) headers.set("Content-Type", "application/x-www-form-urlencoded");
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
  const response = await fetch(`${API}${path}`, { method: options.method ?? "GET", headers, body: options.body });
  const payload = (await response.json()) as T & StripeErrorBody;
  if (!response.ok) throw new StripeApiError(payload.error?.message ?? "A Stripe recusou esta operação.", response.status, payload.error?.code);
  return payload;
}

function toHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function verifyStripeSignature(body: string, header: string, secret: string) {
  const parts = header.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || !signatures.length) return false;
  const time = Number(timestamp);
  if (!Number.isFinite(time) || Math.abs(Date.now() / 1000 - time) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = toHex(digest);
  return signatures.some((signature) => safeEqual(signature, expected));
}
