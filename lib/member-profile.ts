import type { Tables } from "@/lib/database.types";

export type MemberProfile = Tables<"member_profiles">;

export type MemberProfileDraft = {
  full_name: string;
  avatar_path: string;
  whatsapp: string;
  city: string;
  state: string;
  job_title: string;
  company_name: string;
  segment: string;
  website_url: string;
  instagram_url: string;
  linkedin_url: string;
  company_description: string;
  products: string;
  services: string;
  target_audience: string;
  service_area: string;
  differentiators: string;
  regions_served: string;
  offers: string;
  how_can_help: string;
  looking_for: string;
  desired_professionals: string;
  desired_referrals: string;
  company_problems: string;
  desired_partnerships: string;
};

export type SaveProfileResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<keyof MemberProfileDraft, string>>;
  completeness?: number;
};

export const profileFieldLabels: Record<keyof MemberProfileDraft, string> = {
  full_name: "nome completo",
  avatar_path: "foto",
  whatsapp: "WhatsApp",
  city: "cidade",
  state: "estado",
  job_title: "cargo",
  company_name: "empresa",
  segment: "segmento",
  website_url: "site",
  instagram_url: "Instagram",
  linkedin_url: "LinkedIn",
  company_description: "descrição da empresa",
  products: "produtos",
  services: "serviços",
  target_audience: "público atendido",
  service_area: "área de atuação",
  differentiators: "diferenciais",
  regions_served: "regiões atendidas",
  offers: "o que oferece",
  how_can_help: "como pode ajudar",
  looking_for: "o que procura",
  desired_professionals: "profissionais que deseja conhecer",
  desired_referrals: "indicações desejadas",
  company_problems: "problemas que precisa resolver",
  desired_partnerships: "parcerias desejadas",
};

export const completionFields: Array<keyof MemberProfileDraft> = [
  "avatar_path",
  "full_name",
  "whatsapp",
  "city",
  "state",
  "job_title",
  "company_name",
  "segment",
  "company_description",
  "products",
  "services",
  "target_audience",
  "service_area",
  "differentiators",
  "regions_served",
  "offers",
  "how_can_help",
  "looking_for",
  "desired_professionals",
  "desired_referrals",
  "company_problems",
  "desired_partnerships",
];

export const requiredProfileFields = [
  "full_name",
  "whatsapp",
  "city",
  "state",
  "job_title",
  "company_name",
  "segment",
  "company_description",
  "services",
  "target_audience",
  "offers",
  "looking_for",
  "desired_referrals",
] as const satisfies ReadonlyArray<keyof MemberProfileDraft>;

export type RequiredProfileField = typeof requiredProfileFields[number];

export function getNetworkingProfileFieldErrors(draft: MemberProfileDraft) {
  const errors: Partial<Record<RequiredProfileField, string>> = {};
  for (const field of requiredProfileFields) {
    const minimum = field === "full_name" ? 3 : 2;
    if (draft[field].trim().length < minimum) errors[field] = `Preencha ${profileFieldLabels[field]}.`;
  }
  if (draft.whatsapp.replace(/\D/g, "").length < 10) errors.whatsapp = "Informe um WhatsApp válido com DDD.";
  if (draft.state.trim().length !== 2) errors.state = "Selecione o estado.";
  return errors;
}

export function profileToDraft(
  profile: MemberProfile | null,
  fallbackName = "",
): MemberProfileDraft {
  return Object.fromEntries(
    Object.keys(profileFieldLabels).map((key) => {
      const field = key as keyof MemberProfileDraft;
      if (field === "full_name") return [field, profile?.full_name ?? fallbackName];
      return [field, profile?.[field] ?? ""];
    }),
  ) as MemberProfileDraft;
}

export function calculateProfileCompleteness(draft: MemberProfileDraft) {
  const completed = completionFields.filter((field) => draft[field].trim()).length;
  return Math.round((completed / completionFields.length) * 100);
}

export function getMissingProfileFields(draft: MemberProfileDraft) {
  return completionFields.filter((field) => !draft[field].trim()).map((field) => profileFieldLabels[field]);
}

export function getMissingRequiredProfileFields(draft: MemberProfileDraft) {
  const errors = getNetworkingProfileFieldErrors(draft);
  return requiredProfileFields
    .filter((field) => Boolean(errors[field]))
    .map((field) => profileFieldLabels[field]);
}

export function isNetworkingProfileReady(draft: MemberProfileDraft) {
  return getMissingRequiredProfileFields(draft).length === 0;
}
