import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  calculateCheckInSummary,
  canConfirmArrival,
  matchesParticipantSearch,
  restoreStatusFromHistory,
} from "../lib/event-checkin.js";

test("a busca cobre nome, empresa e anfitrião sem depender de acentos", () => {
  const guest = { displayName: "Juliana da Silva Bitencourt", company: "", hostName: "Franklin", attendeeType: "guest" };
  assert.equal(matchesParticipantSearch(guest, "juliana"), true);
  assert.equal(matchesParticipantSearch(guest, "franklin"), true);
  assert.equal(matchesParticipantSearch(guest, "marketing"), false);
});

test("os totais refletem presença, tipo e convidados adicionados na porta", () => {
  const totals = calculateCheckInSummary([
    { attendeeType: "member", status: "present" },
    { attendeeType: "member", status: "expected" },
    { attendeeType: "guest", status: "present", addedAtDoor: true },
  ]);
  assert.deepEqual(totals, { expected: 3, present: 2, absent: 0, cancelled: 0, members: 2, guests: 1, membersPresent: 1, guestsPresent: 1, addedAtDoor: 1 });
});

test("check-in e desfazer seguem transições auditáveis", () => {
  assert.equal(canConfirmArrival("expected"), true);
  assert.equal(canConfirmArrival("cancelled"), false);
  assert.equal(restoreStatusFromHistory([{ previousStatus: "absent", newStatus: "present" }]), "absent");
  assert.equal(restoreStatusFromHistory([]), "expected");
});


test("os filtros de status distinguem pendentes, ausentes e cancelados", () => {
  const totals = calculateCheckInSummary([
    { attendeeType: "member", status: "expected" },
    { attendeeType: "member", status: "absent" },
    { attendeeType: "guest", status: "cancelled" },
    { attendeeType: "guest", status: "present" },
  ]);
  assert.equal(totals.expected, 3);
  assert.equal(totals.present, 1);
  assert.equal(totals.absent, 1);
  assert.equal(totals.cancelled, 1);
  assert.equal(totals.members, 2);
  assert.equal(totals.guests, 1);
});

test("a API exige papel de gestão de eventos no servidor", () => {
  const route = readFileSync(new URL("../app/api/admin/events/[id]/check-in/route.ts", import.meta.url), "utf8");
  assert.match(route, /getRequestIdentity\(request\)/);
  assert.match(route, /identity\?\.canManageEvents/);
  assert.match(route, /status: 403/);
  assert.match(route, /addGuestAtDoor/);
  assert.match(route, /updateEventParticipant/);
  assert.match(route, /removeEventParticipant/);
  assert.match(route, /action === "update-participant"/);
  assert.match(route, /action === "remove-participant"/);
  assert.match(route, /finalizeCheckIn/);
});

test("coordinator, admin e super_admin são papéis reconhecidos sem liberar member", () => {
  const auth = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
  assert.match(auth, /"coordinator"/);
  assert.match(auth, /"super_admin"/);
  assert.match(auth, /canManageEvents: appRole === "super_admin" \|\| appRole === "admin" \|\| appRole === "coordinator"/);
});

test("a interface expõe as ações operacionais sem tabela larga", () => {
  const screen = readFileSync(new URL("../app/admin/eventos/[id]/check-in/check-in-console.tsx", import.meta.url), "utf8");
  assert.match(screen, /Buscar participante/);
  assert.match(screen, /Confirmar chegada/);
  assert.match(screen, /Desfazer check-in/);
  assert.match(screen, /Adicionar pessoa/);
  assert.match(screen, /Membro da TIME/);
  assert.match(screen, /attendeeType/);
  assert.match(screen, /Empresa da pessoa/);
  assert.match(screen, /name="company"/);
  assert.match(screen, /Empresa: \$\{participant\.company\}/);
  assert.match(screen, /Editar pessoa/);
  assert.match(screen, /Excluir da lista/);
  assert.match(screen, /Tipo de participação/);
  assert.match(screen, /update-participant/);
  assert.match(screen, /Finalizar check-in/);
  assert.match(screen, /Relatório em PDF baixado/);
  assert.match(screen, /createAttendancePdf/);
  assert.match(screen, /application\/pdf/);
  assert.match(screen, /URL\.createObjectURL/);
  assert.match(screen, /Baixar relatório PDF/);
  assert.match(screen, /Resumo de presenca/);
  assert.match(screen, /Presentes/);
  assert.match(screen, /Ausentes/);
  assert.match(screen, /Ainda nao chegaram/);
  assert.match(screen, /EMPRESA E PARTICIPACAO/);
  assert.doesNotMatch(screen, /<table/);
});

test("o contrato mobile aplica safe area, controles de 44px e evita overflow", () => {
  const css = readFileSync(new URL("../app/platform.css", import.meta.url), "utf8");
  assert.match(css, /\.event-checkin-shell,[\s\S]*?overflow-x: clip/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.event-checkin-row-action \.event-checkin-confirm \{ min-width: 188px; min-height: 44px/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /\.admin-events-list > article \{ grid-template-columns: minmax\(0, 1fr\);/);
});

test("a lista administrativa de eventos declara contraste próprio para a superfície clara", () => {
  const css = readFileSync(new URL("../app/platform.css", import.meta.url), "utf8");
  assert.match(css, /:is\(\.admin-app, \.event-checkin-shell\) \.admin-events-list > article \{[\s\S]*?background: #fff;[\s\S]*?color: #1c192d;/);
  assert.match(css, /:is\(\.admin-app, \.event-checkin-shell\) \.admin-events-list h3 \{[\s\S]*?color: #19172b;/);
  assert.match(css, /:is\(\.admin-app, \.event-checkin-shell\) \.admin-events-list p \{[\s\S]*?color: #514d60;/);
  assert.match(css, /:is\(\.admin-app, \.event-checkin-shell\) \.admin-event-breakdown span \{[\s\S]*?background: #f8f7fc;[\s\S]*?color: #4e4a5d;/);
  assert.match(css, /\.admin-app \.admin-surface-light \{[\s\S]*?color: #1c192d;[\s\S]*?background: #fff;/);
});

test("painéis escuros do membro mantêm texto e CTA legíveis no tema claro", () => {
  const css = readFileSync(new URL("../app/platform.css", import.meta.url), "utf8");
  assert.match(css, /html\[data-resolved="light"\] \.member-app :is\(\.real-continue-learning, \.member-stats article, \.upcoming-course-card\) :is\(h1, h2, h3, strong, b\)/);
  assert.match(css, /html\[data-resolved="light"\] \.member-app \.real-continue-learning > button \{[\s\S]*?background: #ff00e0;[\s\S]*?color: #17051a;/);
  assert.match(css, /\.member-app \.member-main,[\s\S]*?overflow-x: clip/);
});

test("o schema persiste participantes, convidados e auditoria sem duplicar membros", () => {
  const schema = readFileSync(new URL("../db/schema.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../drizzle/0006_event_roster_identity.sql", import.meta.url), "utf8");
  assert.match(schema, /export const eventAttendees/);
  assert.match(schema, /export const eventGuests/);
  assert.match(schema, /export const checkInHistory/);
  assert.match(schema, /hostMemberId/);
  assert.match(schema, /checkedInBy/);
  assert.match(schema, /rosterKey/);
  assert.match(schema, /event_attendees_roster_unique/);
  assert.match(migration, /row_number\(\) OVER/);
  assert.match(migration, /event_attendees_roster_unique/);
});

test("a lista evita duplicação por carga concorrente e preserva chegadas", () => {
  const store = readFileSync(new URL("../lib/event-checkin-store.ts", import.meta.url), "utf8");
  assert.match(store, /function rosterKey/);
  assert.match(store, /removeLegacyDuplicates/);
  assert.match(store, /person:\$\{normalized\(displayName\)\}/);
  assert.match(store, /onConflictDoNothing\(\{ target: \[eventAttendees\.eventId, eventAttendees\.rosterKey\] \}\)/);
  assert.match(store, /if \(input\.checkInNow === true && existing\.status !== "present"\)/);
  assert.match(store, /Já existe uma pessoa com este nome neste evento/);
  assert.match(store, /export async function removeEventParticipant/);
});

test("o perfil administrativo do membro mantém o histórico de eventos restrito", () => {
  const page = readFileSync(new URL("../app/admin/membros/[id]/eventos/page.tsx", import.meta.url), "utf8");
  assert.match(page, /if \(!user\.isAdmin\)/);
  assert.match(page, /Histórico real de presença/);
  assert.match(page, /Sem check-in registrado/);
});

test("convidados têm histórico persistente e só administração pode convertê-los em membros", () => {
  const store = readFileSync(new URL("../lib/event-checkin-store.ts", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/admin/convidados/[id]/route.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/admin/convidados/[id]/page.tsx", import.meta.url), "utf8");
  const conversion = readFileSync(new URL("../app/admin/convidados/[id]/guest-conversion.tsx", import.meta.url), "utf8");
  assert.match(store, /getGuestEventHistory/);
  assert.match(store, /linkGuestToMember/);
  assert.match(store, /convertedMemberId/);
  assert.match(store, /getGuestEventHistory/);
  assert.match(route, /identity\?\.canManageEvents/);
  assert.match(route, /identity\?\.isAdmin/);
  assert.match(page, /PRIMEIRO EVENTO/);
  assert.match(conversion, /Vincular a um membro oficial/);
});

test("a edição preserva dados da pessoa e a relação de anfitrião", () => {
  const store = readFileSync(new URL("../lib/event-checkin-store.ts", import.meta.url), "utf8");
  const screen = readFileSync(new URL("../app/admin/eventos/[id]/check-in/check-in-console.tsx", import.meta.url), "utf8");
  assert.match(store, /export async function updateEventParticipant/);
  assert.match(store, /hostAttendeeId/);
  assert.match(store, /attendeeType === "guest"/);
  assert.match(screen, /Membro do clube/);
  assert.match(screen, /Anfitrião/);
  assert.match(screen, /isHost/);
});

test("o PWA busca e assume atualizações publicadas sem reinstalação", () => {
  const register = readFileSync(new URL("../app/pwa-register.tsx", import.meta.url), "utf8");
  const worker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(register, /updateViaCache: "none"/);
  assert.match(register, /registration\.update\(\)/);
  assert.match(register, /controllerchange/);
  assert.match(worker, /SKIP_WAITING/);
  assert.match(worker, /time-shell-v2/);
});

test("a comunidade aceita legenda, imagem, GIF, vídeo e link sem expor erro técnico", () => {
  const screen = readFileSync(new URL("../app/app/member-platform.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/community/route.ts", import.meta.url), "utf8");
  const uploads = readFileSync(new URL("../app/api/uploads/route.ts", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/platform.css", import.meta.url), "utf8");

  assert.match(screen, /Imagem ou GIF/);
  assert.match(screen, /<Icon name="play" size=\{16\} \/> Vídeo/);
  assert.match(screen, /aria-label="Legenda da publicação"/);
  assert.match(screen, /<video controls playsInline preload="metadata"/);
  assert.match(screen, /Não foi possível conectar à comunidade agora/);
  assert.match(route, /"video"/);
  assert.match(route, /kind === "video" && !internalUpload/);
  assert.match(uploads, /MAX_COMMUNITY_VIDEO_BYTES/);
  assert.match(uploads, /video\/mp4/);
  assert.match(css, /\.social-post-composer/);
  assert.match(css, /\.community-post-attachments figure video/);
  assert.match(css, /html\[data-resolved="light"\] \.member-app \.social-post-composer/);
});

test("ofertas da comunidade toleram validade opcional inválida", () => {
  const screen = readFileSync(new URL("../app/app/member-platform.tsx", import.meta.url), "utf8");
  assert.match(screen, /function formatShortDate\(value: string\)/);
  assert.match(screen, /Number\.isNaN\(date\.getTime\(\)\) \? "A confirmar"/);
  assert.match(screen, /formatShortDate\(post\.validUntil\)/);
});

test("a experiência inspirada nas referências usa dados persistidos em vez de botões cenográficos", () => {
  const screen = readFileSync(new URL("../app/app/member-platform.tsx", import.meta.url), "utf8");
  const schema = readFileSync(new URL("../db/schema.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../drizzle/0007_funny_sabretooth.sql", import.meta.url), "utf8");
  const eventsRoute = readFileSync(new URL("../app/api/events/route.ts", import.meta.url), "utf8");
  const notesRoute = readFileSync(new URL("../app/api/lesson-notes/route.ts", import.meta.url), "utf8");
  const communityRoute = readFileSync(new URL("../app/api/community/[id]/route.ts", import.meta.url), "utf8");

  assert.match(screen, /Em destaque na TIME/);
  assert.match(screen, /Encontrar conexão/);
  assert.match(screen, /Anotações/);
  assert.match(screen, /Comentários/);
  assert.match(screen, /Quero participar/);
  assert.match(screen, /Oportunidades/);
  assert.match(schema, /export const lessonNotes/);
  assert.match(schema, /export const communityPostLikes/);
  assert.match(schema, /export const communityComments/);
  assert.match(migration, /CREATE TABLE `lesson_notes`/);
  assert.doesNotMatch(migration, /ADD `roster_key`/);
  assert.match(eventsRoute, /getAuthorizedMember/);
  assert.match(eventsRoute, /registrationStatus/);
  assert.match(notesRoute, /onConflictDoUpdate/);
  assert.match(communityRoute, /payload\.action !== "like"/);
});

test("cancelamento de inscrição e remoção de convidado exigem confirmação no modal", () => {
  const screen = readFileSync(new URL("../app/app/member-platform.tsx", import.meta.url), "utf8");
  const agenda = screen.slice(screen.indexOf("function AgendaSection"), screen.indexOf("function AchievementsSection"));
  assert.match(agenda, /CONFIRMAÇÃO NECESSÁRIA/);
  assert.match(agenda, /Sim, cancelar inscrição/);
  assert.match(agenda, /Sim, remover convidado/);
  assert.match(agenda, /setDestructiveAction\(\{ kind: "cancel-registration", event \}\)/);
  assert.match(agenda, /setDestructiveAction\(\{ kind: "remove-guest", event, guest \}\)/);
  assert.doesNotMatch(agenda, /confirm\(/);
});
