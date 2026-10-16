import type { RequestIdentity } from "./auth";

export type MemberAccessLevel = "registered" | "active" | "complimentary" | "admin";
export const MEMBER_RESOURCES = ["courses", "networking", "community", "events", "podcasts", "benefits", "ombudsman"] as const;
export type MemberResource = typeof MEMBER_RESOURCES[number];
export const ACCESS_KEYS = ["all_courses", "membership"] as const;
export type AccessKey = typeof ACCESS_KEYS[number];
export const TIME_MEMBERSHIP_ACCESS_KEY: AccessKey = "membership";
type MemberRecord = { accessStatus: string; accessExpiresAt?: string | null; authUserId?: string | null };
type Entitlement = { status: string; accessKey: string; source: string; sourceReference: string; currentPeriodEnd: string | null };
type Subscription = { provider: string; providerSubscriptionId: string; status: string; currentPeriodEnd: string | null };
export type MemberAccess = { identity: RequestIdentity; level: MemberAccessLevel; status: string; permissions: MemberResource[] };

// Explicit grants only. Unknown plan keys never become full membership.
const PLAN_PERMISSIONS: Record<AccessKey, readonly MemberResource[]> = {
  all_courses: ["courses"],
  [TIME_MEMBERSHIP_ACCESS_KEY]: MEMBER_RESOURCES,
};

export function isAccessKey(value: string): value is AccessKey {
  return ACCESS_KEYS.includes(value as AccessKey);
}

function unexpired(value: string | null | undefined, now: number, required = false) {
  if (value == null) return !required;
  const deadline = Date.parse(value);
  return Number.isFinite(deadline) && deadline > now;
}

function deniedIdentity(identity: RequestIdentity): RequestIdentity {
  return { ...identity, isAdmin: false, canManageEvents: false };
}

function memberIdentity(identity: RequestIdentity, permissions: readonly MemberResource[]): RequestIdentity {
  return {
    ...identity,
    isAdmin: false,
    canManageEvents: identity.role === "coordinator" && permissions.includes("events"),
  };
}

function isOperationalAdmin(identity: RequestIdentity) {
  return identity.role === "admin" || identity.role === "super_admin";
}

/** Pure policy shared by every server/page/API guard. No browser claims. */
export function resolveMemberAccess(
  identity: RequestIdentity | null,
  member: MemberRecord | undefined,
  entitlements: Entitlement[],
  subscriptions: Subscription[],
  now = Date.now(),
): MemberAccess | null {
  if (!identity) return null;
  const status = member?.accessStatus ?? "registered";
  const deny = (reason: string): MemberAccess => ({
    identity: deniedIdentity(identity),
    level: "registered", status: reason, permissions: [],
  });
  // A block or identity mismatch always wins, including for operational staff.
  if (status === "blocked") return deny("blocked");
  if (member?.authUserId && member.authUserId !== identity.id) return deny("identity_mismatch");

  // admin/super_admin are operational roles stored in app_roles, independent
  // from membership billing. Their authority is explicit, not inherited from
  // an entitlement. A blocked operator was already denied above.
  if (isOperationalAdmin(identity)) {
    return {
      identity: { ...identity, isAdmin: true, canManageEvents: true },
      level: "admin",
      status: "active",
      permissions: [...MEMBER_RESOURCES],
    };
  }
  if (!member) return deny("registered");
  if (!unexpired(member.accessExpiresAt, now)) return deny("expired");
  if (status === "complimentary") {
    const permissions = [...MEMBER_RESOURCES];
    return { identity: memberIdentity(identity, permissions), level: "complimentary", status, permissions };
  }
  if (["pending", "past_due", "canceled"].includes(status)) return deny(status);
  if (status !== "active") return deny(status);

  // Preserve existing manual membership; billing-backed accounts must have a
  // live scoped grant and must not fall back to the member's stale status.
  if (!entitlements.length && !subscriptions.length) {
    const permissions = [...MEMBER_RESOURCES];
    return { identity: memberIdentity(identity, permissions), level: "active", status, permissions };
  }
  const permissions = new Set<MemberResource>();
  for (const grant of entitlements) {
    if (grant.status !== "active" || !unexpired(grant.currentPeriodEnd, now)) continue;
    const subscription = subscriptions.find((item) => item.provider === grant.source && item.providerSubscriptionId === grant.sourceReference);
    const recurring = Boolean(subscription) || (grant.source === "stripe" && grant.sourceReference.startsWith("sub_"));
    if (recurring && (!subscription || !["active", "trialing"].includes(subscription.status) || !unexpired(subscription.currentPeriodEnd, now, true))) continue;
    if (!isAccessKey(grant.accessKey)) continue;
    for (const permission of PLAN_PERMISSIONS[grant.accessKey]) permissions.add(permission);
  }
  return permissions.size
    ? { identity: memberIdentity(identity, [...permissions]), level: "active", status, permissions: [...permissions] }
    : deny("expired_or_unentitled");
}

export function canAccessResource(access: MemberAccess | null, resource: MemberResource) {
  return Boolean(access?.permissions.includes(resource));
}
