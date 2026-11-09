/**
 * Ingresso com QR Code: token assinado que prova quem é o participante.
 *
 * Formato: `T1.<eventId>.<attendeeId>.<assinatura>`, onde a assinatura é o
 * HMAC-SHA256 de `T1.<eventId>.<attendeeId>` truncado a 16 bytes (128 bits),
 * em base64url. Curto o bastante para um QR leve, longo o bastante para que
 * adivinhar seja inviável.
 *
 * O token NÃO guarda nome, e-mail nem telefone: o QR pode ser fotografado,
 * encaminhado e impresso, então só carrega ids e uma assinatura. Quem lê (a
 * portaria) confere a assinatura no servidor e só então busca a pessoa.
 *
 * Usa WebCrypto (`crypto.subtle`), disponível no Workers e no Node.
 */
const VERSION = "T1";
const ASSINATURA_BYTES = 16;

export type TicketClaims = { eventId: number; attendeeId: number };
export type TicketCheck = { ok: true; claims: TicketClaims } | { ok: false; reason: "formato" | "assinatura" };

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const full = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
  return toBase64Url(full.slice(0, ASSINATURA_BYTES));
}

/** Comparação em tempo constante: não revela por tempo quantos caracteres batem. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isPositiveInt(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export async function signTicket(claims: TicketClaims, secret: string): Promise<string> {
  if (!secret) throw new Error("segredo do ingresso ausente");
  if (!isPositiveInt(claims.eventId) || !isPositiveInt(claims.attendeeId)) throw new Error("ids inválidos");
  const body = `${VERSION}.${claims.eventId}.${claims.attendeeId}`;
  return `${body}.${await sign(secret, body)}`;
}

export async function verifyTicket(token: string, secret: string): Promise<TicketCheck> {
  const partes = String(token ?? "").trim().split(".");
  if (partes.length !== 4 || partes[0] !== VERSION) return { ok: false, reason: "formato" };
  if (!/^\d{1,12}$/.test(partes[1]) || !/^\d{1,12}$/.test(partes[2])) return { ok: false, reason: "formato" };
  const eventId = Number(partes[1]);
  const attendeeId = Number(partes[2]);
  if (!isPositiveInt(eventId) || !isPositiveInt(attendeeId)) return { ok: false, reason: "formato" };
  const esperado = await sign(secret, `${VERSION}.${eventId}.${attendeeId}`);
  return constantTimeEqual(esperado, partes[3]) ? { ok: true, claims: { eventId, attendeeId } } : { ok: false, reason: "assinatura" };
}

/**
 * Segredo do ingresso. Em produção vem de `TICKET_SECRET` (secret do Worker) e,
 * sem ele, devolve null: é melhor recusar emitir ingresso do que assinar com um
 * segredo previsível. O valor de desenvolvimento só existe no dev local.
 */
export function resolveTicketSecret(env: { TICKET_SECRET?: string }, isDev: boolean): string | null {
  const real = env.TICKET_SECRET?.trim();
  if (real && real.length >= 16) return real;
  return isDev ? "segredo-de-ingresso-apenas-para-dev-local" : null;
}
