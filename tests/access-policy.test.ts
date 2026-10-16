import assert from "node:assert/strict";
import test from "node:test";
const { MEMBER_RESOURCES, canAccessResource, resolveMemberAccess } = await import(
  new URL("../lib/access-policy.ts", import.meta.url).href,
);

const member = { id: "user-1", email: "member@time.test", fullName: "Membro", role: "member" as const, isAdmin: false, canManageEvents: false };
const admin = { ...member, id: "admin-1", role: "admin" as const, isAdmin: true, canManageEvents: true };
const superAdmin = { ...admin, id: "super-admin-1", role: "super_admin" as const };
const coordinator = { ...member, id: "coordinator-1", role: "coordinator" as const, canManageEvents: true };
const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();
const subscription = [{ provider: "stripe", providerSubscriptionId: "sub_1", status: "active", currentPeriodEnd: future }];
const fullGrant = [{ status: "active", accessKey: "membership", source: "stripe", sourceReference: "sub_1", currentPeriodEnd: future }];

function assertAllResources(access: ReturnType<typeof resolveMemberAccess>, expected: boolean) {
  for (const resource of MEMBER_RESOURCES) {
    assert.equal(canAccessResource(access, resource), expected, `acesso inesperado para ${resource}`);
  }
}

test("não autenticado não obtém acesso", () => {
  const access = resolveMemberAccess(null, undefined, [], []);
  assert.equal(access, null);
  assertAllResources(access, false);
});
test("cadastrado sem associação não acessa recursos", () => {
  const access = resolveMemberAccess(member, { accessStatus: "pending" }, [], []);
  assertAllResources(access, false);
});
test("membro ativo com plano válido respeita escopo", () => {
  const access = resolveMemberAccess(member, { accessStatus: "active" }, fullGrant, subscription);
  assertAllResources(access, true);
});
test("isenção autorizada libera o conjunto de membro", () => {
  const access = resolveMemberAccess(member, { accessStatus: "complimentary" }, [], []);
  assertAllResources(access, true);
});
test("bloqueio administrativo vence entitlement ativo e papel administrativo", () => {
  const access = resolveMemberAccess(admin, { accessStatus: "blocked" }, fullGrant, subscription);
  assertAllResources(access, false);
  assert.equal(access?.identity.isAdmin, false);
});
test("acesso expirado é negado", () => {
  const access = resolveMemberAccess(member, { accessStatus: "active", accessExpiresAt: past }, [], []);
  assertAllResources(access, false);
});
test("coordenador ativo só gerencia eventos quando o acesso inclui eventos", () => {
  const fullAccess = resolveMemberAccess(coordinator, { accessStatus: "active" }, fullGrant, subscription);
  assert.equal(fullAccess?.identity.canManageEvents, true);

  const courseOnly = resolveMemberAccess(
    coordinator,
    { accessStatus: "active" },
    [{ ...fullGrant[0], accessKey: "all_courses" }],
    subscription,
  );
  assert.equal(courseOnly?.identity.canManageEvents, false);
});
test("coordenador expirado ou sem associação perde gestão de eventos", () => {
  const expired = resolveMemberAccess(coordinator, { accessStatus: "active", accessExpiresAt: past }, fullGrant, subscription);
  const unassociated = resolveMemberAccess(coordinator, undefined, [], []);
  assert.equal(expired?.identity.canManageEvents, false);
  assert.equal(unassociated?.identity.canManageEvents, false);
  assertAllResources(expired, false);
  assertAllResources(unassociated, false);
});
test("coordenador bloqueado perde gestão mesmo com entitlement válido", () => {
  const access = resolveMemberAccess(coordinator, { accessStatus: "blocked" }, fullGrant, subscription);
  assert.equal(access?.identity.canManageEvents, false);
  assertAllResources(access, false);
});
test("entitlement vencido não prolonga associação", () => {
  const access = resolveMemberAccess(member, { accessStatus: "active" }, [{ ...fullGrant[0], currentPeriodEnd: past }], subscription);
  assertAllResources(access, false);
});
test("administrador operacional válido mantém acesso sem depender de associação", () => {
  const withoutMembership = resolveMemberAccess(admin, undefined, [], []);
  const access = resolveMemberAccess(admin, { accessStatus: "active" }, [], []);
  assertAllResources(withoutMembership, true);
  assertAllResources(access, true);
  assert.equal(withoutMembership?.identity.isAdmin, true);
});
test("admin operacional mantém administração se apenas a associação estiver expirada", () => {
  const access = resolveMemberAccess(admin, { accessStatus: "active", accessExpiresAt: past }, [], []);
  assertAllResources(access, true);
  assert.equal(access?.identity.isAdmin, true);
  assert.equal(access?.identity.canManageEvents, true);
});
test("super admin segue a política operacional explícita", () => {
  const access = resolveMemberAccess(superAdmin, undefined, [], []);
  assertAllResources(access, true);
  assert.equal(access?.identity.isAdmin, true);
  assert.equal(access?.identity.canManageEvents, true);
});
test("admin bloqueado perde todos os privilégios operacionais", () => {
  const access = resolveMemberAccess(admin, { accessStatus: "blocked" }, [], []);
  assertAllResources(access, false);
  assert.equal(access?.identity.isAdmin, false);
  assert.equal(access?.identity.canManageEvents, false);
});
test("plano somente de cursos não libera networking, WhatsApp, comunidade ou eventos", () => {
  const access = resolveMemberAccess(
    member,
    { accessStatus: "active" },
    [{ ...fullGrant[0], accessKey: "all_courses" }],
    subscription,
  );
  assert.equal(canAccessResource(access, "courses"), true);
  assert.equal(canAccessResource(access, "networking"), false);
  assert.equal(canAccessResource(access, "community"), false);
  assert.equal(canAccessResource(access, "events"), false);
});
test("plano desconhecido e identidade divergente falham fechados", () => {
  const unknownPlan = resolveMemberAccess(
    member,
    { accessStatus: "active" },
    [{ ...fullGrant[0], accessKey: "unknown_plan" }],
    subscription,
  );
  assertAllResources(unknownPlan, false);

  const mismatch = resolveMemberAccess(
    member,
    { accessStatus: "active", authUserId: "another-user" },
    fullGrant,
    subscription,
  );
  assertAllResources(mismatch, false);
  assert.equal(mismatch?.status, "identity_mismatch");
});
