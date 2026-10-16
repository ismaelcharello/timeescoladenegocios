import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { memberProgress } from "@/db/schema";
import { getAuthorizedMember } from "@/lib/access";
import { publishedLessonExists } from "@/lib/course-access";
import { isSchoolComingSoon } from "@/lib/school-status";

export async function POST(request: Request) {
  const identity = await getAuthorizedMember(request, "courses");
  if (!identity) {
    return Response.json({ error: "Sua assinatura precisa estar ativa para registrar progresso." }, { status: 403 });
  }
  if (isSchoolComingSoon()) return Response.json({ error: "A Escola TIME estará disponível em breve." }, { status: 409 });

  try {
    const payload = (await request.json()) as {
      lessonId?: number;
      watchSeconds?: number;
      completed?: boolean;
      started?: boolean;
    };
    const lessonId = Number(payload.lessonId);
    if (!Number.isInteger(lessonId) || lessonId < 1) {
      return Response.json({ error: "Aula inválida." }, { status: 400 });
    }

    if (!(await publishedLessonExists(lessonId))) return Response.json({ error: "Aula não encontrada." }, { status: 404 });
    const db = getDb();
    const now = new Date().toISOString();
    const startedAt = payload.started || payload.completed || Number(payload.watchSeconds) > 0 ? now : null;
    if (!startedAt) {
      return Response.json({ error: "O progresso só é iniciado por uma ação de reprodução ou conclusão." }, { status: 400 });
    }
    const [progress] = await db
      .insert(memberProgress)
      .values({
        memberEmail: identity.email,
        lessonId,
        watchSeconds: Math.max(0, Math.floor(payload.watchSeconds ?? 0)),
        completed: Boolean(payload.completed),
        startedAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [memberProgress.memberEmail, memberProgress.lessonId],
        set: {
          watchSeconds: sql`max(${memberProgress.watchSeconds}, excluded.watch_seconds)`,
          completed: sql`${memberProgress.completed} or excluded.completed`,
          startedAt: sql`coalesce(${memberProgress.startedAt}, excluded.started_at)`,
          updatedAt: sql`excluded.updated_at`,
        },
      })
      .returning();

    return Response.json({ progress });
  } catch (error) {
    console.error("progress:save failed", error);
    return Response.json(
      { error: "Não foi possível registrar o progresso agora." },
      { status: 500 },
    );
  }
}
