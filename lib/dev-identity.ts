import { cookies, headers } from "next/headers";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
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

export type DevIdentityKey = "membro" | "novato" | "admin";

export const DEV_IDENTITIES: Record<DevIdentityKey, RequestIdentity> = {
  membro: {
    id: "00000000-0000-4000-8000-0000000000a1",
    email: "membro.teste@time.local",
    fullName: "Membro Teste [DEMO]",
    role: "member",
    isAdmin: false,
    canManageEvents: false,
  },
  // Membro ativo SEM perfil: para testar as portas que dependem do cadastro.
  novato: {
    id: "00000000-0000-4000-8000-0000000000a3",
    email: "novato.teste@time.local",
    fullName: "Novato Teste [DEMO]",
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

let membersReady = false;

/** Os membros de teste precisam de linha em `members` com acesso ativo (D1 local). */
async function ensureDevMembers() {
  if (membersReady) return;
  membersReady = true;
  for (const key of ["membro", "novato"] as const) {
    const who = DEV_IDENTITIES[key];
    await getDb().run(
      sql`INSERT OR IGNORE INTO members (email, full_name, access_status) VALUES (${who.email}, ${who.fullName}, 'active')`,
    );
  }
}

export async function getDevIdentity(): Promise<RequestIdentity | null> {
  if (!(await isLocalRequest())) return null;
  const choice = (await cookies()).get(DEV_IDENTITY_COOKIE)?.value;
  if (choice !== "membro" && choice !== "novato" && choice !== "admin") return null;
  await ensureDevMembers();
  return DEV_IDENTITIES[choice];
}
