import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { benefits } from "@/db/schema";
import { getAuthorizedMember } from "@/lib/access";

export async function GET(request: Request) {
  if (!(await getAuthorizedMember(request, "benefits"))) {
    return Response.json({ error: "Benefícios exclusivos para membros ativos." }, { status: 403 });
  }

  const rows = await getDb()
    .select()
    .from(benefits)
    .where(eq(benefits.status, "active"))
    .orderBy(asc(benefits.category), asc(benefits.title));

  const comingSoon = await getDb()
    .select()
    .from(benefits)
    .where(eq(benefits.status, "coming_soon"))
    .orderBy(asc(benefits.category), asc(benefits.title));

  return Response.json({ benefits: [...rows, ...comingSoon] });
}
