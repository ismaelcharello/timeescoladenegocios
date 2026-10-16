import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { checkoutOrders, memberAgreements, members, offers } from "@/db/schema";
import { getAuthenticatedIdentity } from "@/lib/auth";
import { CHECKOUT_DOCUMENT_TYPES, CURRENT_LEGAL_DOCUMENTS } from "@/lib/legal-documents";
import { StripeApiError, stripeConfig, stripeRequest } from "@/lib/stripe";

type Session = { id: string; client_secret: string | null; amount_total: number | null; currency: string | null; status: "open" | "complete" | "expired" };
const checkoutSchema = z.object({
  offerId: z.coerce.number().int().positive(),
  fullName: z.string().trim().min(3).max(160),
  phone: z.string().trim().max(40).optional().default(""),
});

function origin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return host ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const identity = await getAuthenticatedIdentity(request);
    if (!identity) return Response.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
    const { offerId, fullName, phone } = checkoutSchema.parse(await request.json());
    const email = identity.email;
    const { publishableKey } = stripeConfig();
    if (!publishableKey) throw new StripeApiError("A chave pública da Stripe ainda não foi conectada.", 503);
    const db = getDb();
    const accepted = await db.select({ documentType: memberAgreements.documentType, documentVersion: memberAgreements.documentVersion })
      .from(memberAgreements).where(and(eq(memberAgreements.memberAuthUserId, identity.id), inArray(memberAgreements.documentType, CHECKOUT_DOCUMENT_TYPES)));
    const missingAgreement = CHECKOUT_DOCUMENT_TYPES.some((type) => !accepted.some((row) => row.documentType === type && row.documentVersion === CURRENT_LEGAL_DOCUMENTS[type].version));
    if (missingAgreement) return Response.json({ error: "Aceite os Termos de Uso e a Política de Privacidade para continuar." }, { status: 400 });
    const [existingMember] = await db.select().from(members).where(eq(members.email, email)).limit(1);
    if (existingMember?.authUserId && existingMember.authUserId !== identity.id) return Response.json({ error: "Esta conta já está vinculada a outro acesso TIME." }, { status: 409 });
    const [offer] = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
    if (!offer?.active) return Response.json({ error: "Esta oferta não está disponível." }, { status: 404 });

    const mode = offer.billingType === "subscription" ? "subscription" : "payment";
    const form = new URLSearchParams();
    form.set("mode", mode);
    form.set("ui_mode", "elements");
    form.set("return_url", `${origin(request)}/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}`);
    form.set("customer_email", email);
    form.set("allow_promotion_codes", "true");
    form.set("billing_address_collection", "auto");
    form.set("phone_number_collection[enabled]", "true");
    form.set("line_items[0][quantity]", "1");
    form.set("metadata[time_offer_id]", String(offer.id));
    form.set("metadata[time_member_email]", email);
    form.set("metadata[time_member_auth_user_id]", identity.id);
    form.set("metadata[time_member_name]", fullName);
    form.set("metadata[time_member_phone]", phone);
    if (offer.stripePriceId) {
      form.set("line_items[0][price]", offer.stripePriceId);
    } else {
      form.set("line_items[0][price_data][currency]", offer.currency);
      form.set("line_items[0][price_data][unit_amount]", String(offer.amountCents));
      form.set("line_items[0][price_data][product_data][name]", offer.name);
      form.set("line_items[0][price_data][product_data][description]", offer.description || "Acesso à plataforma TIME Escola de Negócios");
      if (mode === "subscription") {
        form.set("line_items[0][price_data][recurring][interval]", offer.billingInterval ?? "month");
        form.set("line_items[0][price_data][recurring][interval_count]", String(offer.intervalCount));
      }
    }
    if (mode === "subscription") {
      form.set("subscription_data[metadata][time_offer_id]", String(offer.id));
      form.set("subscription_data[metadata][time_member_email]", email);
      form.set("subscription_data[metadata][time_member_auth_user_id]", identity.id);
      form.set("subscription_data[metadata][time_access_key]", offer.accessKey);
      if (offer.trialDays > 0) form.set("subscription_data[trial_period_days]", String(offer.trialDays));
    } else {
      form.set("customer_creation", "always");
      form.set("payment_intent_data[metadata][time_offer_id]", String(offer.id));
      form.set("payment_intent_data[metadata][time_member_email]", email);
    }
    const session = await stripeRequest<Session>("/checkout/sessions", {
      method: "POST", body: form, idempotencyKey: `time-checkout-${crypto.randomUUID()}`,
    });
    if (!session.client_secret) throw new StripeApiError("A Stripe não retornou uma sessão válida.", 502);
    const now = new Date().toISOString();
    await db.insert(members).values({ email, fullName, phone, authUserId: identity.id, accessStatus: "pending", updatedAt: now })
      .onConflictDoUpdate({ target: members.email, set: { fullName, phone, authUserId: identity.id, updatedAt: now } });
    await db.insert(checkoutOrders).values({
      stripeSessionId: session.id, memberEmail: email, memberAuthUserId: identity.id, memberName: fullName, memberPhone: phone,
      offerId: offer.id, amountTotal: session.amount_total ?? offer.amountCents,
      currency: session.currency ?? offer.currency, status: session.status === "complete" ? "complete" : "open",
      updatedAt: now,
    });
    return Response.json({ clientSecret: session.client_secret, publishableKey, sessionId: session.id });
  } catch (error) {
    console.error("billing:checkout-session", error);
    return Response.json(
      { error: error instanceof StripeApiError ? error.message : error instanceof z.ZodError ? "Revise seus dados antes de continuar." : "Não foi possível iniciar o pagamento agora." },
      { status: error instanceof StripeApiError ? error.status : error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
