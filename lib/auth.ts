import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/auth-redirect";
import { getMemberAccess } from "@/lib/access";

export type RequestIdentity = {
  id: string;
  email: string;
  fullName: string;
  role: "member" | "support" | "coordinator" | "admin" | "super_admin";
  isAdmin: boolean;
  canManageEvents: boolean;
};

/** Internal authentication input. Product callers use getRequestIdentity/access guards. */
export async function getAuthenticatedIdentity(
  _request?: Request,
): Promise<RequestIdentity | null> {
  void _request;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user?.email) return null;

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";

  // A role é consultada no banco com RLS. Nunca derive autorização do e-mail
  // ou de user_metadata, pois ambos podem mudar fora da política da aplicação.
  const { data: role } = await supabase
    .from("app_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const appRole = role?.role === "super_admin" || role?.role === "superadmin"
    ? "super_admin"
    : role?.role === "admin" || role?.role === "coordinator"
      ? role.role
      : role?.role === "support"
        ? "support"
        : "member";

  return {
    id: user.id,
    email: user.email.trim().toLowerCase(),
    fullName,
    role: appRole,
    isAdmin: appRole === "admin" || appRole === "super_admin",
    canManageEvents: appRole === "super_admin" || appRole === "admin" || appRole === "coordinator",
  };
}

export async function getRequestIdentity(request?: Request): Promise<RequestIdentity | null> {
  return (await getMemberAccess(request))?.identity ?? null;
}

export async function isAdminRequest(request?: Request) {
  const identity = await getRequestIdentity(request);
  return Boolean(identity?.isAdmin);
}

/** Permissão mínima para presença e convidados: não concede o painel inteiro. */
export async function isEventManagerRequest(request?: Request) {
  const identity = await getRequestIdentity(request);
  return Boolean(identity?.canManageEvents);
}

export async function requireUser(returnTo = "/app") {
  const identity = await getRequestIdentity();
  if (identity) return identity;

  const safeReturnTo = safeReturnPath(returnTo);
  redirect(`/entrar?retorno=${encodeURIComponent(safeReturnTo)}&mensagem=sessao_necessaria`);
}
