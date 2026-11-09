import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { eventAttendees, events, members } from "@/db/schema";
import { getAuthorizedMember } from "@/lib/access";
import { resolveTicketSecret, signTicket } from "@/lib/event-ticket";

export const dynamic = "force-dynamic";

/**
 * Ingressos do membro para um evento: o dele e os dos convidados que ele trouxe.
 * Só emite para quem está inscrito (e não cancelou). O token carrega ids e uma
 * assinatura, nunca dados pessoais — ver lib/event-ticket.ts.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getAuthorizedMember(request, "events");
  if (!identity) return Response.json({ error: "Sua associação precisa estar ativa para ver o ingresso." }, { status: 403 });

  const eventId = Number((await params).id);
  if (!Number.isInteger(eventId) || eventId < 1) return Response.json({ error: "Evento inválido." }, { status: 400 });

  const secret = resolveTicketSecret(process.env as { TICKET_SECRET?: string }, import.meta.env.DEV);
  if (!secret) {
    // Sem segredo configurado, recusar é mais seguro que assinar com um previsível.
    return Response.json({ error: "Ingressos indisponíveis no momento." }, { status: 503 });
  }

  const db = getDb();
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event || event.status === "draft") return Response.json({ error: "Evento não encontrado." }, { status: 404 });

  const [member] = await db.select().from(members).where(eq(members.email, identity.email)).limit(1);
  if (!member) return Response.json({ error: "Você não está inscrito neste evento." }, { status: 404 });

  const own = await db.select().from(eventAttendees).where(and(
    eq(eventAttendees.eventId, eventId), eq(eventAttendees.memberId, member.id),
    eq(eventAttendees.attendeeType, "member"), ne(eventAttendees.status, "cancelled"),
  )).limit(1);
  if (!own.length) return Response.json({ error: "Você não está inscrito neste evento." }, { status: 404 });

  const guests = await db.select().from(eventAttendees).where(and(
    eq(eventAttendees.eventId, eventId), eq(eventAttendees.hostMemberId, member.id),
    eq(eventAttendees.attendeeType, "guest"), ne(eventAttendees.status, "cancelled"),
  ));

  const tickets = await Promise.all([...own, ...guests].map(async (attendee) => ({
    attendeeId: attendee.id,
    type: attendee.attendeeType,
    name: attendee.displayName,
    status: attendee.status,
    token: await signTicket({ eventId, attendeeId: attendee.id }, secret),
  })));

  return Response.json({
    event: { id: event.id, title: event.title, startsAt: event.startsAt, locationName: event.locationName, city: event.city },
    tickets,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
