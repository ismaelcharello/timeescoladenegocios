import MemberPlatform from "../member-platform";
import { requireMemberAccess } from "@/lib/access";
import { loadMemberProfile } from "@/lib/member-profile-store";
import { calculateProfileCompleteness, getMissingEssentialProfileFields, isEssentialProfileReady, profileToDraft, type MemberProfile } from "@/lib/member-profile";
import { getSchoolStatus } from "@/lib/school-status";
import { getFeatureStatusMap } from "@/lib/feature-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Eventos | TIME Escola de Negócios" };

export default async function EventsPage() {
  const access = await requireMemberAccess("/app/eventos");
  const user = access.identity;
  const profile: MemberProfile | null = await loadMemberProfile(user.id);
  const draft = profileToDraft(profile, user.fullName);
  return <MemberPlatform schoolStatus={getSchoolStatus()} features={getFeatureStatusMap()} initialSection="agenda" profileCompleteness={calculateProfileCompleteness(draft)} profileReady={isEssentialProfileReady(draft)} missingFields={getMissingEssentialProfileFields(draft)} member={{ email: user.email, name: profile?.full_name || user.fullName || user.email.split("@")[0], isAdmin: user.isAdmin, accessLevel: access.level, accessStatus: access.status, permissions: access.permissions }} />;
}
