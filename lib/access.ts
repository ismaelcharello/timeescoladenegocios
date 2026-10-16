import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { memberEntitlements, members, subscriptions } from "@/db/schema";
import { getAuthenticatedIdentity, type RequestIdentity } from "@/lib/auth";
import { safeReturnPath } from "@/lib/auth-redirect";
import { canAccessResource, resolveMemberAccess, type MemberAccess, type MemberResource } from "@/lib/access-policy";
export { canAccessResource } from "@/lib/access-policy";
export type { MemberAccessLevel, MemberResource } from "@/lib/access-policy";

export async function getMemberAccess(request?: Request): Promise<MemberAccess | null> {
  const identity = await getAuthenticatedIdentity(request);
  if (!identity) return null;
  const [memberRows, entitlementRows, subscriptionRows] = await Promise.all([
    getDb().select({ accessStatus: members.accessStatus, accessExpiresAt: members.accessExpiresAt, authUserId: members.authUserId }).from(members).where(eq(members.email, identity.email)).limit(1),
    getDb().select().from(memberEntitlements).where(eq(memberEntitlements.memberEmail, identity.email)),
    getDb().select().from(subscriptions).where(eq(subscriptions.memberEmail, identity.email)),
  ]);
  return resolveMemberAccess(identity, memberRows[0], entitlementRows, subscriptionRows);
}

export async function getAuthorizedMember(
  request: Request | undefined,
  resource: MemberResource,
): Promise<RequestIdentity | null> {
  const access = await getMemberAccess(request);
  return access && canAccessResource(access, resource) ? access.identity : null;
}

export async function requireMemberAccess(returnTo: string, resource?: MemberResource): Promise<MemberAccess> {
  const access = await getMemberAccess();
  if (!access) redirect(`/entrar?retorno=${encodeURIComponent(safeReturnPath(returnTo))}&mensagem=sessao_necessaria`);
  if (resource && !canAccessResource(access, resource)) redirect("/app?acesso=associacao_necessaria");
  return access;
}
