import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { courseReviews, courses } from "@/db/schema";
import { getAuthorizedMember } from "@/lib/access";
import { isSchoolComingSoon } from "@/lib/school-status";

function courseIdFrom(request: Request) {
  return Number(new URL(request.url).searchParams.get("courseId"));
}

export async function GET(request: Request) {
  const identity = await getAuthorizedMember(request, "courses");
  if (!identity) {
    return Response.json({ error: "Acesso ativo necessário." }, { status: 403 });
  }
  if (isSchoolComingSoon()) return Response.json({ error: "A Escola TIME estará disponível em breve." }, { status: 409 });
  const courseId = courseIdFrom(request);
  if (!Number.isInteger(courseId) || courseId < 1) {
    return Response.json({ error: "Curso inválido." }, { status: 400 });
  }

  try {
    const [course] = await getDb().select({ id: courses.id }).from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.status, "published"))).limit(1);
    if (!course) return Response.json({ error: "Curso não encontrado." }, { status: 404 });
    const reviews = await getDb()
      .select({
        id: courseReviews.id,
        rating: courseReviews.rating,
        comment: courseReviews.comment,
        createdAt: courseReviews.createdAt,
        own: courseReviews.memberEmail,
      })
      .from(courseReviews)
      .where(eq(courseReviews.courseId, courseId))
      .orderBy(desc(courseReviews.updatedAt))
      .limit(50);

    return Response.json({
      reviews: reviews.map((review) => ({
        ...review,
        own: review.own === identity.email,
      })),
    });
  } catch (error) {
    console.error("reviews:list failed", error);
    return Response.json({ error: "Não foi possível carregar as avaliações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const identity = await getAuthorizedMember(request, "courses");
  if (!identity) {
    return Response.json({ error: "Acesso ativo necessário." }, { status: 403 });
  }
  if (isSchoolComingSoon()) return Response.json({ error: "A Escola TIME estará disponível em breve." }, { status: 409 });

  try {
    const payload = (await request.json()) as {
      courseId?: number;
      rating?: number;
      comment?: string;
    };
    const courseId = Number(payload.courseId);
    const rating = Number(payload.rating);
    const comment = payload.comment?.trim() ?? "";
    if (!Number.isInteger(courseId) || courseId < 1) {
      return Response.json({ error: "Curso inválido." }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "Escolha uma nota de 1 a 5." }, { status: 400 });
    }
    if (comment.length > 1200) {
      return Response.json({ error: "O comentário deve ter até 1.200 caracteres." }, { status: 400 });
    }

    const db = getDb();
    const [course] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.status, "published")))
      .limit(1);
    if (!course) {
      return Response.json({ error: "Curso não encontrado." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const [review] = await db
      .insert(courseReviews)
      .values({
        courseId,
        memberEmail: identity.email,
        rating,
        comment,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [courseReviews.courseId, courseReviews.memberEmail],
        set: { rating, comment, updatedAt: now },
      })
      .returning();

    return Response.json({ review }, { status: 201 });
  } catch (error) {
    console.error("reviews:save failed", error);
    return Response.json({ error: "Não foi possível salvar sua avaliação." }, { status: 500 });
  }
}
