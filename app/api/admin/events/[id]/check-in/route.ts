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
