import assert from "node:assert/strict";
import test from "node:test";
const { signTicket, verifyTicket, resolveTicketSecret } = await import(new URL("../lib/event-ticket.ts", import.meta.url).href);

const SEGREDO = "um-segredo-de-teste-bem-longo-123";

test("um ingresso assinado é aceito e devolve os ids certos", async () => {
  const token = await signTicket({ eventId: 7, attendeeId: 42 }, SEGREDO);
  assert.match(token, /^T1\.7\.42\.[A-Za-z0-9_-]{22}$/);
  assert.deepEqual(await verifyTicket(token, SEGREDO), { ok: true, claims: { eventId: 7, attendeeId: 42 } });
});

test("o token não carrega nome, e-mail nem telefone — só ids e assinatura", async () => {
  const token = await signTicket({ eventId: 7, attendeeId: 42 }, SEGREDO);
  assert.equal(token.split(".").length, 4);
  assert.doesNotMatch(token, /@|\s/);
});

test("FORJA: trocar o participante por outro mantendo a assinatura é recusado", async () => {
  const token = await signTicket({ eventId: 7, attendeeId: 42 }, SEGREDO);
  const [v, e, , sig] = token.split(".");
  assert.deepEqual(await verifyTicket(`${v}.${e}.43.${sig}`, SEGREDO), { ok: false, reason: "assinatura" });
});

test("FORJA: levar o ingresso de um evento para outro é recusado", async () => {
  const token = await signTicket({ eventId: 7, attendeeId: 42 }, SEGREDO);
  const [v, , a, sig] = token.split(".");
  assert.deepEqual(await verifyTicket(`${v}.8.${a}.${sig}`, SEGREDO), { ok: false, reason: "assinatura" });
});

test("assinado com outro segredo não vale", async () => {
  const token = await signTicket({ eventId: 7, attendeeId: 42 }, "outro-segredo-completamente-diferente");
  assert.equal((await verifyTicket(token, SEGREDO)).ok, false);
});

test("lixo, vazio, versão errada e números absurdos nunca passam nem estouram", async () => {
  for (const ruim of ["", "oi", "T1.1.2", "T2.1.2.abc", "T1.-1.2.abc", "T1.1.0.abc", "T1.1.2.", "T1.99999999999999999999.2.abc", "T1.1.2.abc.extra", null, undefined]) {
    const r = await verifyTicket(ruim as string, SEGREDO);
    assert.equal(r.ok, false, `"${ruim}" não deveria passar`);
  }
});

test("assinatura com um caractere trocado é recusada", async () => {
  const token = await signTicket({ eventId: 7, attendeeId: 42 }, SEGREDO);
  const adulterado = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
  assert.equal((await verifyTicket(adulterado, SEGREDO)).ok, false);
});

test("sem segredo ou com ids inválidos, assinar falha em vez de emitir um ingresso fraco", async () => {
  await assert.rejects(() => signTicket({ eventId: 1, attendeeId: 1 }, ""));
  await assert.rejects(() => signTicket({ eventId: 0, attendeeId: 1 }, SEGREDO));
  await assert.rejects(() => signTicket({ eventId: 1, attendeeId: 1.5 }, SEGREDO));
});

test("segredo: produção sem TICKET_SECRET recusa emitir; dev local tem um valor próprio", () => {
  assert.equal(resolveTicketSecret({}, false), null, "produção não pode assinar com segredo previsível");
  assert.equal(resolveTicketSecret({ TICKET_SECRET: "curto" }, false), null, "segredo curto demais não vale");
  assert.equal(resolveTicketSecret({ TICKET_SECRET: SEGREDO }, false), SEGREDO);
  assert.ok(resolveTicketSecret({}, true));
});
