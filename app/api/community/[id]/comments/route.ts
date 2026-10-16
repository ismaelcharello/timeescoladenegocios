import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { communityComments, communityPosts } from "@/db/schema";
import { getAuthorizedMember } from "@/lib/access";
import { isAdminRequest } from "@/lib/auth";

async function postIdFrom(params: Promise<{ id: string }>) {
  const value = Number((await params).id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function publishedPostExists(postId: number) {
  const [post] = await getDb().select({ id: communityPosts.id }).from(communityPosts)
    .where(and(eq(communityPosts.id, postId), eq(communityPosts.status, "published"))).limit(1);
  return Boolean(post);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthorizedMember(request, "community");
  if (!identity) return Response.json({ error: "Acesso ativo necessário." }, { status: 403 });
  const postId = await postIdFrom(params);
  if (!postId) return Response.json({ error: "Publicação inválida." }, { status: 400 });

  try {
    if (!(await publishedPostExists(postId))) return Response.json({ error: "Publicação não encontrada." }, { status: 404 });
    const comments = await getDb().select({
      id: communityComments.id,
      authorEmail: communityComments.authorEmail,
      authorName: communityComments.authorName,
      content: communityComments.content,
      createdAt: communityComments.createdAt,
    }).from(communityComments)
      .where(and(eq(communityComments.postId, postId), eq(communityComments.status, "published")))
      .orderBy(asc(communityComments.createdAt)).limit(100);
    return Response.json({ comments: comments.map((comment) => ({ ...comment, own: comment.authorEmail === identity.email, authorEmail: undefined })) });
  } catch (error) {
    console.error("community:comments-list failed", error);
    return Response.json({ error: "Não foi possível carregar os comentários." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthorizedMember(request, "community");
  if (!identity) return Response.json({ error: "Acesso ativo necessário." }, { status: 403 });
  const postId = await postIdFrom(params);
  if (!postId) return Response.json({ error: "Publicação inválida." }, { status: 400 });

  try {
    const payload = (await request.json()) as { content?: string };
    const content = payload.content?.trim() ?? "";
    if (content.length < 2 || content.length > 1_200) {
      return Response.json({ error: "O comentário deve ter entre 2 e 1.200 caracteres." }, { status: 400 });
    }
    if (!(await publishedPostExists(postId))) return Response.json({ error: "Publicação não encontrada." }, { status: 404 });
    const [comment] = await getDb().insert(communityComments).values({
      postId,
      authorEmail: identity.email,
      authorName: identity.fullName || identity.email.split("@")[0],
      content,
    }).returning({
      id: communityComments.id,
      authorEmail: communityComments.authorEmail,
      authorName: communityComments.authorName,
      content: communityComments.content,
      createdAt: communityComments.createdAt,
    });
    return Response.json({ comment: { ...comment, authorEmail: undefined, own: true } }, { status: 201 });
  } catch (error) {
    console.error("community:comment-publish failed", error);
    return Response.json({ error: "Não foi possível publicar o comentário." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthorizedMember(request, "community");
  if (!identity) return Response.json({ error: "Acesso ativo necessário." }, { status: 403 });
  const postId = await postIdFrom(params);
  if (!postId) return Response.json({ error: "Publicação inválida." }, { status: 400 });
  try {
    const body = await request.json() as { commentId?: number };
    const commentId = Number(body.commentId);
    const [comment] = Number.isInteger(commentId) ? await getDb().select().from(communityComments).where(and(
      eq(communityComments.id, commentId), eq(communityComments.postId, postId),
    )).limit(1) : [];
    if (!comment) return Response.json({ error: "Comentário não encontrado." }, { status: 404 });
    const admin = await isAdminRequest(request);
    if (comment.authorEmail !== identity.email && !admin) return Response.json({ error: "Você só pode excluir seus comentários." }, { status: 403 });
    await getDb().update(communityComments).set({ status: "hidden", updatedAt: new Date().toISOString() }).where(eq(communityComments.id, comment.id));
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("community:comment-delete failed", error);
    return Response.json({ error: "Não foi possível excluir o comentário." }, { status: 500 });
  }
}
