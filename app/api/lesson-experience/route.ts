import { and, asc, desc, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonMaterials, lessonReviews, members } from "@/db/schema";
import { getAuthorizedMember } from "@/lib/access";
import { publishedLessonExists } from "@/lib/course-access";
import { materialDeliveryUrl } from "@/lib/learning-content";
import { isSchoolComingSoon } from "@/lib/school-status";

function lessonIdFrom(request: Request) {
  const value = Number(new URL(request.url).searchParams.get("lessonId"));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function GET(request: Request) {
  const identity = await getAuthorizedMember(request, "courses");
  if (!identity) return Response.json({ error: "Acesso ativo necessário." }, { status: 403 });
  if (isSchoolComingSoon()) return Response.json({ error: "A Escola TIME estará disponível em breve." }, { status: 409 });
  const lessonId = lessonIdFrom(request);
  if (!lessonId) return Response.json({ error: "Aula inválida." }, { status: 400 });

  try {
    if (!(await publishedLessonExists(lessonId))) {
      return Response.json({ error: "Aula não encontrada." }, { status: 404 });
    }
    const db = getDb();
    const [materials, reviews] = await Promise.all([
      db.select().from(lessonMaterials)
        .where(and(eq(lessonMaterials.lessonId, lessonId), eq(lessonMaterials.status, "published")))
        .orderBy(asc(lessonMaterials.position), asc(lessonMaterials.id)),
      db.select({
        id: lessonReviews.id,
        rating: lessonReviews.rating,
        comment: lessonReviews.comment,
        status: lessonReviews.status,
        memberEmail: lessonReviews.memberEmail,
        authorName: members.fullName,
        createdAt: lessonReviews.createdAt,
        updatedAt: lessonReviews.updatedAt,
      }).from(lessonReviews)
        .leftJoin(members, eq(members.email, lessonReviews.memberEmail))
        .where(and(
          eq(lessonReviews.lessonId, lessonId),
          or(eq(lessonReviews.status, "published"), eq(lessonReviews.memberEmail, identity.email)),
        ))
        .orderBy(desc(lessonReviews.updatedAt))
        .limit(50),
    ]);

    return Response.json({
      materials: materials.map((material) => ({
        id: material.id,
        title: material.title,
        kind: material.kind,
        mimeType: material.mimeType,
        url: materialDeliveryUrl(material),
      })).filter((material) => material.url),
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        own: review.memberEmail === identity.email,
        hidden: review.status === "hidden",
        authorName: review.memberEmail === identity.email
          ? "Sua avaliação"
          : review.authorName?.trim() || "Membro TIME",
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("lesson-experience:get failed", error);
    return Response.json({ error: "Não foi possível carregar os recursos da aula." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const identity = await getAuthorizedMember(request, "courses");
  if (!identity) return Response.json({ error: "Acesso ativo necessário." }, { status: 403 });
  if (isSchoolComingSoon()) return Response.json({ error: "A Escola TIME estará disponível em breve." }, { status: 409 });

  try {
    const payload = (await request.json()) as { lessonId?: number; rating?: number; comment?: string };
    const lessonId = Number(payload.lessonId);
    const rating = Number(payload.rating);
    const comment = typeof payload.comment === "string" ? payload.comment.trim() : "";
    if (!Number.isInteger(lessonId) || lessonId < 1) {
      return Response.json({ error: "Aula inválida." }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "Escolha uma nota de 1 a 5." }, { status: 400 });
    }
    if (comment.length > 1_200) {
      return Response.json({ error: "O comentário deve ter até 1.200 caracteres." }, { status: 400 });
    }
    if (!(await publishedLessonExists(lessonId))) {
      return Response.json({ error: "Aula não encontrada." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const [review] = await getDb().insert(lessonReviews).values({
      lessonId,
      memberEmail: identity.email,
      rating,
      comment,
      status: "published",
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [lessonReviews.memberEmail, lessonReviews.lessonId],
      set: { rating, comment, status: "published", updatedAt: now },
    }).returning();
    return Response.json({ review }, { status: 201 });
  } catch (error) {
    console.error("lesson-experience:save failed", error);
    return Response.json({ error: "Não foi possível salvar sua avaliação." }, { status: 500 });
  }
}
