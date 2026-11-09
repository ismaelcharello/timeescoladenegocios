import type { TicketCheck } from "@/lib/event-ticket";

/**
 * Decide o que a portaria vê ao ler um QR. Pura: a rota busca a pessoa no banco
 * e passa o resultado; a decisão não toca em rede nem em banco, então é testável.
 *
 * O ponto delicado é `already`: ler o mesmo QR duas vezes NÃO é erro técnico, é
 * o sinal de ingresso compartilhado ou de fila furada. A portaria precisa
 * distinguir "entrou agora" de "já tinha entrado", senão um print do QR entra
 * quantas vezes quiserem.
 */
export type ScanAttendee = {
  id: number;
  eventId: number;
  status: "expected" | "present" | "absent" | "cancelled";
  displayName: string;
  attendeeType: "member" | "guest";
  company: string;
  checkedInAt: string | null;
};

export type ScanResult =
  | { result: "ok"; attendee: ScanAttendee }
  | { result: "already"; attendee: ScanAttendee }
  | { result: "invalid"; message: string }
  | { result: "wrong_event"; message: string }
  | { result: "not_found"; message: string }
  | { result: "cancelled"; message: string; attendee: ScanAttendee };

export function decideScan(input: {
  verification: TicketCheck;
  routeEventId: number;
  attendee: ScanAttendee | null | undefined;
}): ScanResult {
  const { verification, routeEventId, attendee } = input;
  if (!verification.ok) return { result: "invalid", message: "QR inválido ou adulterado. Não libere a entrada." };
  if (verification.claims.eventId !== routeEventId) {
    return { result: "wrong_event", message: "Este ingresso é de outro evento." };
  }
  // O ingresso só vale para o participante que ele nomeia, no evento que ele nomeia.
  if (!attendee || attendee.id !== verification.claims.attendeeId || attendee.eventId !== routeEventId) {
    return { result: "not_found", message: "Participante não encontrado neste evento." };
  }
  if (attendee.status === "cancelled") {
    return { result: "cancelled", message: "Inscrição cancelada. Não libere a entrada.", attendee };
  }
  if (attendee.status === "present") return { result: "already", attendee };
  return { result: "ok", attendee };
}

export type ScanTone = "go" | "warn" | "stop";
export type ScanFeedback = { tone: ScanTone; title: string; detail: string };

function hora(iso: string | null): string {
  if (!iso) return "";
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * O que a portaria vê. Três tons, e só UM deles libera a entrada:
 * - go   (verde):    entrada liberada, e apenas para `ok`;
 * - warn (âmbar):    `already` — já entrou; chamar um responsável antes de decidir;
 * - stop (vermelho): tudo o mais — QR falso, evento errado, cancelado, desconhecido.
 * Um tom a mais por conveniência ("quase verde") abriria brecha em fila cheia.
 */
export function describeScan(result: ScanResult): ScanFeedback {
  switch (result.result) {
    case "ok": {
      const { displayName, attendeeType, company } = result.attendee;
      return { tone: "go", title: "Entrada liberada", detail: [displayName, attendeeType === "guest" ? "Convidado" : "Membro", company].filter(Boolean).join(" · ") };
    }
    case "already": {
      const { displayName, checkedInAt } = result.attendee;
      const quando = hora(checkedInAt);
      return { tone: "warn", title: "Este ingresso já foi usado", detail: `${displayName}${quando ? ` · entrou às ${quando}` : ""}. Confirme a identidade antes de liberar.` };
    }
    case "cancelled":
      return { tone: "stop", title: "Inscrição cancelada", detail: result.message };
    case "wrong_event":
      return { tone: "stop", title: "Ingresso de outro evento", detail: result.message };
    case "not_found":
      return { tone: "stop", title: "Participante não encontrado", detail: result.message };
    case "invalid":
      return { tone: "stop", title: "QR inválido", detail: result.message };
  }
}
