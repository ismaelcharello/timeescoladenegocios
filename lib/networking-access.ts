import { redirect } from "next/navigation";
import { getAuthorizedMember, requireMemberAccess } from "@/lib/access";
import { isEssentialProfileReady, profileToDraft } from "@/lib/member-profile";
import { loadMemberProfile } from "@/lib/member-profile-store";

async function hasNetworkingProfile(user: { id: string; fullName: string; isAdmin: boolean }) {
  if (user.isAdmin) return true;
  const data = await loadMemberProfile(user.id);
  if (!data) return false;
  return isEssentialProfileReady(profileToDraft(data, user.fullName));
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
