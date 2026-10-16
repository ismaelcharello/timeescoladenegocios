import { revalidatePath } from "next/cache";
import { getRequestIdentity } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  calculateProfileCompleteness,
  getNetworkingProfileFieldErrors,
  isNetworkingProfileReady,
  profileFieldLabels,
  requiredProfileFields,
  type MemberProfileDraft,
  type RequiredProfileField,
  type SaveProfileResult,
} from "@/lib/member-profile";

type SaveProfileInput = {
  draft: Partial<MemberProfileDraft>;
  currentStep: number;
  finalize?: boolean;
};

const maxLengths = new Map<keyof MemberProfileDraft, number>([
  ["full_name", 160],
  ["whatsapp", 32],
  ["city", 120],
  ["state", 2],
  ["job_title", 140],
  ["company_name", 180],
  ["segment", 140],
  ["website_url", 500],
  ["instagram_url", 500],
  ["linkedin_url", 500],
]);

function cleanDraft(input: Partial<MemberProfileDraft>): MemberProfileDraft {
  return Object.fromEntries(
    Object.keys(profileFieldLabels).map((key) => {
      const field = key as keyof MemberProfileDraft;
      const value = input[field];
      const raw = typeof value === "string" ? value.trim() : "";
      const limit = maxLengths.get(field) ?? 4000;
      return [field, field === "state" ? raw.toUpperCase().slice(0, limit) : raw.slice(0, limit)];
    }),
  ) as MemberProfileDraft;
}

const requiredFieldsByStep: Record<number, readonly RequiredProfileField[]> = {
  1: ["full_name", "whatsapp", "city", "state"],
  2: ["job_title", "company_name", "segment"],
  3: ["company_description", "services", "target_audience"],
  4: ["offers", "looking_for", "desired_referrals"],
  5: requiredProfileFields,
};

function validateStep(draft: MemberProfileDraft, step: number, finalize: boolean) {
  const allErrors = getNetworkingProfileFieldErrors(draft);
  const fields = finalize ? requiredProfileFields : requiredFieldsByStep[step] ?? [];
  const errors: Partial<Record<keyof MemberProfileDraft, string>> = {};
  for (const field of fields) {
    if (allErrors[field]) errors[field] = allErrors[field];
  }
  return errors;
}

function json(result: SaveProfileResult, status = 200) {
  return Response.json(result, { status });
}

export async function saveMemberProfileRequest(request: Request) {
  const identity = await getRequestIdentity(request);
  const supabase = await createServerSupabaseClient();
  if (!identity || !supabase) return json({ ok: false, message: "Sua sessão expirou. Entre novamente." }, 401);

  let input: SaveProfileInput;
  try {
    input = (await request.json()) as SaveProfileInput;
  } catch {
    return json({ ok: false, message: "Os dados enviados são inválidos." }, 400);
  }

  const currentStep = Number.isInteger(input.currentStep) ? Math.min(5, Math.max(1, input.currentStep)) : 1;
  const finalize = input.finalize === true;
  const draft = cleanDraft(input.draft ?? {});
  const fieldErrors = validateStep(draft, currentStep, finalize);

  if (Object.keys(fieldErrors).length) {
    return json({ ok: false, message: "Revise os campos destacados para continuar.", fieldErrors }, 422);
  }

  const completeness = calculateProfileCompleteness(draft);
  const networkingReady = isNetworkingProfileReady(draft);
  if (finalize && !networkingReady) {
    return json({ ok: false, message: "Preencha os campos essenciais para concluir seu perfil.", fieldErrors: validateStep(draft, 5, true), completeness }, 422);
  }
  const payload = {
    user_id: identity.id,
    ...draft,
    avatar_path: draft.avatar_path || null,
    onboarding_step: finalize ? 5 : Math.min(5, currentStep + 1),
    profile_completeness: completeness,
    ...(!networkingReady ? { completed_at: null } : finalize ? { completed_at: new Date().toISOString() } : {}),
  };

  const { error } = await supabase.from("member_profiles").upsert(payload, { onConflict: "user_id" });
  if (error) {
    console.error("Unable to save member profile", { code: error.code });
    return json({ ok: false, message: "Não foi possível salvar agora. Tente novamente." }, 500);
  }

  revalidatePath("/app");
  revalidatePath("/app/cadastro");
  return json({
    ok: true,
    message: finalize ? "Perfil concluído com sucesso." : "Informações salvas.",
    completeness,
  });
}
