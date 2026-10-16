import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { offers } from "@/db/schema";
import { ACCESS_KEYS, TIME_MEMBERSHIP_ACCESS_KEY } from "@/lib/access-policy";
import { isAdminRequest } from "@/lib/auth";

const offerSchema = z.object({
  id: z.number().int().positive().optional(), name: z.string().trim().min(1).max(140), description: z.string().trim().max(1200).optional(),
  amountCents: z.coerce.number().int().min(100), billingType: z.enum(["one_time", "subscription"]).optional(),
  billingInterval: z.enum(["month", "year"]).nullable().optional(), intervalCount: z.coerce.number().int().min(1).max(12).optional(),
  trialDays: z.coerce.number().int().min(0).max(90).optional(), stripePriceId: z.string().trim().max(160).optional(),
  accessKey: z.enum(ACCESS_KEYS).optional(), active: z.boolean().optional(),
});

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    const all = new URL(request.url).searchParams.get("all") === "1" && await isAdminRequest(request);
    const rows = all
      ? await db.select().from(offers).orderBy(desc(offers.updatedAt))
      : await db.select().from(offers).where(eq(offers.active, true)).orderBy(asc(offers.amountCents));
    return Response.json({ offers: all ? rows : rows.map(({ stripePriceId: _priceId, accessKey: _accessKey, ...offer }) => offer) });
  } catch (error) {
    console.error("billing:offers:list", error);
    return Response.json({ error: "Não foi possível carregar as ofertas agora." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  try {
    const payload = offerSchema.parse(await request.json());
    const { name, amountCents } = payload;
    const billingType = payload.billingType ?? "subscription";
    const values = {
      name,
      slug: slugify(name) || `oferta-${Date.now()}`,
      description: payload.description?.trim() ?? "",
      amountCents,
      currency: "brl",
      billingType,
      billingInterval: billingType === "subscription" ? payload.billingInterval ?? "month" : null,
      intervalCount: Math.max(1, Math.min(12, Math.floor(payload.intervalCount ?? 1))),
      trialDays: Math.max(0, Math.min(90, Math.floor(payload.trialDays ?? 0))),
      stripePriceId: payload.stripePriceId?.trim() || null,
      accessKey: payload.accessKey ?? TIME_MEMBERSHIP_ACCESS_KEY,
      active: Boolean(payload.active),
      updatedAt: new Date().toISOString(),
    };
    const db = getDb();
    if (payload.id) {
      const [offer] = await db.update(offers).set(values).where(eq(offers.id, payload.id)).returning();
      return Response.json({ offer });
    }
    const [offer] = await db.insert(offers).values(values).returning();
    return Response.json({ offer }, { status: 201 });
  } catch (error) {
    console.error("billing:offers:save", error);
    return Response.json({ error: error instanceof z.ZodError ? "Revise os dados da oferta." : "Não foi possível salvar a oferta agora." }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
