import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, communityComments, communityPosts, communityReports } from "@/db/schema";
import { getRequestIdentity } from "@/lib/auth";

const actionSchema = z.object({
  target: z.enum(["post", "comment", "report"]),
  id: z.number().int().positive(),
  action: z.enum(["publish", "hide", "dismiss", "review"]),
  reason: z.string().trim().max(500).optional(),
});

async function admin(request: Request) {
  const identity = await getRequestIdentity(request);
  return identity?.isAdmin ? identity : null;
}

export async function GET(request: Request) {
  if (!(await admin(request))) return Response.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  try {
    const [posts, comments, reports] = await Promise.all([
      getDb().select().from(communityPosts).orderBy(desc(communityPosts.createdAt)).limit(100),
      getDb().select().from(communityComments).orderBy(desc(communityComments.createdAt)).limit(200),
      getDb().select().from(communityReports).orderBy(desc(communityReports.createdAt)).limit(100),
    ]);
    return Response.json({ posts, comments, reports });
  } catch (error) {
    console.error("admin-community:list failed", error);
    return Response.json({ error: "Não foi possível carregar a moderação." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const identity = await admin(request);
  if (!identity) return Response.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  try {
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Ação de moderação inválida." }, { status: 422 });
    const input = parsed.data;
    if (input.target === "post") {
      const status = input.action === "publish" ? "published" : input.action === "hide" ? "hidden" : null;
      if (!status) return Response.json({ error: "Ação inválida para publicação." }, { status: 422 });
      await getDb().update(communityPosts).set({ status, updatedAt: new Date().toISOString() }).where(eq(communityPosts.id, input.id));
    } else if (input.target === "comment") {
      const status = input.action === "publish" ? "published" : input.action === "hide" ? "hidden" : null;
      if (!status) return Response.json({ error: "Ação inválida para comentário." }, { status: 422 });
      await getDb().update(communityComments).set({ status, updatedAt: new Date().toISOString() }).where(eq(communityComments.id, input.id));
    } else {
      const status = input.action === "dismiss" ? "dismissed" : input.action === "review" ? "reviewed" : null;
      if (!status) return Response.json({ error: "Ação inválida para denúncia." }, { status: 422 });
      await getDb().update(communityReports).set({ status, reviewedBy: identity.email, reviewedAt: new Date().toISOString() }).where(eq(communityReports.id, input.id));
    }
    await getDb().insert(auditLogs).values({
      actorUserId: identity.id,
      actorEmail: identity.email,
      action: `community.${input.target}.${input.action}`,
      entityType: input.target,
      entityId: String(input.id),
      detailsJson: JSON.stringify({ reason: input.reason ?? "" }),
    });
    return Response.json({ updated: true });
  } catch (error) {
    console.error("admin-community:moderate failed", error);
    return Response.json({ error: "Não foi possível concluir a moderação." }, { status: 500 });
  }
}
