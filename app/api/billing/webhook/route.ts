import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  checkoutOrders,
  memberEntitlements,
  members,
  offers,
  stripeEvents,
  subscriptions,
} from "@/db/schema";
import { isAccessKey } from "@/lib/access-policy";
import { stripeConfig, stripeRequest, verifyStripeSignature } from "@/lib/stripe";

type StripeObject = Record<string, unknown> & {
  id?: string;
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  status?: string;
  payment_status?: string;
  current_period_end?: number;
  customer_email?: string | null;
  metadata?: Record<string, string>;
  customer_details?: { email?: string | null; name?: string | null; phone?: string | null } | null;
  parent?: { subscription_details?: { subscription?: string | null } | null } | null;
  items?: { data?: Array<{ current_period_end?: number }> };
};

type StripeEvent = {
  id: string;
  type: string;
  livemode: boolean;
  data: { object: StripeObject };
};

function idOf(value: StripeObject["customer"]) {
  if (typeof value === "string") return value;
  return value && typeof value === "object" && typeof value.id === "string" ? value.id : null;
}

function emailOf(object: StripeObject) {
  return (object.customer_details?.email ?? object.customer_email ?? object.metadata?.time_member_email ?? "")
    .trim().toLowerCase();
}

function periodEnd(object: StripeObject) {
  const value = object.current_period_end ?? object.items?.data?.[0]?.current_period_end;
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function subscriptionStatus(value?: string) {
  if (value === "active") return "active" as const;
  if (value === "trialing") return "trialing" as const;
  if (value === "past_due") return "past_due" as const;
  if (value === "unpaid" || value === "paused") return "unpaid" as const;
  if (value === "incomplete") return "incomplete" as const;
  return "canceled" as const;
}

function accessStatus(value?: string) {
  if (value === "active" || value === "trialing") return "active" as const;
  if (value === "past_due" || value === "unpaid" || value === "incomplete" || value === "paused") return "past_due" as const;
  return "canceled" as const;
}

async function checkoutCompleted(object: StripeObject) {
  const sessionId = object.id ?? "";
  if (!sessionId) return;
  const db = getDb();
  const [order] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.stripeSessionId, sessionId)).limit(1);
  if (!order?.memberAuthUserId) return;
  const email = order.memberEmail;
  const offerId = order.offerId;
  const [offer] = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
  if (!offer) return;
  const customerId = idOf(object.customer);
  const subscriptionId = idOf(object.subscription);
  const paid = object.payment_status === "paid" || object.payment_status === "no_payment_required";
  const now = new Date().toISOString();
  await db.update(checkoutOrders).set({
    stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId,
    status: paid ? "complete" : "open", updatedAt: now,
  }).where(eq(checkoutOrders.stripeSessionId, sessionId));
  await db.insert(members).values({
    email,
    fullName: order.memberName,
    phone: order.memberPhone,
    authUserId: order.memberAuthUserId,
    stripeCustomerId: customerId, accessStatus: paid ? "active" : "pending", updatedAt: now,
  }).onConflictDoUpdate({
    target: members.email,
    set: { stripeCustomerId: customerId, authUserId: order.memberAuthUserId, accessStatus: sql`case when ${members.accessStatus} in ('blocked', 'complimentary') then ${members.accessStatus} else ${paid ? "active" : "pending"} end`, updatedAt: now },
  });
  if (!paid) return;
  const reference = subscriptionId ?? sessionId;
  await db.insert(memberEntitlements).values({
    memberEmail: email, accessKey: offer.accessKey, source: "stripe",
    sourceReference: reference, status: "active", updatedAt: now,
  }).onConflictDoUpdate({
    target: [memberEntitlements.source, memberEntitlements.sourceReference, memberEntitlements.accessKey],
    set: { memberEmail: email, status: "active", updatedAt: now },
  });
  if (subscriptionId) {
    await db.insert(subscriptions).values({
      memberEmail: email, provider: "stripe", providerCustomerId: customerId,
      providerSubscriptionId: subscriptionId, offerId: offer.id, planName: offer.name,
      status: "active", updatedAt: now,
    }).onConflictDoUpdate({
      target: [subscriptions.provider, subscriptions.providerSubscriptionId],
      set: {
        memberEmail: email, providerCustomerId: customerId, offerId: offer.id,
        planName: offer.name, status: "active", updatedAt: now,
      },
    });
    const subscription = await stripeRequest<StripeObject>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    );
    await subscriptionChanged(subscription);
  }
}

async function subscriptionChanged(object: StripeObject) {
  const subscriptionId = object.id ?? "";
  if (!subscriptionId) return;
  const db = getDb();
  const [existing] = await db.select().from(subscriptions).where(and(
    eq(subscriptions.provider, "stripe"),
    eq(subscriptions.providerSubscriptionId, subscriptionId),
  )).limit(1);
  const [checkoutOrder] = existing ? [] : await db.select().from(checkoutOrders)
    .where(eq(checkoutOrders.stripeSubscriptionId, subscriptionId)).limit(1);
  const email = (existing?.memberEmail ?? checkoutOrder?.memberEmail ?? "").trim().toLowerCase();
  if (!email) return;
  const offerId = Number(existing?.offerId ?? checkoutOrder?.offerId);
  const [offer] = Number.isInteger(offerId)
    ? await db.select().from(offers).where(eq(offers.id, offerId)).limit(1)
    : [];
  const [existingEntitlement] = await db.select({ accessKey: memberEntitlements.accessKey })
    .from(memberEntitlements).where(and(
      eq(memberEntitlements.source, "stripe"),
      eq(memberEntitlements.sourceReference, subscriptionId),
    )).limit(1);
  const customerId = idOf(object.customer);
  const subStatus = subscriptionStatus(object.status);
  const memberStatus = accessStatus(object.status);
  const end = periodEnd(object);
  const metadataKey = object.metadata?.time_access_key;
  const key = offer?.accessKey
    ?? (metadataKey && isAccessKey(metadataKey) ? metadataKey : null)
    ?? (existingEntitlement && isAccessKey(existingEntitlement.accessKey) ? existingEntitlement.accessKey : null);
  const now = new Date().toISOString();
  await db.insert(subscriptions).values({
    memberEmail: email, provider: "stripe", providerCustomerId: customerId,
    providerSubscriptionId: subscriptionId, offerId: offer?.id ?? existing?.offerId ?? null,
    planName: offer?.name ?? existing?.planName ?? "Plano TIME", status: subStatus,
    currentPeriodEnd: end, updatedAt: now,
  }).onConflictDoUpdate({
    target: [subscriptions.provider, subscriptions.providerSubscriptionId],
    set: {
      providerCustomerId: customerId, offerId: offer?.id ?? existing?.offerId ?? null,
      planName: offer?.name ?? existing?.planName ?? "Plano TIME", status: subStatus,
      currentPeriodEnd: end, updatedAt: now,
    },
  });
  await db.insert(members).values({
    email, stripeCustomerId: customerId, accessStatus: memberStatus, updatedAt: now,
  }).onConflictDoUpdate({
    target: members.email,
    set: { stripeCustomerId: customerId, accessStatus: sql`case when ${members.accessStatus} in ('blocked', 'complimentary') then ${members.accessStatus} else ${memberStatus} end`, updatedAt: now },
  });
  if (key) {
    await db.insert(memberEntitlements).values({
      memberEmail: email, accessKey: key, source: "stripe", sourceReference: subscriptionId,
      status: memberStatus, currentPeriodEnd: end, updatedAt: now,
    }).onConflictDoUpdate({
      target: [memberEntitlements.source, memberEntitlements.sourceReference, memberEntitlements.accessKey],
      set: { memberEmail: email, status: memberStatus, currentPeriodEnd: end, updatedAt: now },
    });
  }
}

async function invoiceChanged(object: StripeObject, paid: boolean) {
  const subscriptionId = idOf(object.subscription) ?? object.parent?.subscription_details?.subscription ?? null;
  if (!subscriptionId) return;
  const db = getDb();
  const [subscription] = await db.select().from(subscriptions).where(and(
    eq(subscriptions.provider, "stripe"),
    eq(subscriptions.providerSubscriptionId, subscriptionId),
  )).limit(1);
  if (!subscription) return;
  const now = new Date().toISOString();
  const status = paid ? "active" : "past_due";
  await db.update(subscriptions).set({ status, updatedAt: now }).where(eq(subscriptions.id, subscription.id));
  await db.update(members).set({ accessStatus: sql`case when ${members.accessStatus} in ('blocked', 'complimentary') then ${members.accessStatus} else ${status} end`, updatedAt: now }).where(eq(members.email, subscription.memberEmail));
  await db.update(memberEntitlements).set({ status, updatedAt: now }).where(and(
    eq(memberEntitlements.source, "stripe"),
    eq(memberEntitlements.sourceReference, subscriptionId),
  ));
}

export async function POST(request: Request) {
  const { webhookSecret } = stripeConfig();
  if (!webhookSecret) return Response.json({ error: "Webhook da Stripe não configurado." }, { status: 503 });
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  if (!(await verifyStripeSignature(body, signature, webhookSecret))) {
    return Response.json({ error: "Assinatura inválida." }, { status: 400 });
  }
  let event: StripeEvent;
  try { event = JSON.parse(body) as StripeEvent; }
  catch { return Response.json({ error: "Evento inválido." }, { status: 400 }); }
  if (!event.id || !event.type || !event.data?.object) return Response.json({ error: "Evento inválido." }, { status: 400 });
  const db = getDb();
  const now = new Date().toISOString();
  const [reservation] = await db.insert(stripeEvents).values({
    eventId: event.id, type: event.type, livemode: Boolean(event.livemode), status: "processing", processedAt: now, updatedAt: now,
  }).onConflictDoNothing().returning({ id: stripeEvents.id });
  if (!reservation) {
    const [existing] = await db.select({ status: stripeEvents.status }).from(stripeEvents).where(eq(stripeEvents.eventId, event.id)).limit(1);
    return Response.json({ received: true, duplicate: existing?.status === "processed", processing: existing?.status === "processing" }, { status: existing?.status === "processing" ? 409 : 200 });
  }
  try {
    const object = event.data.object;
    if (event.type === "checkout.session.completed") await checkoutCompleted(object);
    else if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      await subscriptionChanged(object);
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      await invoiceChanged(object, true);
    } else if (event.type === "invoice.payment_failed") {
      await invoiceChanged(object, false);
    } else if (event.type === "checkout.session.expired" && object.id) {
      await db.update(checkoutOrders).set({ status: "expired", updatedAt: new Date().toISOString() })
        .where(eq(checkoutOrders.stripeSessionId, object.id));
    }
    await db.update(stripeEvents).set({ status: "processed", lastError: "", processedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(stripeEvents.id, reservation.id));
    return Response.json({ received: true });
  } catch (error) {
    console.error("billing:webhook", error);
    await db.delete(stripeEvents).where(eq(stripeEvents.id, reservation.id));
    return Response.json({ error: "Falha ao processar o evento." }, { status: 500 });
  }
}
