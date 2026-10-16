import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonNotes } from "@/db/schema";
import { getAuthorizedMember } from "@/lib/access";
import { publishedLessonExists } from "@/lib/course-access";
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
    const [note] = await getDb()
      .select({ content: lessonNotes.content, updatedAt: lessonNotes.updatedAt })
      .from(lessonNotes)
      .where(and(eq(lessonNotes.memberEmail, identity.email), eq(lessonNotes.lessonId, lessonId)))
      .limit(1);
    return Response.json({ note: note ?? { content: "", updatedAt: null } });
  } catch (error) {
    console.error("lesson-notes:get failed", error);
    return Response.json({ error: "Não foi possível carregar sua anotação." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const identity = await getAuthorizedMember(request, "courses");
  if (!identity) return Response.json({ error: "Acesso ativo necessário." }, { status: 403 });
  if (isSchoolComingSoon()) return Response.json({ error: "A Escola TIME estará disponível em breve." }, { status: 409 });

  try {
    const payload = (await request.json()) as { lessonId?: number; content?: string };
    const lessonId = Number(payload.lessonId);
    const content = typeof payload.content === "string" ? payload.content.trim().slice(0, 8_000) : "";
    if (!Number.isInteger(lessonId) || lessonId < 1) {
      return Response.json({ error: "Aula inválida." }, { status: 400 });
    }
    if (!(await publishedLessonExists(lessonId))) {
      return Response.json({ error: "Aula não encontrada." }, { status: 404 });
    }
    const now = new Date().toISOString();
    const [note] = await getDb()
      .insert(lessonNotes)
      .values({ memberEmail: identity.email, lessonId, content, updatedAt: now })
      .onConflictDoUpdate({
        target: [lessonNotes.memberEmail, lessonNotes.lessonId],
        set: { content, updatedAt: now },
      })
      .returning({ content: lessonNotes.content, updatedAt: lessonNotes.updatedAt });
    return Response.json({ note });
  } catch (error) {
    console.error("lesson-notes:save failed", error);
    return Response.json({ error: "Não foi possível salvar sua anotação." }, { status: 500 });
  }
}
