import MemberPlatform from "../member-platform";
import { requireMemberAccess } from "@/lib/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateProfileCompleteness, getMissingRequiredProfileFields, isNetworkingProfileReady, profileToDraft, type MemberProfile } from "@/lib/member-profile";
import { getSchoolStatus } from "@/lib/school-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comunidade | TIME Escola de Negócios" };

export default async function CommunityPage() {
  const access = await requireMemberAccess("/app/comunidade");
  const user = access.identity;
  const supabase = await createServerSupabaseClient();
  const { data: profile } = supabase ? await supabase.from("member_profiles").select("*").eq("user_id", user.id).maybeSingle() : { data: null };
  const draft = profileToDraft((profile as MemberProfile | null) ?? null, user.fullName);
  return <MemberPlatform schoolStatus={getSchoolStatus()} initialSection="comunidade" profileCompleteness={calculateProfileCompleteness(draft)} profileReady={isNetworkingProfileReady(draft)} missingFields={getMissingRequiredProfileFields(draft)} member={{ email: user.email, name: profile?.full_name || user.fullName || user.email.split("@")[0], isAdmin: user.isAdmin, accessLevel: access.level, accessStatus: access.status, permissions: access.permissions }} />;
}
