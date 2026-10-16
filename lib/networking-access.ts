import { redirect } from "next/navigation";
import { getAuthorizedMember, requireMemberAccess } from "@/lib/access";
import { isNetworkingProfileReady, profileToDraft, type MemberProfile } from "@/lib/member-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function hasNetworkingProfile(user: { id: string; fullName: string; isAdmin: boolean }) {
  if (user.isAdmin) return true;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("member_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return false;
  return isNetworkingProfileReady(profileToDraft(data as MemberProfile, user.fullName));
}

export async function getNetworkingMember(request?: Request) {
  const user = await getAuthorizedMember(request, "networking");
  if (!user || !(await hasNetworkingProfile(user))) return null;
  return user;
}

export async function requireNetworkingAccess(returnTo: string) {
  const access = await requireMemberAccess(returnTo, "networking");
  if (!(await hasNetworkingProfile(access.identity))) {
    redirect(`/app/cadastro?retorno=${encodeURIComponent(returnTo)}&mensagem=perfil_necessario`);
  }
  return access;
}
