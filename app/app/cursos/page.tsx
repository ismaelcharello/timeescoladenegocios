import MemberPlatform from "../member-platform";
import { requireMemberAccess } from "@/lib/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateProfileCompleteness, getMissingRequiredProfileFields, isNetworkingProfileReady, profileToDraft, type MemberProfile } from "@/lib/member-profile";
import { getSchoolStatus } from "@/lib/school-status";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cursos | TIME Escola de Negócios",
  description: "Cursos e progresso real da sua jornada TIME.",
};

export default async function CoursesPage() {
  const access = await requireMemberAccess("/app/cursos");
  const user = access.identity;
  const supabase = await createServerSupabaseClient();
  const { data: profile } = supabase
    ? await supabase
        .from("member_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const typedProfile = (profile as MemberProfile | null) ?? null;
  const draft = profileToDraft(typedProfile, user.fullName);
  return <MemberPlatform schoolStatus={getSchoolStatus()} initialSection="cursos" profileCompleteness={calculateProfileCompleteness(draft)} profileReady={isNetworkingProfileReady(draft)} missingFields={getMissingRequiredProfileFields(draft)} member={{ email: user.email, name: profile?.full_name || user.fullName || user.email.split("@")[0], isAdmin: user.isAdmin, accessLevel: access.level, accessStatus: access.status, permissions: access.permissions }} />;
}
