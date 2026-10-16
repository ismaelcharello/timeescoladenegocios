import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { courseModules, courses, lessonMaterials, lessonReviews, lessons } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { normalizeMaterialUrl } from "@/lib/learning-content";
import { normalizeExternalVideoUrl } from "@/lib/video-hosting";

const positiveId = z.number().int().positive();
const contentAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("module.upsert"), id: positiveId.optional(), courseId: positiveId,
    title: z.string().trim().min(1).max(160), description: z.string().trim().max(2_000).default(""),
    status: z.enum(["draft", "published"]).default("published"), position: z.number().int().min(0).optional(),
  }),
  z.object({ action: z.literal("module.reorder"), courseId: positiveId, ids: z.array(positiveId).min(1).max(300) }),
  z.object({
    action: z.literal("lesson.upsert"), id: positiveId.optional(), courseId: positiveId, moduleId: positiveId.nullable(),
    title: z.string().trim().min(1).max(180), description: z.string().trim().max(8_000).default(""),
    videoUrl: z.string().trim().max(2_000).default(""), durationSeconds: z.number().int().min(0).max(604_800).default(0),
    status: z.enum(["draft", "published"]).default("draft"), position: z.number().int().min(0).optional(),
  }),
  z.object({ action: z.literal("lesson.reorder"), courseId: positiveId, moduleId: positiveId.nullable(), ids: z.array(positiveId).min(1).max(500) }),
  z.object({
    action: z.literal("material.upsert"), id: positiveId.optional(), lessonId: positiveId,
    title: z.string().trim().min(1).max(180), kind: z.enum(["file", "link"]),
    storageKey: z.string().trim().max(500).nullable().default(null), externalUrl: z.string().trim().max(2_000).nullable().default(null),
    mimeType: z.string().trim().max(180).default(""), position: z.number().int().min(0).optional(),
    status: z.enum(["draft", "published"]).default("published"),
  }),
  z.object({ action: z.literal("review.moderate"), id: positiveId, status: z.enum(["published", "hidden"]) }),
  z.object({ action: z.literal("course.reorder"), ids: z.array(positiveId).min(1).max(300) }),
]);

const deleteAction = z.discriminatedUnion("resource", [
  z.object({ resource: z.literal("module"), id: positiveId }),
  z.object({ resource: z.literal("lesson"), id: positiveId }),
  z.object({ resource: z.literal("material"), id: positiveId }),
]);

async function courseExists(courseId: number) {
  const [course] = await getDb().select({ id: courses.id }).from(courses).where(eq(courses.id, courseId)).limit(1);
  return Boolean(course);
}

function normalizeLessonSource(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/api/uploads?")) {
    const key = new URL(trimmed, "https://time.local").searchParams.get("key") ?? "";
    return key.startsWith("videos/") ? key : null;
  }
  return normalizeExternalVideoUrl(trimmed);
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }
  try {
    const parsed = contentAction.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Revise os dados informados." }, { status: 400 });
    const input = parsed.data;
    const db = getDb();
    const now = new Date().toISOString();

    if (input.action === "course.reorder") {
      const existing = await db.select({ id: courses.id }).from(courses).where(inArray(courses.id, input.ids));
      if (existing.length !== input.ids.length) return Response.json({ error: "Lista de cursos inválida." }, { status: 400 });
      await Promise.all(input.ids.map((id, position) => db.update(courses).set({ position, updatedAt: now }).where(eq(courses.id, id))));
      return Response.json({ ok: true });
    }

    if (input.action === "module.reorder") {
      const rows = await db.select({ id: courseModules.id }).from(courseModules)
        .where(and(eq(courseModules.courseId, input.courseId), inArray(courseModules.id, input.ids)));
      if (rows.length !== input.ids.length) return Response.json({ error: "Lista de módulos inválida." }, { status: 400 });
      await Promise.all(input.ids.map((id, position) => db.update(courseModules).set({ position, updatedAt: now }).where(eq(courseModules.id, id))));
      return Response.json({ ok: true });
    }

    if (input.action === "lesson.reorder") {
      const rows = await db.select({ id: lessons.id }).from(lessons).where(and(
        eq(lessons.courseId, input.courseId),
        input.moduleId === null ? isNull(lessons.moduleId) : eq(lessons.moduleId, input.moduleId),
        inArray(lessons.id, input.ids),
      ));
      if (rows.length !== input.ids.length) return Response.json({ error: "Lista de aulas inválida." }, { status: 400 });
      await Promise.all(input.ids.map((id, position) => db.update(lessons).set({ position, updatedAt: now }).where(eq(lessons.id, id))));
      return Response.json({ ok: true });
    }

    if (input.action === "module.upsert") {
      if (!(await courseExists(input.courseId))) return Response.json({ error: "Curso não encontrado." }, { status: 404 });
      const values = { courseId: input.courseId, title: input.title, description: input.description, status: input.status, position: input.position ?? 0, updatedAt: now };
      const [module] = input.id
        ? await db.update(courseModules).set(values).where(and(eq(courseModules.id, input.id), eq(courseModules.courseId, input.courseId))).returning()
        : await db.insert(courseModules).values(values).returning();
      if (!module) return Response.json({ error: "Módulo não encontrado." }, { status: 404 });
      return Response.json({ module }, { status: input.id ? 200 : 201 });
    }

    if (input.action === "lesson.upsert") {
      if (!(await courseExists(input.courseId))) return Response.json({ error: "Curso não encontrado." }, { status: 404 });
      let moduleTitle = "Conteúdo principal";
      if (input.moduleId) {
        const [module] = await db.select().from(courseModules).where(and(eq(courseModules.id, input.moduleId), eq(courseModules.courseId, input.courseId))).limit(1);
        if (!module) return Response.json({ error: "Módulo não encontrado neste curso." }, { status: 400 });
        moduleTitle = module.title;
      }
      const normalizedVideo = normalizeLessonSource(input.videoUrl);
      if (input.videoUrl && !normalizedVideo) return Response.json({ error: "Use um link HTTPS válido do YouTube, Vimeo ou Panda." }, { status: 400 });
      const values = {
        courseId: input.courseId, moduleId: input.moduleId, moduleTitle, title: input.title,
        description: input.description, videoKey: normalizedVideo || "", durationSeconds: input.durationSeconds,
        status: input.status, position: input.position ?? 0, updatedAt: now,
      };
      const [lesson] = input.id
        ? await db.update(lessons).set(values).where(and(eq(lessons.id, input.id), eq(lessons.courseId, input.courseId))).returning()
        : await db.insert(lessons).values(values).returning();
      if (!lesson) return Response.json({ error: "Aula não encontrada." }, { status: 404 });
      return Response.json({ lesson: { ...lesson, videoKey: undefined } }, { status: input.id ? 200 : 201 });
    }

    if (input.action === "material.upsert") {
      const [lesson] = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.id, input.lessonId)).limit(1);
      if (!lesson) return Response.json({ error: "Aula não encontrada." }, { status: 404 });
      const storageKey = input.kind === "file" && input.storageKey?.startsWith("materials/") ? input.storageKey : null;
      const externalUrl = input.kind === "link" && input.externalUrl ? normalizeMaterialUrl(input.externalUrl) : null;
      if ((input.kind === "file" && !storageKey) || (input.kind === "link" && !externalUrl)) {
        return Response.json({ error: input.kind === "file" ? "Arquivo inválido." : "Use um link HTTPS válido." }, { status: 400 });
      }
      const values = { lessonId: input.lessonId, title: input.title, kind: input.kind, storageKey, externalUrl, mimeType: input.mimeType, position: input.position ?? 0, status: input.status, updatedAt: now };
      const [material] = input.id
        ? await db.update(lessonMaterials).set(values).where(and(eq(lessonMaterials.id, input.id), eq(lessonMaterials.lessonId, input.lessonId))).returning()
        : await db.insert(lessonMaterials).values(values).returning();
      if (!material) return Response.json({ error: "Material não encontrado." }, { status: 404 });
      return Response.json({ material }, { status: input.id ? 200 : 201 });
    }

    const [review] = await db.update(lessonReviews).set({ status: input.status, updatedAt: now })
      .where(eq(lessonReviews.id, input.id)).returning();
    if (!review) return Response.json({ error: "Avaliação não encontrada." }, { status: 404 });
    return Response.json({ review });
  } catch (error) {
    console.error("admin:course-content failed", error);
    return Response.json({ error: "Não foi possível atualizar o conteúdo." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }
  try {
    const parsed = deleteAction.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Recurso inválido." }, { status: 400 });
    const db = getDb();
    if (parsed.data.resource === "module") {
      const [linkedLesson] = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.moduleId, parsed.data.id)).limit(1);
      if (linkedLesson) return Response.json({ error: "Mova ou exclua as aulas antes de excluir o módulo." }, { status: 409 });
      await db.delete(courseModules).where(eq(courseModules.id, parsed.data.id));
    } else if (parsed.data.resource === "lesson") {
      await db.delete(lessons).where(eq(lessons.id, parsed.data.id));
    } else {
      await db.delete(lessonMaterials).where(eq(lessonMaterials.id, parsed.data.id));
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("admin:course-content delete failed", error);
    return Response.json({ error: "Não foi possível excluir o conteúdo." }, { status: 500 });
  }
}
