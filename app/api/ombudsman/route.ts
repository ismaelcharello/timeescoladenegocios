import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { ombudsmanMessages } from "@/db/schema";
import { getAuthorizedMember, getMemberAccess } from "@/lib/access";
import { isAdminRequest } from "@/lib/auth";

const createSchema = z.object({
  type: z.enum(["suggestion", "complaint", "problem", "feedback"]),
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(10).max(4000),
});

const updateSchema = z.object({ id: z.number().int().positive(), status: z.enum(["received", "in_progress", "completed"]) });

export async function GET(request: Request) {
  const access = await getMemberAccess(request);
  if (!access) return Response.json({ error: "Entre para acessar a Ouvidoria." }, { status: 401 });
  const rows = access.identity.isAdmin
    ? await getDb().select().from(ombudsmanMessages).orderBy(desc(ombudsmanMessages.createdAt))
    : await getDb().select().from(ombudsmanMessages).where(eq(ombudsmanMessages.memberEmail, access.identity.email)).orderBy(desc(ombudsmanMessages.createdAt));
  return Response.json({ messages: rows });
}

export async function POST(request: Request) {
  const member = await getAuthorizedMember(request, "ombudsman");
  if (!member) return Response.json({ error: "Ouvidoria exclusiva para membros ativos." }, { status: 403 });
  try {
    const payload = createSchema.parse(await request.json());
    const [message] = await getDb().insert(ombudsmanMessages).values({
      memberEmail: member.email,
      memberAuthUserId: member.id,
      type: payload.type,
      subject: payload.subject,
      message: payload.message,
    }).returning();
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Revise o tipo, assunto e mensagem." }, { status: 422 });
    console.error("ombudsman:create failed", error);
    return Response.json({ error: "Não foi possível enviar sua mensagem." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  try {
    const payload = updateSchema.parse(await request.json());
    const [message] = await getDb().update(ombudsmanMessages).set({ status: payload.status, updatedAt: new Date().toISOString() }).where(eq(ombudsmanMessages.id, payload.id)).returning();
    return message ? Response.json({ message }) : Response.json({ error: "Mensagem não encontrada." }, { status: 404 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Status inválido." }, { status: 422 });
    console.error("ombudsman:update failed", error);
    return Response.json({ error: "Não foi possível atualizar a mensagem." }, { status: 500 });
  }
}
