import {
  addGuestAtDoor,
  confirmArrival,
  finalizeCheckIn,
  getCheckInEvent,
  removeEventParticipant,
  undoArrival,
  updateEventParticipant,
} from "@/lib/event-checkin-store";
import { getRequestIdentity } from "@/lib/auth";
import { getDb } from "@/db";
import { eventAttendees } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { resolveTicketSecret, verifyTicket } from "@/lib/event-ticket";
import { decideScan, type ScanAttendee } from "@/lib/event-ticket-scan";

export const dynamic = "force-dynamic";

function eventIdFrom(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function authorize(request: Request) {
  const identity = await getRequestIdentity(request);
  return identity?.canManageEvents ? identity : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await authorize(request);
  if (!identity) return Response.json({ error: "Acesso de coordenação de eventos necessário." }, { status: 403 });
  const { id } = await params;
  const eventId = eventIdFrom(id);
  if (!eventId) return Response.json({ error: "Evento inválido." }, { status: 400 });
  try {
    const event = await getCheckInEvent(eventId);
    if (!event) return Response.json({ error: "Evento não encontrado." }, { status: 404 });
    return Response.json(event);
  } catch (error) {
    console.error("admin-events:checkin-get failed", error);
    return Response.json({ error: "Não foi possível carregar o check-in." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await authorize(request);
  if (!identity) return Response.json({ error: "Acesso de coordenação de eventos necessário." }, { status: 403 });
  const { id } = await params;
  const eventId = eventIdFrom(id);
  if (!eventId) return Response.json({ error: "Evento inválido." }, { status: 400 });

  try {
    const payload = await request.json() as { action?: string; attendeeId?: number } & Record<string, unknown>;
    const action = payload.action;
    if (action === "scan") {
      // Leitura de QR na portaria. A decisão é pura (lib/event-ticket-scan.ts);
      // aqui só se busca a pessoa e, se for o caso, grava a presença.
      const secret = resolveTicketSecret(process.env as { TICKET_SECRET?: string }, import.meta.env.DEV);
      if (!secret) return Response.json({ error: "Leitura de ingressos indisponível: segredo não configurado." }, { status: 503 });
      const verification = await verifyTicket(String(payload.token ?? ""), secret);
      const alvoId = verification.ok ? verification.claims.attendeeId : 0;
      const [linha] = alvoId
        ? await getDb().select().from(eventAttendees).where(and(eq(eventAttendees.id, alvoId), eq(eventAttendees.eventId, eventId))).limit(1)
        : [];
      const attendee: ScanAttendee | null = linha
        ? { id: linha.id, eventId: linha.eventId, status: linha.status, displayName: linha.displayName, attendeeType: linha.attendeeType, company: linha.company, checkedInAt: linha.checkedInAt }
        : null;
      const decisao = decideScan({ verification, routeEventId: eventId, attendee });
      if (decisao.result === "ok") {
        const feito = await confirmArrival(eventId, decisao.attendee.id, identity);
        return Response.json({ ...decisao, attendee: { ...decisao.attendee, status: "present", checkedInAt: feito.checkedInAt } });
      }
      return Response.json(decisao, { status: decisao.result === "already" ? 200 : 422 });
    }
    if (action === "check-in" || action === "undo") {
      const attendeeId = Number(payload.attendeeId);
      if (!Number.isInteger(attendeeId) || attendeeId <= 0) {
        return Response.json({ error: "Participante inválido." }, { status: 400 });
      }
      if (action === "check-in") await confirmArrival(eventId, attendeeId, identity);
      else await undoArrival(eventId, attendeeId, identity);
    } else if (action === "add-guest") {
      await addGuestAtDoor(eventId, payload, identity);
    } else if (action === "update-participant") {
      const attendeeId = Number(payload.attendeeId);
      if (!Number.isInteger(attendeeId) || attendeeId <= 0) {
        return Response.json({ error: "Participante inválido." }, { status: 400 });
      }
      await updateEventParticipant(eventId, attendeeId, payload, identity);
    } else if (action === "remove-participant") {
      const attendeeId = Number(payload.attendeeId);
      if (!Number.isInteger(attendeeId) || attendeeId <= 0) {
        return Response.json({ error: "Participante inválido." }, { status: 400 });
      }
      await removeEventParticipant(eventId, attendeeId, identity);
    } else if (action === "finalize") {
      await finalizeCheckIn(eventId, identity);
    } else {
      return Response.json({ error: "Ação de check-in inválida." }, { status: 400 });
    }

    const event = await getCheckInEvent(eventId);
    if (!event) return Response.json({ error: "Evento não encontrado." }, { status: 404 });
    return Response.json({ ...event, notice: action === "finalize" ? "Check-in finalizado." : action === "remove-participant" ? "Pessoa removida da lista do evento." : "Alteração salva." });
  } catch (error) {
    const technicalMessage = error instanceof Error ? error.message : "";
    const message = /EVENT_CAPACITY_REACHED/.test(technicalMessage)
      ? "Este evento atingiu a capacidade máxima."
      : /EVENT_GUEST_LIMIT_REACHED/.test(technicalMessage)
        ? "O limite de convidados deste evento foi atingido."
        : technicalMessage || "Não foi possível atualizar o check-in.";
    return Response.json({ error: message }, { status: 400 });
  }
}
