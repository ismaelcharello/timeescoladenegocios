import type { lessons, memberProgress } from "../db/schema";
import { isExternalVideoUrl } from "./video-hosting";

/** Allowlist: never spread a database lesson into a client response. */
export function presentLesson(
  lesson: typeof lessons.$inferSelect,
  canRead: boolean,
  progress?: typeof memberProgress.$inferSelect,
) {
  const videoUrl = lesson.videoKey
    ? isExternalVideoUrl(lesson.videoKey)
      ? lesson.videoKey
      : `/api/uploads?key=${encodeURIComponent(lesson.videoKey)}`
    : "";

  return {
    id: lesson.id, courseId: lesson.courseId, moduleId: lesson.moduleId,
    moduleTitle: lesson.moduleTitle, title: lesson.title,
    durationSeconds: lesson.durationSeconds, position: lesson.position, isPreview: lesson.isPreview,
    description: lesson.description,
    ...(canRead ? { videoUrl } : {}),
    progress: canRead && progress ? {
      lessonId: progress.lessonId, watchSeconds: progress.watchSeconds,
      completed: progress.completed, startedAt: progress.startedAt, updatedAt: progress.updatedAt,
    } : null,
  };
}
