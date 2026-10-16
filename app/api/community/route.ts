import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { communityComments, communityPostLikes, communityPostSaves, communityPosts } from "@/db/schema";
import { getAuthorizedMember } from "@/lib/access";
import { isAdminRequest } from "@/lib/auth";

type AttachmentKind = "image" | "gif" | "video" | "link";
type CommunityAttachment = { kind: AttachmentKind; url: string; label?: string };

function safeAttachments(value: unknown): CommunityAttachment[] {
  if (!Array.isArray(value)) return [];
  const attachments: CommunityAttachment[] = [];
  for (const candidate of value.slice(0, 4)) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    const kind = item.kind;
    const rawUrl = typeof item.url === "string" ? item.url.trim() : "";
    if ((kind !== "image" && kind !== "gif" && kind !== "video" && kind !== "link") || !rawUrl || rawUrl.length > 2_000) continue;
    const internalUpload = rawUrl.startsWith("/api/uploads?key=community%2F") || rawUrl.startsWith("/api/uploads?key=community/");
    let isHttps = false;
    try { isHttps = new URL(rawUrl).protocol === "https:"; } catch { /* invalid URL */ }
    // Vídeos são sempre enviados para o armazenamento protegido da TIME. Isso
    // evita incorporar um vídeo arbitrário de terceiros dentro da comunidade.
    if ((kind === "video" && !internalUpload) || (!internalUpload && !isHttps)) continue;
    const label = typeof item.label === "string" ? item.label.trim().slice(0, 160) : undefined;
    attachments.push({ kind, url: rawUrl, ...(label ? { label } : {}) });
  }
  return attachments;
}

function serializePost(post: typeof communityPosts.$inferSelect) {
  let attachments: CommunityAttachment[] = [];
  try { attachments = safeAttachments(JSON.parse(post.attachmentsJson || "[]")); } catch { /* legacy row */ }
  return { ...post, attachments };
}

export async function GET(request: Request) {
  const identity = await getAuthorizedMember(request, "community");
  if (!identity) {
    return Response.json({ error: "Sua assinatura precisa estar ativa para acessar a comunidade." }, { status: 403 });
  }
  try {
    const db = getDb();
    const posts = await db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.status, "published"))
      .orderBy(desc(communityPosts.createdAt))
      .limit(50);
    const postIds = posts.map((post) => post.id);
    const [likes, comments, saves] = postIds.length ? await Promise.all([
      db.select({ postId: communityPostLikes.postId, memberEmail: communityPostLikes.memberEmail }).from(communityPostLikes).where(inArray(communityPostLikes.postId, postIds)),
      db.select({ postId: communityComments.postId }).from(communityComments).where(and(inArray(communityComments.postId, postIds), eq(communityComments.status, "published"))),
      db.select({ postId: communityPostSaves.postId, memberEmail: communityPostSaves.memberEmail }).from(communityPostSaves).where(inArray(communityPostSaves.postId, postIds)),
    ]) : [[], [], []];
    return Response.json({
      posts: posts.map((post) => ({
        ...serializePost(post),
        likesCount: post.likesCount + likes.filter((like) => like.postId === post.id).length,
        commentsCount: post.commentsCount + comments.filter((comment) => comment.postId === post.id).length,
        likedByMe: likes.some((like) => like.postId === post.id && like.memberEmail === identity.email),
        savedByMe: saves.some((save) => save.postId === post.id && save.memberEmail === identity.email),
        own: post.authorEmail === identity.email,
      })),
    });
  } catch (error) {
    console.error("community:list failed", error);
    return Response.json(
      { error: "Não foi possível carregar a comunidade agora." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const identity = await getAuthorizedMember(request, "community");
  if (!identity) {
    return Response.json({ error: "Sua assinatura precisa estar ativa para publicar." }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as {
      content?: string;
      category?: "general" | "opportunity" | "achievement" | "question" | "business" | "offer" | "news";
      official?: boolean;
      attachments?: unknown;
      offer?: unknown;
    };
    const content = payload.content?.trim() ?? "";
    const attachments = safeAttachments(payload.attachments);
    if ((content.length < 2 && !attachments.length) || content.length > 4000) {
      return Response.json(
        { error: "Escreva uma mensagem ou adicione uma mídia. O texto pode ter até 4.000 caracteres." },
        { status: 400 },
      );
    }
    if (payload.official && !(await isAdminRequest(request))) {
      return Response.json({ error: "Somente administradores podem publicar avisos oficiais." }, { status: 403 });
    }
    const category = payload.category === "opportunity" || payload.category === "achievement" || payload.category === "question" || payload.category === "business" || payload.category === "offer" || payload.category === "news"
      ? payload.category
      : "general";
    const offer = payload.offer && typeof payload.offer === "object" ? payload.offer as Record<string, unknown> : {};
    const offerFields = {
      title: typeof offer.title === "string" ? offer.title.trim().slice(0, 180) : "",
      company: typeof offer.company === "string" ? offer.company.trim().slice(0, 180) : "",
      benefit: typeof offer.benefit === "string" ? offer.benefit.trim().slice(0, 500) : "",
      discount: typeof offer.discount === "string" ? offer.discount.trim().slice(0, 100) : "",
      conditions: typeof offer.conditions === "string" ? offer.conditions.trim().slice(0, 1_200) : "",
      validUntil: typeof offer.validUntil === "string" && /^\d{4}-\d{2}-\d{2}$/.test(offer.validUntil) ? offer.validUntil : null,
      contact: typeof offer.contact === "string" ? offer.contact.trim().slice(0, 220) : "",
    };
    if (category === "offer" && (!offerFields.title || !offerFields.company || !offerFields.benefit || !offerFields.contact)) {
      return Response.json({ error: "Informe título, empresa, benefício e contato da oferta." }, { status: 422 });
    }

    const db = getDb();
    const [post] = await db
      .insert(communityPosts)
      .values({
        authorEmail: identity.email,
        authorName: identity.fullName || identity.email.split("@")[0],
        content,
        category,
        ...(category === "offer" ? offerFields : {}),
        attachmentsJson: JSON.stringify(attachments),
        official: Boolean(payload.official),
      })
      .returning();

    return Response.json({ post: { ...serializePost(post), likedByMe: false, savedByMe: false, own: true } }, { status: 201 });
  } catch (error) {
    console.error("community:publish failed", error);
    return Response.json(
      { error: "Não foi possível publicar agora." },
      { status: 500 },
    );
  }
}
