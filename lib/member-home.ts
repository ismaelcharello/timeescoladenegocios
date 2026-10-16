import type { MemberProfileDraft } from "@/lib/member-profile";

type HomeCourse = {
  progressPercent: number;
  startedLessons: number;
  locked?: boolean;
};

type HomeEvent = {
  startsAt: string;
  status: string;
};

type HomePost = {
  category: string;
  createdAt: string;
};

export function buildHomeConnectionQuery(profile: MemberProfileDraft) {
  return [
    profile.looking_for,
    profile.company_problems,
    profile.desired_professionals,
    profile.desired_partnerships,
  ].map((value) => value.trim()).filter(Boolean).join(" ").slice(0, 180);
}

export function selectHomeCourse<T extends HomeCourse>(courses: T[]) {
  return courses.find((course) => course.startedLessons > 0 && course.progressPercent < 100)
    ?? courses.find((course) => !course.locked)
    ?? courses[0]
    ?? null;
}

export function selectNextEvent<T extends HomeEvent>(events: T[], now = Date.now()) {
  return [...events]
    .filter((event) => event.status === "published" && Date.parse(event.startsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0]
    ?? null;
}

export function selectHomePosts<T extends HomePost>(posts: T[]) {
  const priority = new Set(["opportunity", "offer", "news"]);
  return [...posts]
    .filter((post) => priority.has(post.category))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 3);
}

export function getHomeGreeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date));
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

export function getHomeDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date).toUpperCase();
}
