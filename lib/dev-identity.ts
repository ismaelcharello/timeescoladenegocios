import { cookies, headers } from "next/headers";
import type { RequestIdentity } from "@/lib/auth";

/**
 * Identidade de TESTE para o ambiente de desenvolvimento local.
 *
 * Existe para que a área interna possa ser exercitada logada sem a senha de
 * ninguém e sem criar conta no Supabase. Três travas independentes:
 *
 * 1. Quem chama só importa este módulo dentro de `if (import.meta.env.DEV)`.
 *    O Vite troca isso por `false` no build e o Rollup elimina o ramo e o
 *    módulo — conferido por teste que procura `__TIME_DEV_IDENTITY__` no bundle.
 * 2. O host da requisição precisa ser exatamente localhost/127.0.0.1/[::1].
 * 3. É preciso o cookie `time-dev-identity`, que só a rota /dev/login define.
 *
 * Não vale para o diretório de membros nem para member_profiles: esses dados
 * moram no Supabase remoto e dependem do JWT real. Localmente eles respondem
 * "Serviço indisponível", e isso é o comportamento correto, não um defeito.
 */
export const DEV_IDENTITY_MARKER = "__TIME_DEV_IDENTITY__";
export const DEV_IDENTITY_COOKIE = "time-dev-identity";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const DEV_IDENTITIES: Record<"membro" | "admin", RequestIdentity> = {
  membro: {
    id: "00000000-0000-4000-8000-0000000000a1",
    email: "membro.teste@time.local",
    fullName: "Membro Teste [DEMO]",
    role: "member",
    isAdmin: false,
    canManageEvents: false,
  },
  admin: {
    id: "00000000-0000-4000-8000-0000000000a2",
    email: "admin.teste@time.local",
    fullName: "Admin Teste [DEMO]",
    role: "admin",
    isAdmin: true,
    canManageEvents: true,
  },
};

export async function isLocalRequest(): Promise<boolean> {
  const host = (await headers()).get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  return LOCAL_HOSTS.has(host);
}

export async function getDevIdentity(): Promise<RequestIdentity | null> {
  if (!(await isLocalRequest())) return null;
  const choice = (await cookies()).get(DEV_IDENTITY_COOKIE)?.value;
  return choice === "membro" || choice === "admin" ? DEV_IDENTITIES[choice] : null;
}
