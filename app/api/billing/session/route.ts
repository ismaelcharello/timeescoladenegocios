import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { checkoutOrders } from "@/db/schema";
import { getAuthenticatedIdentity } from "@/lib/auth";
import { StripeApiError, stripeRequest } from "@/lib/stripe";

type Session = {
  id: string; status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  customer: string | null; subscription: string | null; amount_total: number | null;
  currency: string | null; customer_details: { email: string | null; name: string | null } | null;
};

export async function GET(request: Request) {
  const identity = await getAuthenticatedIdentity(request);
  if (!identity) return Response.json({ error: "Entre na sua conta para consultar este pagamento." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return Response.json({ error: "Sessão inválida." }, { status: 400 });
  try {
    const db = getDb();
    const [order] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.stripeSessionId, id)).limit(1);
    if (!order || order.memberAuthUserId !== identity.id) return Response.json({ error: "Pagamento não encontrado para esta conta." }, { status: 404 });
    const session = await stripeRequest<Session>(`/checkout/sessions/${encodeURIComponent(id)}`);
    const status = session.status === "complete" ? "complete" : session.status === "expired" ? "expired" : "open";
    await db.update(checkoutOrders).set({
      stripeCustomerId: session.customer, stripeSubscriptionId: session.subscription,
      amountTotal: session.amount_total ?? 0, currency: session.currency ?? "brl",
      status, updatedAt: new Date().toISOString(),
    }).where(eq(checkoutOrders.stripeSessionId, session.id));
    return Response.json({
      id: session.id, status: session.status, paymentStatus: session.payment_status,
      customerEmail: order.memberEmail,
      customerName: order.memberName,
      amountTotal: session.amount_total, currency: session.currency,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof StripeApiError ? error.message : "Não foi possível confirmar o pagamento." },
      { status: error instanceof StripeApiError ? error.status : 500 },
    );
  }
}
