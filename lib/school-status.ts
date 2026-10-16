import "server-only";

export type SchoolStatus = "active" | "coming_soon";

export function getSchoolStatus(): SchoolStatus {
  return process.env.SCHOOL_STATUS === "coming_soon" ? "coming_soon" : "active";
}

export function isSchoolComingSoon() {
  return getSchoolStatus() === "coming_soon";
}
