import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { communityPostLikes, communityPostSaves, communityPosts, communityReports } from "@/db/schema";
import { getAuthorizedMember } from "@/lib/access";
import { isAdminRequest } from "@/lib/auth";

async function postIdFrom(params: Promise<{ id: string }>) {
  const value = Number((await params).id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthorizedMember(request, "community");
  if (!identity) return Response.json({ error: "Acesso ativo necessário." }, { status: 403 });
  const postId = await postIdFrom(params);
  if (!postId) return Response.json({ error: "Publicação inválida." }, { status: 400 });

  try {
    const payload = (await request.json()) as { action?: "like" | "save" | "report"; reason?: string };
    if (payload.action !== "like" && payload.action !== "save" && payload.action !== "report") {
      return Response.json({ error: "Ação inválida." }, { status: 400 });
    }
    const db = getDb();
    const [post] = await db.select({ id: communityPosts.id }).from(communityPosts)
      .where(and(eq(communityPosts.id, postId), eq(communityPosts.status, "published"))).limit(1);
    if (!post) return Response.json({ error: "Publicação não encontrada." }, { status: 404 });

    if (payload.action === "report") {
      const reason = payload.reason?.trim().slice(0, 500) || "Conteúdo inadequado";
      const [existingReport] = await db.select({ id: communityReports.id }).from(communityReports).where(and(
        eq(communityReports.postId, postId), eq(communityReports.reporterEmail, identity.email), eq(communityReports.status, "pending"),
      )).limit(1);
      if (!existingReport) await db.insert(communityReports).values({ postId, reporterEmail: identity.email, reason });
      return Response.json({ reported: true });
    }
    const table = payload.action === "like" ? communityPostLikes : communityPostSaves;
    const [existing] = await db.select({ id: table.id }).from(table)
      .where(and(eq(table.postId, postId), eq(table.memberEmail, identity.email))).limit(1);
    if (existing) {
      await db.delete(table).where(eq(table.id, existing.id));
      return Response.json({ active: false });
    }
    await db.insert(table).values({ postId, memberEmail: identity.email });
    return Response.json({ active: true });
  } catch (error) {
    console.error("community:interaction failed", error);
    return Response.json({ error: "Não foi possível registrar sua interação." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthorizedMember(request, "community");
  if (!identity) return Response.json({ error: "Acesso ativo necessário." }, { status: 403 });
  const postId = await postIdFrom(params);
  if (!postId) return Response.json({ error: "Publicação inválida." }, { status: 400 });
  try {
    const [post] = await getDb().select().from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
    if (!post) return Response.json({ error: "Publicação não encontrada." }, { status: 404 });
    const admin = await isAdminRequest(request);
    if (post.authorEmail !== identity.email && !admin) return Response.json({ error: "Você só pode editar suas publicações." }, { status: 403 });
    const payload = await request.json() as { content?: string };
    const content = payload.content?.trim() ?? "";
    if (content.length < 2 || content.length > 4_000) return Response.json({ error: "O texto deve ter entre 2 e 4.000 caracteres." }, { status: 422 });
    const [updated] = await getDb().update(communityPosts).set({ content, updatedAt: new Date().toISOString() })
      .where(eq(communityPosts.id, postId)).returning();
    return Response.json({ post: updated });
  } catch (error) {
    console.error("community:update failed", error);
    return Response.json({ error: "Não foi possível editar a publicação." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthorizedMember(request, "community");
  if (!identity) return Response.json({ error: "Acesso ativo necessário." }, { status: 403 });
  const postId = await postIdFrom(params);
  if (!postId) return Response.json({ error: "Publicação inválida." }, { status: 400 });
  try {
    const [post] = await getDb().select().from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
    if (!post) return Response.json({ error: "Publicação não encontrada." }, { status: 404 });
    const admin = await isAdminRequest(request);
    if (post.authorEmail !== identity.email && !admin) return Response.json({ error: "Você só pode excluir suas publicações." }, { status: 403 });
    await getDb().update(communityPosts).set({ status: "hidden", updatedAt: new Date().toISOString() }).where(eq(communityPosts.id, postId));
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("community:delete failed", error);
    return Response.json({ error: "Não foi possível excluir a publicação." }, { status: 500 });
  }
}
