import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  communityPosts,
  courseModules,
  courses,
  lessonMaterials,
  lessonReviews,
  lessons,
  memberProgress,
  members,
} from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import { isExternalVideoUrl } from "@/lib/video-hosting";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  try {
    const db = getDb();
    const [
      memberRows,
      courseRows,
      lessonRows,
      moduleRows,
      materialRows,
      lessonReviewRows,
      progressByMember,
      progressByCourse,
      postRows,
      [memberStats],
      [communityStats],
      [learningStats],
    ] = await Promise.all([
      db.select().from(members).orderBy(desc(members.updatedAt)).limit(100),
      db.select().from(courses).orderBy(desc(courses.updatedAt)),
      db.select().from(lessons).orderBy(lessons.courseId, lessons.position),
      db.select().from(courseModules).orderBy(courseModules.courseId, courseModules.position),
      db.select().from(lessonMaterials).orderBy(lessonMaterials.lessonId, lessonMaterials.position),
      db.select({
        id: lessonReviews.id,
        lessonId: lessonReviews.lessonId,
        memberEmail: lessonReviews.memberEmail,
        authorName: members.fullName,
        rating: lessonReviews.rating,
        comment: lessonReviews.comment,
        status: lessonReviews.status,
        updatedAt: lessonReviews.updatedAt,
      }).from(lessonReviews).leftJoin(members, eq(members.email, lessonReviews.memberEmail)).orderBy(desc(lessonReviews.updatedAt)),
      db
        .select({
          memberEmail: memberProgress.memberEmail,
          watchSeconds: sql<number>`coalesce(sum(${memberProgress.watchSeconds}), 0)`,
          completedLessons: sql<number>`coalesce(sum(case when ${memberProgress.completed} = 1 then 1 else 0 end), 0)`,
        })
        .from(memberProgress)
        .groupBy(memberProgress.memberEmail),
      db
        .select({
          courseId: lessons.courseId,
          startedMembers: sql<number>`count(distinct ${memberProgress.memberEmail})`,
          completedLessons: sql<number>`coalesce(sum(case when ${memberProgress.completed} = 1 then 1 else 0 end), 0)`,
        })
        .from(lessons)
        .leftJoin(memberProgress, eq(memberProgress.lessonId, lessons.id))
        .groupBy(lessons.courseId),
      db.select().from(communityPosts).orderBy(desc(communityPosts.createdAt)).limit(20),
      db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`coalesce(sum(case when ${members.accessStatus} in ('active','complimentary') then 1 else 0 end), 0)`,
          attention: sql<number>`coalesce(sum(case when ${members.accessStatus} in ('past_due','blocked') then 1 else 0 end), 0)`,
        })
        .from(members),
      db
        .select({
          published: sql<number>`coalesce(sum(case when ${communityPosts.status} = 'published' then 1 else 0 end), 0)`,
          pending: sql<number>`coalesce(sum(case when ${communityPosts.status} = 'pending' then 1 else 0 end), 0)`,
          interactions: sql<number>`coalesce(sum(${communityPosts.likesCount} + ${communityPosts.commentsCount}), 0)`,
        })
        .from(communityPosts),
      db
        .select({
          watchSeconds: sql<number>`coalesce(sum(${memberProgress.watchSeconds}), 0)`,
          completedLessons: sql<number>`coalesce(sum(case when ${memberProgress.completed} = 1 then 1 else 0 end), 0)`,
        })
        .from(memberProgress),
    ]);

    const progressMap = new Map(progressByMember.map((row) => [row.memberEmail, row]));
    const courseProgressMap = new Map(progressByCourse.map((row) => [row.courseId, row]));
    const responseCourses = courseRows.map((course) => {
      const courseLessons = lessonRows.filter((lesson) => lesson.courseId === course.id);
      const courseModulesForCourse = moduleRows
        .filter((module) => module.courseId === course.id)
        .map((module) => ({
          ...module,
          lessonCount: courseLessons.filter((lesson) => lesson.moduleId === module.id).length,
        }));
      const progress = courseProgressMap.get(course.id);
      return {
        ...course,
        modules: courseModulesForCourse,
        lessonCount: courseLessons.length,
        lessons: courseLessons.map((lesson) => ({
          ...lesson,
          videoUrl: lesson.videoKey
            ? isExternalVideoUrl(lesson.videoKey)
              ? lesson.videoKey
              : `/api/uploads?key=${encodeURIComponent(lesson.videoKey)}`
            : "",
          materials: materialRows.filter((material) => material.lessonId === lesson.id),
          reviews: lessonReviewRows.filter((review) => review.lessonId === lesson.id),
        })),
        startedMembers: Number(progress?.startedMembers ?? 0),
        completedLessons: Number(progress?.completedLessons ?? 0),
      };
    });

    return Response.json({
      stats: {
        members: Number(memberStats?.total ?? 0),
        activeMembers: Number(memberStats?.active ?? 0),
        attentionMembers: Number(memberStats?.attention ?? 0),
        watchSeconds: Number(learningStats?.watchSeconds ?? 0),
        completedLessons: Number(learningStats?.completedLessons ?? 0),
        publishedCourses: courseRows.filter((course) => course.status === "published").length,
        draftCourses: courseRows.filter((course) => course.status === "draft").length,
      },
      members: memberRows.map((member) => ({
        ...member,
        watchSeconds: Number(progressMap.get(member.email)?.watchSeconds ?? 0),
        completedLessons: Number(progressMap.get(member.email)?.completedLessons ?? 0),
      })),
      courses: responseCourses,
      community: {
        published: Number(communityStats?.published ?? 0),
        pending: Number(communityStats?.pending ?? 0),
        interactions: Number(communityStats?.interactions ?? 0),
        posts: postRows,
      },
      tutor: {
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        model: process.env.OPENAI_TUTOR_MODEL || "gpt-5.6-sol",
        publishedCourses: responseCourses.filter((course) => course.status === "published").length,
        authorizedLessons: responseCourses
          .filter((course) => course.status === "published")
          .reduce((total, course) => total + course.lessonCount, 0),
        describedLessons: responseCourses
          .filter((course) => course.status === "published")
          .flatMap((course) => course.lessons)
          .filter((lesson) => lesson.description.trim().length > 0).length,
      },
    });
  } catch (error) {
    console.error("admin:overview failed", error);
    return Response.json({ error: "Não foi possível carregar os dados reais da plataforma." }, { status: 500 });
  }
}
