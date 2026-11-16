import { requireUser } from "@/lib/auth";
import { loadMemberProfile } from "@/lib/member-profile-store";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { MemberProfile } from "@/lib/member-profile";
import OnboardingForm from "./onboarding-form";
import "./onboarding.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Complete seu perfil | TIME Escola de Negócios",
  description: "Cadastre seu perfil empresarial para receber conexões mais relevantes.",
};

export default async function MemberOnboardingPage() {
  const user = await requireUser("/app/cadastro");
  const supabaseConfig = getSupabasePublicConfig();
  const data = await loadMemberProfile(user.id);

  return (
    <OnboardingForm
      user={{ id: user.id, email: user.email, name: user.fullName }}
      initialProfile={(data as MemberProfile | null) ?? null}
      supabaseConfig={supabaseConfig}
    />
  );
}
