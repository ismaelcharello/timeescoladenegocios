import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { courseModules, courseReviews, courses, lessonReviews, lessons, memberProgress } from "@/db/schema";
import { canAccessResource, getMemberAccess } from "@/lib/access";
import { isAdminRequest } from "@/lib/auth";
import { normalizeExternalVideoUrl } from "@/lib/video-hosting";
import { presentLesson } from "@/lib/course-presentation";
import { isSchoolComingSoon } from "@/lib/school-status";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function GET(request: Request) {
  try {
    const access = await getMemberAccess(request);
    const identity = access?.identity;
    const admin = access?.level === "admin";
    if (!identity) {
      return Response.json({ error: "Entre para acessar os cursos." }, { status: 401 });
    }
    if (!admin && isSchoolComingSoon()) {
      return Response.json({ courses: [], status: "coming_soon" }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const canAccessLessons = canAccessResource(access, "courses");

    const db = getDb();
    const rows = admin
      ? await db.select().from(courses).orderBy(asc(courses.position), desc(courses.updatedAt))
      : await db.select().from(courses).where(eq(courses.status, "published")).orderBy(asc(courses.position), desc(courses.updatedAt));
    const courseIds = rows.map((course) => course.id);
    if (!courseIds.length) return Response.json({ courses: [] });

    const [lessonRows, moduleRows, reviewRows, lessonReviewRows, progressRows] = await Promise.all([
      db.select().from(lessons).where(inArray(lessons.courseId, courseIds)).orderBy(asc(lessons.position)),
      db.select().from(courseModules).where(inArray(courseModules.courseId, courseIds)).orderBy(asc(courseModules.position)),
      db.select().from(courseReviews).where(inArray(courseReviews.courseId, courseIds)),
      db.select({ courseId: lessons.courseId, rating: lessonReviews.rating })
        .from(lessonReviews)
        .innerJoin(lessons, eq(lessons.id, lessonReviews.lessonId))
        .where(and(inArray(lessons.courseId, courseIds), eq(lessonReviews.status, "published"))),
      admin
        ? Promise.resolve([])
        : canAccessLessons ? db.select().from(memberProgress).where(eq(memberProgress.memberEmail, identity.email)) : Promise.resolve([]),
    ]);

    const progressByLesson = new Map(progressRows.map((progress) => [progress.lessonId, progress]));
    const responseRows = rows.map((course) => {
      const courseLessons = lessonRows
        .filter((lesson) => lesson.courseId === course.id && (admin || (lesson.status === "published" && (lesson.moduleId === null || moduleRows.some((module) => module.id === lesson.moduleId && module.courseId === course.id && module.status === "published")))))
        .map((lesson) => presentLesson(lesson, canAccessLessons, progressByLesson.get(lesson.id)));
      const reviews = [
        ...reviewRows.filter((review) => review.courseId === course.id).map((review) => review.rating),
        ...lessonReviewRows.filter((review) => review.courseId === course.id).map((review) => review.rating),
      ];
      const persistedModules = moduleRows
        .filter((module) => module.courseId === course.id && (admin || module.status === "published"))
        .map((module) => ({
          id: module.id, title: module.title, position: module.position,
          description: canAccessLessons ? module.description : "",
          lessons: courseLessons.filter((lesson) => lesson.moduleId === module.id),
        }));
      const legacyModules = courseLessons
        .filter((lesson) => !lesson.moduleId)
        .reduce<Array<{ id: string; title: string; description: string; position: number; lessons: typeof courseLessons }>>((groups, lesson) => {
          const existing = groups.find((group) => group.title === lesson.moduleTitle);
          if (existing) existing.lessons.push(lesson);
          else groups.push({
            id: `legacy-${course.id}-${lesson.moduleTitle}`,
            title: lesson.moduleTitle || "Conteúdo principal",
            description: "",
            position: groups.length,
            lessons: [lesson],
          });
          return groups;
        }, []);
      const completedLessons = courseLessons.filter((lesson) => lesson.progress?.completed).length;
      const startedLessons = courseLessons.filter((lesson) => lesson.progress?.startedAt || lesson.progress?.watchSeconds || lesson.progress?.completed).length;
      return {
        ...course,
        lessons: courseLessons,
        modules: [...persistedModules, ...legacyModules],
        lessonCount: courseLessons.length,
        completedLessons,
        startedLessons,
        progressPercent: courseLessons.length
          ? Math.round((completedLessons / courseLessons.length) * 100)
          : 0,
        reviewCount: reviews.length,
        averageRating: reviews.length
          ? Math.round((reviews.reduce((total, rating) => total + rating, 0) / reviews.length) * 10) / 10
          : null,
        locked: !canAccessLessons,
      };
    });
    return Response.json({ courses: responseRows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("courses:get failed", error);
    return Response.json(
      { error: "Não foi possível listar os cursos agora." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      id?: number;
      title?: string;
      description?: string;
      teacher?: string;
      category?: string;
      thumbnailUrl?: string;
      videoKey?: string;
      externalVideoUrl?: string;
      lessonTitle?: string;
      lessonDescription?: string;
      moduleId?: number;
      moduleTitle?: string;
      moduleDescription?: string;
      createModule?: boolean;
      durationSeconds?: number;
      status?: "draft" | "published" | "archived";
      position?: number;
    };
    const title = payload.title?.trim() ?? "";
    const externalVideoUrl = payload.externalVideoUrl?.trim()
      ? normalizeExternalVideoUrl(payload.externalVideoUrl)
      : null;

    if (!title) {
      return Response.json({ error: "Informe o nome do curso." }, { status: 400 });
    }
    if (payload.externalVideoUrl?.trim() && !externalVideoUrl) {
      return Response.json({ error: "Use um link HTTPS válido do YouTube, Vimeo ou Panda." }, { status: 400 });
    }
    const lessonVideoSource = externalVideoUrl ?? payload.videoKey?.trim() ?? "";

    const db = getDb();
    const existing = payload.id
      ? (await db.select().from(courses).where(eq(courses.id, payload.id)).limit(1))[0]
      : null;
    if (payload.id && !existing) {
      return Response.json({ error: "Curso não encontrado." }, { status: 404 });
    }

    const thumbnailUrl = payload.thumbnailUrl?.trim() ?? existing?.thumbnailUrl ?? "";
    const status = payload.status ?? (existing?.status ?? "draft" as const);
    if (status === "published" && !thumbnailUrl) {
      return Response.json({ error: "Envie uma thumbnail antes de publicar o curso." }, { status: 400 });
    }

    const values = {
      title,
      slug: existing?.slug ?? `${slugify(title) || "curso"}-${crypto.randomUUID().slice(0, 8)}`,
      description: payload.description?.trim() ?? "",
      teacher: payload.teacher?.trim() ?? "",
      category: payload.category?.trim() ?? "negocios",
      thumbnailUrl,
      position: Math.max(0, Math.floor(payload.position ?? existing?.position ?? 0)),
      status,
      updatedAt: new Date().toISOString(),
    };

    async function resolveModule(courseId: number) {
      if (payload.moduleId) {
        const [courseModule] = await db
          .select()
          .from(courseModules)
          .where(and(eq(courseModules.id, payload.moduleId), eq(courseModules.courseId, courseId)))
          .limit(1);
        if (!courseModule) throw new Error("Módulo não encontrado neste curso.");
        return courseModule;
      }
      const title = payload.moduleTitle?.trim();
      if (!title) return null;
      const [existingModule] = await db
        .select()
        .from(courseModules)
        .where(and(eq(courseModules.courseId, courseId), eq(courseModules.title, title)))
        .limit(1);
      if (existingModule) return existingModule;
      const currentModules = await db
        .select({ id: courseModules.id })
        .from(courseModules)
        .where(eq(courseModules.courseId, courseId));
      const [createdModule] = await db.insert(courseModules).values({
        courseId,
        title,
        description: payload.moduleDescription?.trim() ?? "",
        position: currentModules.length + 1,
      }).returning();
      return createdModule;
    }

    async function addLesson(courseId: number) {
      if (!lessonVideoSource) return;
      if (!payload.lessonTitle?.trim()) throw new Error("Informe o nome da aula para salvar o vídeo.");
      const courseModule = await resolveModule(courseId);
      const courseLessonCount = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, courseId));
      await db.insert(lessons).values({
        courseId,
        moduleId: courseModule?.id ?? null,
        moduleTitle: courseModule?.title ?? (payload.moduleTitle?.trim() || "Conteúdo principal"),
        title: payload.lessonTitle.trim(),
        description: payload.lessonDescription?.trim() ?? "",
        videoKey: lessonVideoSource,
        durationSeconds: Math.max(0, Math.floor(payload.durationSeconds ?? 0)),
        status: "published",
        position: Math.max(1, courseLessonCount.length + 1),
      });
    }

    if (payload.id) {
      const [course] = await db
        .update(courses)
        .set(values)
        .where(eq(courses.id, payload.id))
        .returning();
      if (course && (payload.createModule || lessonVideoSource)) {
        const courseModule = await resolveModule(course.id);
        if (lessonVideoSource) await addLesson(course.id);
        if (!courseModule && payload.createModule) {
          return Response.json({ error: "Informe o nome do módulo." }, { status: 400 });
        }
      }
      return Response.json({ course });
    }

    const [course] = await db.insert(courses).values(values).returning();
    if (payload.createModule || lessonVideoSource) {
      const courseModule = await resolveModule(course.id);
      if (lessonVideoSource) await addLesson(course.id);
      if (!courseModule && payload.createModule) {
        return Response.json({ error: "Informe o nome do módulo." }, { status: 400 });
      }
    }
    return Response.json({ course }, { status: 201 });
  } catch (error) {
    console.error("courses:save failed", error);
    return Response.json(
      { error: "Não foi possível salvar o curso agora." },
      { status: 500 },
    );
  }
}
