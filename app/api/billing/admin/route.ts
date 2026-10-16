import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { checkoutOrders, offers, subscriptions } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { stripeConfig } from "@/lib/stripe";

function origin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return host ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${host}` : new URL(request.url).origin;
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  try {
    const db = getDb();
    const [offerRows, subscriptionRows, orderRows, [stats]] = await Promise.all([
      db.select().from(offers).orderBy(desc(offers.updatedAt)),
      db.select().from(subscriptions).where(eq(subscriptions.provider, "stripe")).orderBy(desc(subscriptions.updatedAt)).limit(50),
      db.select().from(checkoutOrders).orderBy(desc(checkoutOrders.updatedAt)).limit(50),
      db.select({
        active: sql<number>`coalesce(sum(case when ${subscriptions.status} in ('active','trialing') then 1 else 0 end),0)`,
        pastDue: sql<number>`coalesce(sum(case when ${subscriptions.status} in ('past_due','unpaid','incomplete') then 1 else 0 end),0)`,
        canceled: sql<number>`coalesce(sum(case when ${subscriptions.status} = 'canceled' then 1 else 0 end),0)`,
      }).from(subscriptions).where(eq(subscriptions.provider, "stripe")),
    ]);
    const config = stripeConfig();
    return Response.json({
      connection: {
        secretKey: Boolean(config.secretKey), publishableKey: Boolean(config.publishableKey),
        webhookSecret: Boolean(config.webhookSecret),
        ready: Boolean(config.secretKey && config.publishableKey && config.webhookSecret),
        webhookUrl: `${origin(request)}/api/billing/webhook`,
      },
      offers: offerRows, subscriptions: subscriptionRows, orders: orderRows,
      stats: {
        active: Number(stats?.active ?? 0), pastDue: Number(stats?.pastDue ?? 0),
        canceled: Number(stats?.canceled ?? 0),
        completedOrders: orderRows.filter((order) => order.status === "complete").length,
      },
    });
  } catch (error) {
    console.error("billing:admin", error);
    return Response.json({ error: "Não foi possível carregar os dados financeiros." }, { status: 500 });
  }
}
