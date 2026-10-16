import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, eventAttendees, events } from "@/db/schema";
import { getRequestIdentity } from "@/lib/auth";
import { getManagedEvents } from "@/lib/event-checkin-store";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(6_000).default(""),
  bannerUrl: z.string().trim().max(2_000).default(""),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  locationName: z.string().trim().max(260).default(""),
  city: z.string().trim().max(120).default(""),
  capacity: z.number().int().min(1).max(100_000).nullable().optional(),
  registrationDeadline: z.string().datetime().nullable().optional(),
  allowGuests: z.boolean().default(false),
  maxGuestsPerMember: z.number().int().min(0).max(20).default(0),
  status: z.enum(["draft", "published", "completed", "cancelled"]).default("draft"),
});

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || `evento-${Date.now()}`;
}

function safeBannerUrl(value: string) {
  if (!value) return "";
  if (value.startsWith("/api/uploads?key=event-banners%2F") || value.startsWith("/api/uploads?key=event-banners/")) return value;
  try { return new URL(value).protocol === "https:" ? value : ""; } catch { return ""; }
}

async function authorize(request: Request) {
  const identity = await getRequestIdentity(request);
  return identity?.canManageEvents ? identity : null;
}

async function audit(identity: { id: string; email: string }, action: string, eventId: number, details: Record<string, unknown> = {}) {
  await getDb().insert(auditLogs).values({
    actorUserId: identity.id,
    actorEmail: identity.email,
    action,
    entityType: "event",
    entityId: String(eventId),
    detailsJson: JSON.stringify(details),
  });
}

export async function GET(request: Request) {
  if (!(await authorize(request))) return Response.json({ error: "Acesso de coordenação de eventos necessário." }, { status: 403 });
  try { return Response.json({ events: await getManagedEvents() }); }
  catch (error) {
    console.error("admin-events:list failed", error);
    return Response.json({ error: "Não foi possível carregar os eventos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const identity = await authorize(request);
  if (!identity) return Response.json({ error: "Acesso de coordenação de eventos necessário." }, { status: 403 });
  try {
    const parsed = eventSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Revise os dados do evento." }, { status: 422 });
    const input = parsed.data;
    if (input.endsAt && Date.parse(input.endsAt) <= Date.parse(input.startsAt)) return Response.json({ error: "O encerramento deve ocorrer depois do início." }, { status: 422 });
    if (input.registrationDeadline && Date.parse(input.registrationDeadline) > Date.parse(input.startsAt)) return Response.json({ error: "O prazo de inscrição não pode ser posterior ao início." }, { status: 422 });
    const now = new Date().toISOString();
    const [event] = await getDb().insert(events).values({
      slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
      title: input.title,
      description: input.description,
      bannerUrl: safeBannerUrl(input.bannerUrl),
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      locationName: input.locationName,
      city: input.city,
      capacity: input.capacity ?? null,
      registrationDeadline: input.registrationDeadline ?? null,
      allowGuests: input.allowGuests,
      maxGuestsPerMember: input.allowGuests ? input.maxGuestsPerMember : 0,
      status: input.status,
      updatedAt: now,
    }).returning();
    await audit(identity, "event.created", event.id, { status: event.status });
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    console.error("admin-events:create failed", error);
    return Response.json({ error: "Não foi possível criar o evento." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const identity = await authorize(request);
  if (!identity) return Response.json({ error: "Acesso de coordenação de eventos necessário." }, { status: 403 });
  try {
    const parsed = eventSchema.safeParse(await request.json());
    if (!parsed.success || !parsed.data.id) return Response.json({ error: "Revise os dados do evento." }, { status: 422 });
    const input = parsed.data;
    const eventId = Number(input.id);
    const [current] = await getDb().select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!current) return Response.json({ error: "Evento não encontrado." }, { status: 404 });
    if (input.endsAt && Date.parse(input.endsAt) <= Date.parse(input.startsAt)) return Response.json({ error: "O encerramento deve ocorrer depois do início." }, { status: 422 });
    if (input.registrationDeadline && Date.parse(input.registrationDeadline) > Date.parse(input.startsAt)) return Response.json({ error: "O prazo de inscrição não pode ser posterior ao início." }, { status: 422 });
    const [occupancy] = await getDb().select({ count: sql<number>`count(*)` }).from(eventAttendees).where(and(
      eq(eventAttendees.eventId, eventId), ne(eventAttendees.status, "cancelled"),
    ));
    if (input.capacity !== null && input.capacity !== undefined && input.capacity < Number(occupancy?.count ?? 0)) {
      return Response.json({ error: "A capacidade não pode ser menor que o número atual de inscritos." }, { status: 409 });
    }
    const [event] = await getDb().update(events).set({
      title: input.title,
      description: input.description,
      bannerUrl: safeBannerUrl(input.bannerUrl),
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      locationName: input.locationName,
      city: input.city,
      capacity: input.capacity ?? null,
      registrationDeadline: input.registrationDeadline ?? null,
      allowGuests: input.allowGuests,
      maxGuestsPerMember: input.allowGuests ? input.maxGuestsPerMember : 0,
      status: input.status,
      updatedAt: new Date().toISOString(),
    }).where(eq(events.id, eventId)).returning();
    await audit(identity, "event.updated", event.id, { previousStatus: current.status, status: event.status });
    return Response.json({ event });
  } catch (error) {
    console.error("admin-events:update failed", error);
    return Response.json({ error: "Não foi possível atualizar o evento." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const identity = await authorize(request);
  if (!identity) return Response.json({ error: "Acesso de coordenação de eventos necessário." }, { status: 403 });
  try {
    const body = await request.json() as { id?: number };
    const eventId = Number(body.id);
    if (!Number.isInteger(eventId) || eventId < 1) return Response.json({ error: "Evento inválido." }, { status: 400 });
    const [attendee] = await getDb().select({ id: eventAttendees.id }).from(eventAttendees).where(eq(eventAttendees.eventId, eventId)).limit(1);
    if (attendee) return Response.json({ error: "Eventos com inscrições não podem ser excluídos. Cancele ou despublique para preservar o histórico." }, { status: 409 });
    const [removed] = await getDb().delete(events).where(eq(events.id, eventId)).returning({ id: events.id });
    if (!removed) return Response.json({ error: "Evento não encontrado." }, { status: 404 });
    await audit(identity, "event.deleted", eventId);
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("admin-events:delete failed", error);
    return Response.json({ error: "Não foi possível excluir o evento." }, { status: 500 });
  }
}
