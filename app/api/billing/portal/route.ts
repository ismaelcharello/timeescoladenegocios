import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { getAuthenticatedIdentity } from "@/lib/auth";
import { StripeApiError, stripeRequest } from "@/lib/stripe";

function origin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return host ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request) {
  const identity = await getAuthenticatedIdentity(request);
  if (!identity) return Response.json({ error: "Entre na sua conta para gerenciar a assinatura." }, { status: 401 });
  try {
    const [member] = await getDb().select().from(members).where(eq(members.email, identity.email)).limit(1);
    if (member?.authUserId !== identity.id) return Response.json({ error: "Não foi possível validar a titularidade desta assinatura." }, { status: 403 });
    if (!member?.stripeCustomerId) return Response.json({ error: "Nenhuma assinatura Stripe foi encontrada para esta conta." }, { status: 404 });
    const portal = await stripeRequest<{ url: string }>("/billing_portal/sessions", {
      method: "POST", body: new URLSearchParams({ customer: member.stripeCustomerId, return_url: `${origin(request)}/app` }),
    });
    return Response.json({ url: portal.url });
  } catch (error) {
    return Response.json(
      { error: error instanceof StripeApiError ? error.message : "Não foi possível abrir a gestão da assinatura." },
      { status: error instanceof StripeApiError ? error.status : 500 },
    );
  }
}
