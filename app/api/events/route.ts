import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { checkInHistory, eventAttendees, eventGuests, events, members } from "@/db/schema";
import { getAuthorizedMember } from "@/lib/access";
import { eventAcceptsRegistration, getEventAvailability, normalizeGuestContact, remainingSpots } from "@/lib/event-rules";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseRegistration(value: unknown) {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { phone: cleanText(input.phone, 32), company: cleanText(input.company, 180), confirmed: input.confirmed === true };
}

async function activeCount(eventId: number) {
  const [row] = await getDb().select({ count: sql<number>`count(*)` }).from(eventAttendees)
    .where(and(eq(eventAttendees.eventId, eventId), ne(eventAttendees.status, "cancelled")));
  return Number(row?.count ?? 0);
}

export async function GET(request: Request) {
  const identity = await getAuthorizedMember(request, "events");
  if (!identity) return Response.json({ error: "Sua associação precisa estar ativa para acessar os eventos." }, { status: 403 });

  try {
    const db = getDb();
    const eventRows = await db.select().from(events)
      .where(inArray(events.status, ["published", "completed", "cancelled"]))
      .orderBy(desc(events.startsAt));
    const eventIds = eventRows.map((event) => event.id);
    const [attendees, memberRows] = await Promise.all([
      eventIds.length ? db.select().from(eventAttendees).where(inArray(eventAttendees.eventId, eventIds)) : Promise.resolve([]),
      db.select({ id: members.id }).from(members).where(eq(members.email, identity.email)).limit(1),
    ]);
    const memberId = memberRows[0]?.id ?? null;
    const guestIds = attendees.flatMap((attendee) => attendee.guestId ? [attendee.guestId] : []);
    const guests = guestIds.length ? await db.select().from(eventGuests).where(inArray(eventGuests.id, guestIds)) : [];
    const guestsById = new Map(guests.map((guest) => [guest.id, guest]));

    return Response.json({ events: eventRows.map((event) => {
      const people = attendees.filter((attendee) => attendee.eventId === event.id && attendee.status !== "cancelled");
      const own = memberId ? people.find((attendee) => attendee.memberId === memberId && attendee.attendeeType === "member") : null;
      const ownGuests = memberId ? people.filter((attendee) => attendee.attendeeType === "guest" && attendee.hostMemberId === memberId) : [];
      const availability = getEventAvailability({ ...event, occupied: people.length });
      return {
        id: event.id, slug: event.slug, title: event.title, description: event.description, bannerUrl: event.bannerUrl,
        startsAt: event.startsAt, endsAt: event.endsAt, locationName: event.locationName, city: event.city,
        status: event.status, availability, capacity: event.capacity, remainingSpots: remainingSpots(event.capacity, people.length),
        registrationDeadline: event.registrationDeadline, allowGuests: event.allowGuests,
        maxGuestsPerMember: event.maxGuestsPerMember, participantCount: people.length, registered: Boolean(own),
        registrationStatus: own?.status ?? null, registration: own ? { phone: own.phone, company: own.company } : null,
        guests: ownGuests.map((attendee) => {
          const guest = attendee.guestId ? guestsById.get(attendee.guestId) : null;
          return { id: attendee.id, name: attendee.displayName, email: guest?.email ?? "", phone: attendee.phone, status: attendee.status };
        }),
      };
    }) });
  } catch (error) {
    console.error("events:list failed", error);
    return Response.json({ error: "Não foi possível carregar os eventos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const identity = await getAuthorizedMember(request, "events");
  if (!identity) return Response.json({ error: "Sua associação precisa estar ativa para realizar esta ação." }, { status: 403 });
  let guestToCleanUp: number | null = null;

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const eventId = Number(payload.eventId);
    const action = payload.action;
    if (!Number.isInteger(eventId) || eventId < 1 || !["register", "cancel", "add-guest", "remove-guest"].includes(String(action))) {
      return Response.json({ error: "Solicitação inválida." }, { status: 400 });
    }
    const db = getDb();
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event || event.status === "draft") return Response.json({ error: "Evento não encontrado." }, { status: 404 });
    const occupied = await activeCount(eventId);
    const availability = getEventAvailability({ ...event, occupied });
    if ((action === "register" || action === "add-guest") && !eventAcceptsRegistration(availability)) {
      const message = availability === "sold_out" ? "Este evento está lotado." : availability === "cancelled" ? "Este evento foi cancelado." : "As inscrições para este evento estão encerradas.";
      return Response.json({ error: message, availability }, { status: 409 });
    }

    const displayName = identity.fullName || identity.email.split("@")[0];
    const now = new Date().toISOString();
    const registration = parseRegistration(payload.registration);
    if (action === "register" && (!registration.confirmed || registration.phone.replace(/\D/g, "").length < 8)) {
      return Response.json({ error: "Informe um WhatsApp válido e confirme sua presença." }, { status: 422 });
    }
    const [member] = await db.insert(members).values({
      email: identity.email, fullName: displayName, authUserId: identity.id, updatedAt: now,
      ...(action === "register" ? { phone: registration.phone } : {}),
    }).onConflictDoUpdate({
      target: members.email,
      set: { fullName: displayName, authUserId: identity.id, updatedAt: now, ...(action === "register" ? { phone: registration.phone } : {}) },
    }).returning();
    const [own] = await db.select().from(eventAttendees).where(and(
      eq(eventAttendees.eventId, eventId), eq(eventAttendees.memberId, member.id), eq(eventAttendees.attendeeType, "member"),
    )).limit(1);

    if (action === "cancel") {
      if (own?.status === "present") return Response.json({ error: "A presença já foi confirmada. Procure a equipe TIME para corrigir o check-in." }, { status: 409 });
      if (own) {
        await db.update(eventAttendees).set({ status: "cancelled", updatedAt: now }).where(eq(eventAttendees.id, own.id));
        await db.insert(checkInHistory).values({ attendeeId: own.id, previousStatus: own.status, newStatus: "cancelled", changedBy: identity.id, changedByEmail: identity.email });
      }
      const hostedGuests = await db.select().from(eventAttendees).where(and(
        eq(eventAttendees.eventId, eventId), eq(eventAttendees.hostMemberId, member.id),
        eq(eventAttendees.attendeeType, "guest"), ne(eventAttendees.status, "present"),
      ));
      for (const guest of hostedGuests) {
        if (guest.status === "cancelled") continue;
        await db.update(eventAttendees).set({ status: "cancelled", updatedAt: now }).where(eq(eventAttendees.id, guest.id));
        await db.insert(checkInHistory).values({ attendeeId: guest.id, previousStatus: guest.status, newStatus: "cancelled", changedBy: identity.id, changedByEmail: identity.email });
      }
      return Response.json({ registered: false });
    }

    if (action === "register") {
      if (own) {
        await db.update(eventAttendees).set({ rosterKey: `member:${member.id}`, displayName, company: registration.company,
          phone: registration.phone, status: own.status === "present" ? "present" : "expected", updatedAt: now })
          .where(eq(eventAttendees.id, own.id));
      } else {
        await db.insert(eventAttendees).values({ eventId, memberId: member.id, attendeeType: "member", rosterKey: `member:${member.id}`,
          displayName, company: registration.company, phone: registration.phone, status: "expected", updatedAt: now });
      }
      const nextOccupied = await activeCount(eventId);
      return Response.json({ registered: true, registration: { phone: registration.phone, company: registration.company }, remainingSpots: remainingSpots(event.capacity, nextOccupied) });
    }

    if (!own || own.status === "cancelled") return Response.json({ error: "Confirme primeiro a sua participação no evento." }, { status: 409 });
    if (action === "remove-guest") {
      const attendeeId = Number(payload.attendeeId);
      const [guestAttendee] = Number.isInteger(attendeeId) ? await db.select().from(eventAttendees).where(and(
        eq(eventAttendees.id, attendeeId), eq(eventAttendees.eventId, eventId),
        eq(eventAttendees.hostMemberId, member.id), eq(eventAttendees.attendeeType, "guest"),
      )).limit(1) : [];
      if (!guestAttendee) return Response.json({ error: "Convidado não encontrado." }, { status: 404 });
      if (guestAttendee.status === "present") return Response.json({ error: "O convidado já realizou check-in. Procure a equipe TIME." }, { status: 409 });
      await db.update(eventAttendees).set({ status: "cancelled", updatedAt: now }).where(eq(eventAttendees.id, guestAttendee.id));
      await db.insert(checkInHistory).values({ attendeeId: guestAttendee.id, previousStatus: guestAttendee.status, newStatus: "cancelled", changedBy: identity.id, changedByEmail: identity.email });
      return Response.json({ removed: true, attendeeId });
    }

    if (!event.allowGuests || event.maxGuestsPerMember < 1) return Response.json({ error: "Este evento não permite convidados." }, { status: 409 });
    const currentGuests = await db.select().from(eventAttendees).where(and(
      eq(eventAttendees.eventId, eventId), eq(eventAttendees.hostMemberId, member.id),
      eq(eventAttendees.attendeeType, "guest"), ne(eventAttendees.status, "cancelled"),
    ));
    if (currentGuests.length >= event.maxGuestsPerMember) return Response.json({ error: "Você atingiu o limite de convidados deste evento." }, { status: 409 });

    const guestInput = payload.guest && typeof payload.guest === "object" ? payload.guest as Record<string, unknown> : {};
    const fullName = cleanText(guestInput.name, 160);
    const email = cleanText(guestInput.email, 180).toLowerCase();
    const phone = cleanText(guestInput.phone, 32);
    const contactKey = normalizeGuestContact(email, phone);
    if (fullName.length < 3 || !contactKey) return Response.json({ error: "Informe o nome e o e-mail ou WhatsApp do convidado." }, { status: 422 });
    const registrationKey = `guest:${member.id}:${contactKey}`;
    const [duplicate] = await db.select({ id: eventAttendees.id }).from(eventAttendees).where(and(
      eq(eventAttendees.eventId, eventId), eq(eventAttendees.rosterKey, registrationKey), ne(eventAttendees.status, "cancelled"),
    )).limit(1);
    if (duplicate) return Response.json({ error: "Este convidado já está inscrito no evento." }, { status: 409 });

    const [guest] = await db.insert(eventGuests).values({ fullName, email, phone, hostMemberId: member.id,
      hostName: displayName, firstEventId: eventId, updatedAt: now }).returning();
    guestToCleanUp = guest.id;
    const [attendee] = await db.insert(eventAttendees).values({ eventId, guestId: guest.id, attendeeType: "guest",
      rosterKey: registrationKey, displayName: fullName, phone, hostMemberId: member.id, hostName: displayName,
      status: "expected", updatedAt: now }).returning();
    guestToCleanUp = null;
    return Response.json({ guest: { id: attendee.id, name: fullName, email, phone, status: attendee.status } }, { status: 201 });
  } catch (error) {
    if (guestToCleanUp) {
      try {
        await getDb().delete(eventGuests).where(eq(eventGuests.id, guestToCleanUp));
      } catch (cleanupError) {
        console.error("events:guest-cleanup failed", cleanupError);
      }
    }
    if (error instanceof Error && /EVENT_CAPACITY_REACHED/.test(error.message)) {
      return Response.json({ error: "A última vaga acabou de ser preenchida. Este evento está lotado." }, { status: 409 });
    }
    if (error instanceof Error && /EVENT_GUEST_LIMIT_REACHED/.test(error.message)) {
      return Response.json({ error: "O limite de convidados deste evento foi atingido." }, { status: 409 });
    }
    console.error("events:action failed", error);
    return Response.json({ error: "Não foi possível atualizar sua inscrição." }, { status: 500 });
  }
}
