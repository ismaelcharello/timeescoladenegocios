import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const { eventAcceptsRegistration, getEventAvailability, normalizeGuestContact, remainingSpots } = await import(
  new URL("../lib/event-rules.ts", import.meta.url).href,
);

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("disponibilidade deriva estados reais de prazo e capacidade", () => {
  const base = { status: "published" as const, startsAt: "2030-02-10T20:00:00.000Z", registrationDeadline: null, capacity: 10, occupied: 2 };
  assert.equal(getEventAvailability(base, Date.parse("2030-02-01T00:00:00.000Z")), "open");
  assert.equal(getEventAvailability({ ...base, occupied: 9 }, Date.parse("2030-02-01T00:00:00.000Z")), "last_spots");
  assert.equal(getEventAvailability({ ...base, occupied: 10 }, Date.parse("2030-02-01T00:00:00.000Z")), "sold_out");
  assert.equal(getEventAvailability({ ...base, registrationDeadline: "2030-01-31T23:00:00.000Z" }, Date.parse("2030-02-01T00:00:00.000Z")), "registration_closed");
  assert.equal(getEventAvailability({ ...base, startsAt: "2030-01-31T20:00:00.000Z", endsAt: "2030-02-01T02:00:00.000Z" }, Date.parse("2030-02-01T00:00:00.000Z")), "registration_closed");
  assert.equal(getEventAvailability({ ...base, endsAt: "2030-01-31T23:00:00.000Z" }, Date.parse("2030-02-01T00:00:00.000Z")), "completed");
  assert.equal(eventAcceptsRegistration("sold_out"), false);
  assert.equal(remainingSpots(null, 99), null);
});

test("identidade do convidado usa contato normalizado, nunca só o nome", () => {
  assert.equal(normalizeGuestContact(" Pessoa@Email.COM ", ""), "email:pessoa@email.com");
  assert.equal(normalizeGuestContact("", "(41) 99999-0000"), "phone:41999990000");
  assert.equal(normalizeGuestContact("", ""), "");
});

test("migration adiciona operação de eventos e trava overbooking no banco", () => {
  const migration = source("../drizzle/0011_worthless_stranger.sql");
  assert.match(migration, /ADD `capacity` integer/);
  assert.match(migration, /event_capacity_before_insert/);
  assert.match(migration, /event_capacity_before_update/);
  assert.match(migration, /event_guest_count_before_insert/);
  assert.match(migration, /event_guest_rules_before_update/);
  assert.match(migration, /RAISE\(ABORT, 'EVENT_CAPACITY_REACHED'\)/);
  assert.match(migration, /RAISE\(ABORT, 'EVENT_GUEST_LIMIT_REACHED'\)/);
});

test("eventos não são mais criados por leitura ou listas hardcoded", () => {
  const route = source("../app/api/events/route.ts");
  const store = source("../lib/event-checkin-store.ts");
  const rules = source("../lib/event-checkin.js");
  assert.doesNotMatch(route, /ensureNoiteDeNegociosEvent|TIME_TODAY/);
  assert.doesNotMatch(store, /ensureTodayCheckInEvent|NOITE_DE_NEGOCIOS_EVENT|TIME_TODAY/);
  assert.doesNotMatch(rules, /TIME_TODAY_MEMBERS|TIME_TODAY_GUESTS/);
});

test("API de eventos protege ações, propriedade de convidados e lotação", () => {
  const route = source("../app/api/events/route.ts");
  assert.match(route, /getAuthorizedMember\(request, "events"\)/);
  assert.match(route, /eq\(eventAttendees\.hostMemberId, member\.id\)/);
  assert.match(route, /normalizeGuestContact/);
  assert.match(route, /EVENT_CAPACITY_REACHED/);
  assert.match(route, /status: 409/);
});

test("admin possui CRUD real, exclusão segura e auditoria de eventos", () => {
  const route = source("../app/api/admin/events/route.ts");
  assert.match(route, /export async function POST/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /Eventos com inscrições não podem ser excluídos/);
  assert.match(route, /auditLogs/);
});

test("relatório CSV e check-in continuam restritos à gestão", () => {
  const report = source("../app/api/admin/events/[id]/report/route.ts");
  const checkIn = source("../app/api/admin/events/[id]/check-in/route.ts");
  assert.match(report, /identity\?\.canManageEvents/);
  assert.match(report, /text\/csv/);
  assert.match(checkIn, /identity\?\.canManageEvents/);
  assert.match(checkIn, /EVENT_CAPACITY_REACHED/);
  assert.match(checkIn, /atingiu a capacidade máxima/);
});

test("comunidade permite propriedade, edição, exclusão e denúncia no servidor", () => {
  const route = source("../app/api/community/[id]/route.ts");
  const comments = source("../app/api/community/[id]/comments/route.ts");
  assert.match(route, /post\.authorEmail !== identity\.email/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /communityReports/);
  assert.match(comments, /comment\.authorEmail !== identity\.email/);
  assert.match(comments, /export async function DELETE/);
});

test("ofertas têm campos estruturados sem checkout ou comissão", () => {
  const schema = source("../db/schema.ts");
  const route = source("../app/api/community/route.ts");
  assert.match(schema, /benefit: text\("benefit"\)/);
  assert.match(schema, /conditions: text\("conditions"\)/);
  assert.match(route, /Informe título, empresa, benefício e contato da oferta/);
  assert.doesNotMatch(route, /checkout|commission|payment/);
});

test("moderação administrativa cobre posts, comentários e denúncias", () => {
  const route = source("../app/api/admin/community/route.ts");
  assert.match(route, /identity\?\.isAdmin/);
  assert.match(route, /z\.enum\(\["post", "comment", "report"\]\)/);
  assert.match(route, /auditLogs/);
});

test("upload da comunidade valida assinatura binária e autorização", () => {
  const route = source("../app/api/uploads/route.ts");
  assert.match(route, /hasTrustedSignature/);
  assert.match(route, /getAuthorizedMember\(request, "community"\)/);
  assert.match(route, /conteúdo do arquivo não corresponde ao formato informado/);
});

test("interfaces expõem CRUD, convidados, oferta e moderação sem dados de exemplo", () => {
  const member = source("../app/app/member-platform.tsx");
  const admin = source("../app/admin/admin-platform.tsx");
  assert.match(member, /Adicionar convidado/);
  assert.match(member, /Informações da oferta/);
  assert.match(member, /Excluir comentário/);
  assert.match(admin, /\+ Novo evento/);
  assert.match(admin, /DENÚNCIAS PENDENTES/);
  assert.match(admin, /Baixar|CSV/);
});
