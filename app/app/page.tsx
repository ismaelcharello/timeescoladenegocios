import MemberPlatform from "./member-platform";
import { requireMemberAccess } from "@/lib/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateProfileCompleteness, getMissingRequiredProfileFields, isNetworkingProfileReady, profileToDraft, type MemberProfile } from "@/lib/member-profile";
import { buildHomeConnectionQuery, getHomeDateLabel, getHomeGreeting } from "@/lib/member-home";
import { findConnections } from "@/lib/connection-matching";
import { getSchoolStatus } from "@/lib/school-status";
import { SPA_SECTIONS } from "./member-nav";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Minha TIME | Área de membros",
  description: "Cursos, conexões e experiências da TIME Escola de Negócios.",
};

const DEEP_LINK_SECTIONS = ["podcasts", "tutor", "conquistas"] as const;

export default async function MemberAreaPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const requested = (await searchParams)?.secao;
  const initialSection = DEEP_LINK_SECTIONS.find((id) => id === requested && SPA_SECTIONS.has(id));
  const access = await requireMemberAccess("/app");
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
  const profileCompleteness = calculateProfileCompleteness(draft);
  const networkingProfileReady = user.isAdmin || isNetworkingProfileReady(draft);
  const connectionQuery = buildHomeConnectionQuery(draft);
  const canLoadConnections = access.permissions.includes("networking") && networkingProfileReady && Boolean(connectionQuery);
  const connectionResult = canLoadConnections
    ? await findConnections(connectionQuery)
    : { matches: [], error: "" };
  const homeConnections = connectionResult.matches
    .filter((match) => match.user_id !== user.id)
    .slice(0, 3)
    .map((match) => ({
      userId: match.user_id,
      name: match.full_name,
      avatarUrl: match.avatar_url ?? null,
      company: match.company_name,
      jobTitle: match.job_title,
      segment: match.segment,
      reason: match.reason,
    }));

  return <MemberPlatform
    initialSection={initialSection}
    schoolStatus={getSchoolStatus()}
    profileCompleteness={profileCompleteness}
    profileReady={networkingProfileReady}
    missingFields={getMissingRequiredProfileFields(draft)}
    homeConnections={homeConnections}
    homeConnectionsError={connectionResult.error}
    greeting={getHomeGreeting()}
    todayLabel={getHomeDateLabel()}
    member={{ email: user.email, name: profile?.full_name || user.fullName || user.email.split("@")[0], isAdmin: user.isAdmin, accessLevel: access.level, accessStatus: access.status, permissions: access.permissions }}
  />;
}
