import assert from "node:assert/strict";
import test from "node:test";
const { decideScan } = await import(new URL("../lib/event-ticket-scan.ts", import.meta.url).href);

const valido = { ok: true, claims: { eventId: 7, attendeeId: 42 } };
const pessoa = (status: string, extra = {}) => ({ id: 42, eventId: 7, status, displayName: "Maria Souza", attendeeType: "member", company: "Souza ME", checkedInAt: null, ...extra });

test("ingresso válido de quem está esperado: libera a entrada", () => {
  assert.equal(decideScan({ verification: valido, routeEventId: 7, attendee: pessoa("expected") }).result, "ok");
});

test("o MESMO ingresso lido de novo vira 'already', não 'ok' — é assim que se pega ingresso compartilhado", () => {
  const r = decideScan({ verification: valido, routeEventId: 7, attendee: pessoa("present", { checkedInAt: "2026-11-08T19:00:00Z" }) });
  assert.equal(r.result, "already");
});

test("QR forjado ou ilegível é recusado com aviso para NÃO liberar", () => {
  const r = decideScan({ verification: { ok: false, reason: "assinatura" }, routeEventId: 7, attendee: pessoa("expected") });
  assert.equal(r.result, "invalid");
  assert.match(r.message, /Não libere/);
});

test("ingresso de outro evento é recusado, mesmo com assinatura válida", () => {
  const r = decideScan({ verification: { ok: true, claims: { eventId: 9, attendeeId: 42 } }, routeEventId: 7, attendee: pessoa("expected") });
  assert.equal(r.result, "wrong_event");
});

test("inscrição cancelada não entra, mesmo com QR válido guardado no celular", () => {
  const r = decideScan({ verification: valido, routeEventId: 7, attendee: pessoa("cancelled") });
  assert.equal(r.result, "cancelled");
  assert.match(r.message, /Não libere/);
});

test("participante inexistente, ou o id do banco diferente do id do QR, não entra", () => {
  assert.equal(decideScan({ verification: valido, routeEventId: 7, attendee: null }).result, "not_found");
  assert.equal(decideScan({ verification: valido, routeEventId: 7, attendee: pessoa("expected", { id: 99 }) }).result, "not_found");
  assert.equal(decideScan({ verification: valido, routeEventId: 7, attendee: pessoa("expected", { eventId: 8 }) }).result, "not_found");
});

test("quem faltou ('absent') ainda pode entrar se aparecer com o ingresso", () => {
  assert.equal(decideScan({ verification: valido, routeEventId: 7, attendee: pessoa("absent") }).result, "ok");
});

const { describeScan } = await import(new URL("../lib/event-ticket-scan.ts", import.meta.url).href);

test("SÓ o resultado 'ok' tem tom verde; nenhum outro pode liberar a entrada", () => {
  const p = (status: string) => ({ id: 1, eventId: 7, status, displayName: "Ana", attendeeType: "member", company: "", checkedInAt: "2026-11-08T22:15:00Z" });
  const todos = [
    { result: "ok", attendee: p("present") },
    { result: "already", attendee: p("present") },
    { result: "invalid", message: "x" },
    { result: "wrong_event", message: "x" },
    { result: "not_found", message: "x" },
    { result: "cancelled", message: "x", attendee: p("cancelled") },
  ];
  const verdes = todos.filter((r) => describeScan(r).tone === "go").map((r) => r.result);
  assert.deepEqual(verdes, ["ok"]);
});

test("ingresso já usado é âmbar e mostra quem e a que horas, para a portaria decidir", () => {
  const f = describeScan({ result: "already", attendee: { id: 1, eventId: 7, status: "present", displayName: "Ana Lima", attendeeType: "member", company: "", checkedInAt: "2026-11-08T22:15:00Z" } });
  assert.equal(f.tone, "warn");
  assert.match(f.detail, /Ana Lima/);
  assert.match(f.detail, /\d{2}:\d{2}/);
  assert.match(f.detail, /Confirme a identidade/);
});

test("convidado aparece como Convidado, não como Membro", () => {
  const f = describeScan({ result: "ok", attendee: { id: 2, eventId: 7, status: "present", displayName: "Beto", attendeeType: "guest", company: "ACME", checkedInAt: null } });
  assert.match(f.detail, /Convidado/);
  assert.doesNotMatch(f.detail, /Membro/);
});
