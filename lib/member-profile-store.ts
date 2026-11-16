import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MemberProfile } from "@/lib/member-profile";

/**
 * Ponto ÚNICO de leitura e escrita do perfil do membro.
 *
 * Antes, seis telas repetiam `supabase.from("member_profiles")…maybeSingle()`.
 * Centralizar permite uma coisa que não existia: no dev local, com a identidade
 * de teste, o perfil vem do substituto local (lib/dev-directory.ts), e então
 * cadastro, match e diretório podem ser exercitados logados. Em produção o
 * caminho é o mesmo de sempre: Supabase com o JWT do membro.
 */
async function devStore() {
  // Tudo DENTRO do `if` constante: o Rollup elimina o bloco inteiro no build.
  // Com `if (!DEV) return null` e o import depois do return, o módulo vazava
  // para o bundle de produção — o teste de segurança pegou.
  if (import.meta.env.DEV) {
    const { getDevIdentity } = await import("@/lib/dev-identity");
    if (await getDevIdentity()) return import("@/lib/dev-directory");
  }
  return null;
}

export async function loadMemberProfile(userId: string): Promise<MemberProfile | null> {
  const dev = await devStore();
  if (dev) return dev.getDevProfile(userId);

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("member_profiles").select("*").eq("user_id", userId).maybeSingle();
  return error ? null : ((data as MemberProfile | null) ?? null);
}

export async function saveMemberProfile(
  userId: string,
  payload: Partial<MemberProfile> & { user_id: string },
): Promise<{ error: { code?: string } | null; unavailable?: boolean }> {
  const dev = await devStore();
  if (dev) {
    await dev.saveDevProfile(userId, payload);
    return { error: null };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: null, unavailable: true };
  const { error } = await supabase.from("member_profiles").upsert(payload, { onConflict: "user_id" });
  return { error: error ? { code: error.code } : null };
}
