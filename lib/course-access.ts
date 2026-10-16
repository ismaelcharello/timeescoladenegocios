import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { courses, courseModules, lessons } from "@/db/schema";

/** Reused by lesson writes and legacy media reads; drafts are never member content. */
export async function publishedLessonExists(lessonId: number) {
  const [row] = await getDb().select({ id: lessons.id }).from(lessons)
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .leftJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(and(
      eq(lessons.id, lessonId), eq(lessons.status, "published"), eq(courses.status, "published"),
      or(isNull(lessons.moduleId), and(eq(courseModules.status, "published"), eq(courseModules.courseId, lessons.courseId))),
    )).limit(1);
  return Boolean(row);
}
