import MemberPlatform from "../member-platform";
import { requireMemberAccess } from "@/lib/access";
import { loadMemberProfile } from "@/lib/member-profile-store";
import { calculateProfileCompleteness, getMissingEssentialProfileFields, isEssentialProfileReady, profileToDraft, type MemberProfile } from "@/lib/member-profile";
import { getSchoolStatus } from "@/lib/school-status";
import { getFeatureStatusMap } from "@/lib/feature-status";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cursos | TIME Escola de Negócios",
  description: "Cursos e progresso real da sua jornada TIME.",
};

export default async function CoursesPage() {
  const access = await requireMemberAccess("/app/cursos");
  const user = access.identity;
  const profile = await loadMemberProfile(user.id);

  const typedProfile: MemberProfile | null = profile;
  const draft = profileToDraft(typedProfile, user.fullName);
  return <MemberPlatform schoolStatus={getSchoolStatus()} features={getFeatureStatusMap()} initialSection="cursos" profileCompleteness={calculateProfileCompleteness(draft)} profileReady={isEssentialProfileReady(draft)} missingFields={getMissingEssentialProfileFields(draft)} member={{ email: user.email, name: profile?.full_name || user.fullName || user.email.split("@")[0], isAdmin: user.isAdmin, accessLevel: access.level, accessStatus: access.status, permissions: access.permissions }} />;
}
