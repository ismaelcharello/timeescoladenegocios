import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { benefits } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";

const benefitSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().min(3).max(180),
  category: z.enum(["Alimentação", "Farmácias", "Saúde", "Academias", "Combustível", "Viagens", "Educação", "Varejo", "Serviços", "Entretenimento"]),
  description: z.string().trim().min(3).max(1200),
  benefit: z.string().trim().min(3).max(500),
  conditions: z.string().trim().max(1200),
  validUntil: z.string().trim().max(40).nullable(),
  coverage: z.string().trim().max(180),
  ctaLabel: z.string().trim().min(2).max(80),
  ctaUrl: z.union([z.literal(""), z.string().url().refine((value) => value.startsWith("https://"), "Use uma URL HTTPS.")]),
  status: z.enum(["active", "inactive", "coming_soon"]),
});

const statusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["active", "inactive", "coming_soon"]),
});

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "beneficio";
}

async function requireAdmin(request: Request) {
  return isAdminRequest(request);
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const rows = await getDb().select().from(benefits).orderBy(asc(benefits.category), asc(benefits.title));
  return Response.json({ benefits: rows });
}

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  try {
    const payload = benefitSchema.parse(await request.json());
    const now = new Date().toISOString();
    const values = {
      title: payload.title,
      category: payload.category,
      description: payload.description,
      benefit: payload.benefit,
      conditions: payload.conditions,
      validUntil: payload.validUntil || null,
      coverage: payload.coverage,
      ctaLabel: payload.ctaLabel,
      ctaUrl: payload.ctaUrl,
      status: payload.status,
      updatedAt: now,
    };

    if (payload.id) {
      const [benefit] = await getDb().update(benefits).set(values).where(eq(benefits.id, payload.id)).returning();
      return benefit ? Response.json({ benefit }) : Response.json({ error: "Benefício não encontrado." }, { status: 404 });
    }

    const [benefit] = await getDb().insert(benefits).values({
      ...values,
      slug: `${slugify(payload.title)}-${Date.now().toString(36)}`,
      createdAt: now,
    }).returning();
    return Response.json({ benefit }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message || "Revise os dados do benefício." }, { status: 422 });
    console.error("admin:benefits save failed", error);
    return Response.json({ error: "Não foi possível salvar o benefício." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  try {
    const payload = statusSchema.parse(await request.json());
    const [benefit] = await getDb().update(benefits).set({ status: payload.status, updatedAt: new Date().toISOString() }).where(eq(benefits.id, payload.id)).returning();
    return benefit ? Response.json({ benefit }) : Response.json({ error: "Benefício não encontrado." }, { status: 404 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Status inválido." }, { status: 422 });
    console.error("admin:benefits status failed", error);
    return Response.json({ error: "Não foi possível alterar o status." }, { status: 500 });
  }
}
