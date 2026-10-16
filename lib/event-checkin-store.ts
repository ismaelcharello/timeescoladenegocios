import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  checkInHistory,
  eventAttendees,
  eventGuests,
  events,
  members,
} from "@/db/schema";
import {
  calculateCheckInSummary,
  restoreStatusFromHistory,
} from "@/lib/event-checkin";
import { normalizeGuestContact } from "@/lib/event-rules";

export type EventCheckInAction = "check-in" | "undo" | "add-guest" | "update-participant" | "finalize";

export type EventManagerIdentity = { id: string; email: string };

function cleanText(value: unknown, max = 240) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function rosterKey(displayName: string) {
  // O tipo é editável; a identidade de uma pessoa no evento não é.
  return `person:${normalized(displayName)}`;
}

function attendeePriority(attendee: { attendeeType: "member" | "guest"; status: "expected" | "present" | "absent" | "cancelled"; checkedInAt: string | null; id: number }) {
  const statusRank = attendee.status === "present" ? 0 : attendee.status === "expected" ? 1 : attendee.status === "absent" ? 2 : 3;
  // Um registro removido nunca pode prevalecer sobre uma pessoa ainda ativa.
  // Entre duas fichas ativas com o mesmo nome, o membro é o registro canônico.
  return [attendee.status === "cancelled" ? 1 : 0, attendee.attendeeType === "member" ? 0 : 1, statusRank, attendee.checkedInAt ? 0 : 1, attendee.id] as const;
}

/**
 * Corrige cópias criadas por versões antigas da lista antes de existir uma
 * chave única por pessoa/evento. A confirmação e o histórico da chegada são
 * preservados na linha prioritária, nunca simplesmente descartados.
 */
async function removeLegacyDuplicates(eventId: number) {
  const db = getDb();
  const rows = await db.select().from(eventAttendees).where(eq(eventAttendees.eventId, eventId));
  const groups = new Map<string, typeof rows>();
  for (const attendee of rows) {
    const key = attendee.rosterKey.startsWith("member:") || attendee.rosterKey.startsWith("guest:")
      ? attendee.rosterKey
      : rosterKey(attendee.displayName);
    const current = groups.get(key) ?? [];
    current.push(attendee);
    groups.set(key, current);
  }

  for (const [key, group] of groups) {
    const ordered = [...group].sort((left, right) => {
      const a = attendeePriority(left);
      const b = attendeePriority(right);
      return a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3] || a[4] - b[4];
    });
    const keeper = ordered[0];
    if (!keeper) continue;
    const presentCopy = group.find((person) => person.status === "present");
    const company = keeper.company || group.find((person) => person.company)?.company || "";
    const phone = keeper.phone || group.find((person) => person.phone)?.phone || "";
    for (const duplicate of ordered.slice(1)) {
      await db.update(checkInHistory).set({ attendeeId: keeper.id }).where(eq(checkInHistory.attendeeId, duplicate.id));
      await db.delete(eventAttendees).where(eq(eventAttendees.id, duplicate.id));
    }
    await db.update(eventAttendees).set({
      rosterKey: key,
      company,
      phone,
      status: presentCopy ? "present" : keeper.status,
      checkedInAt: presentCopy?.checkedInAt ?? keeper.checkedInAt,
      checkedInBy: presentCopy?.checkedInBy ?? keeper.checkedInBy,
      checkedInByEmail: presentCopy?.checkedInByEmail ?? keeper.checkedInByEmail,
      updatedAt: new Date().toISOString(),
    }).where(eq(eventAttendees.id, keeper.id));
  }
}

function eventSummaryFromRows(rows: Array<{ attendeeType: "member" | "guest"; status: "expected" | "present" | "absent" | "cancelled"; addedAtDoor: boolean }>) {
  return calculateCheckInSummary(rows);
}

export async function getManagedEvents() {
  const db = getDb();
  const eventRows = await db.select().from(events).orderBy(desc(events.startsAt));
  const attendees = eventRows.length
    ? await db.select().from(eventAttendees).where(inArray(eventAttendees.eventId, eventRows.map((event) => event.id)))
    : [];
  return eventRows.map((event) => {
    const summary = eventSummaryFromRows(attendees.filter((attendee) => attendee.eventId === event.id));
    return { ...event, summary };
  });
}

export async function getCheckInEvent(eventId: number) {
  await removeLegacyDuplicates(eventId);
  const db = getDb();
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return null;

  const attendeeRows = await db.select().from(eventAttendees).where(eq(eventAttendees.eventId, event.id)).orderBy(eventAttendees.displayName);
  const guestIds = attendeeRows.flatMap((row) => row.guestId ? [row.guestId] : []);
  const memberIds = [...new Set(attendeeRows.flatMap((row) => [row.memberId, row.hostMemberId].filter((id): id is number => Boolean(id))))];
  const [guestRows, memberRows, historyRows] = await Promise.all([
    guestIds.length ? db.select().from(eventGuests).where(inArray(eventGuests.id, guestIds)) : Promise.resolve([]),
    memberIds.length ? db.select().from(members).where(inArray(members.id, memberIds)) : Promise.resolve([]),
    attendeeRows.length ? db.select().from(checkInHistory).where(inArray(checkInHistory.attendeeId, attendeeRows.map((row) => row.id))).orderBy(desc(checkInHistory.changedAt)) : Promise.resolve([]),
  ]);
  const guestsById = new Map(guestRows.map((guest) => [guest.id, guest]));
  const membersById = new Map(memberRows.map((member) => [member.id, member]));
  const historyByAttendee = new Map<number, typeof historyRows>();
  for (const history of historyRows) {
    const current = historyByAttendee.get(history.attendeeId) ?? [];
    current.push(history);
    historyByAttendee.set(history.attendeeId, current);
  }

  const participants = attendeeRows.map((attendee) => {
    const guest = attendee.guestId ? guestsById.get(attendee.guestId) : null;
    const linkedMember = attendee.memberId ? membersById.get(attendee.memberId) : null;
    const host = attendee.hostMemberId ? membersById.get(attendee.hostMemberId) : null;
    const history = historyByAttendee.get(attendee.id) ?? [];
    return {
      id: attendee.id,
      attendeeType: attendee.attendeeType,
      displayName: attendee.displayName || guest?.fullName || linkedMember?.fullName || "Participante sem nome",
      company: attendee.company || guest?.company || "",
      phone: attendee.phone || guest?.phone || linkedMember?.phone || "",
      avatarUrl: attendee.avatarUrl,
      guestId: attendee.guestId,
      memberId: attendee.memberId,
      hostName: attendee.hostName || guest?.hostName || host?.fullName || "",
      host: host ? { id: host.id, fullName: host.fullName, phone: host.phone } : null,
      status: attendee.status,
      checkedInAt: attendee.checkedInAt,
      checkedInByEmail: attendee.checkedInByEmail,
      addedAtDoor: attendee.addedAtDoor,
      history: history.map((item) => ({
        id: item.id,
        previousStatus: item.previousStatus,
        newStatus: item.newStatus,
        changedByEmail: item.changedByEmail,
        changedAt: item.changedAt,
      })),
    };
  });

  // Pessoas removidas continuam no histórico, mas não voltam a aparecer na
  // operação da porta nem contam no resumo do evento.
  const visibleParticipants = participants.filter((participant) => participant.status !== "cancelled");
  const hostedMemberIds = new Set(attendeeRows
    .filter((attendee) => attendee.status !== "cancelled")
    .flatMap((attendee) => attendee.hostMemberId ? [attendee.hostMemberId] : []));
  const hostedNames = new Set(visibleParticipants
    .filter((participant) => participant.attendeeType === "guest" && participant.hostName)
    .map((participant) => normalized(participant.hostName)));

  return {
    event,
    participants: visibleParticipants.map((participant) => ({
      ...participant,
      isHost: participant.attendeeType === "member" && (
        (participant.memberId ? hostedMemberIds.has(participant.memberId) : false)
        || hostedNames.has(normalized(participant.displayName))
      ),
    })),
    summary: eventSummaryFromRows(visibleParticipants),
    hostCandidates: visibleParticipants
      .filter((participant) => participant.attendeeType === "member")
      .map((participant) => ({ attendeeId: participant.id, id: participant.memberId, fullName: participant.displayName })),
  };
}

/** Histórico administrativo de presença de um membro. Não é exposto à área comum. */
export async function getAdminMemberEventHistory(memberId: number) {
  const db = getDb();
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!member) return null;
  const rows = await db
    .select({
      attendeeId: eventAttendees.id,
      status: eventAttendees.status,
      checkedInAt: eventAttendees.checkedInAt,
      eventId: events.id,
      eventTitle: events.title,
      startsAt: events.startsAt,
    })
    .from(eventAttendees)
    .innerJoin(events, eq(eventAttendees.eventId, events.id))
    .leftJoin(eventGuests, eq(eventAttendees.guestId, eventGuests.id))
    .where(or(eq(eventAttendees.memberId, memberId), eq(eventGuests.convertedMemberId, memberId)))
    .orderBy(desc(events.startsAt));
  return { member, events: rows };
}

/** Contato/visitante persistente e seu histórico, restrito à gestão de eventos. */
export async function getGuestEventHistory(guestId: number) {
  const db = getDb();
  const [guest] = await db.select().from(eventGuests).where(eq(eventGuests.id, guestId)).limit(1);
  if (!guest) return null;
  const [host, convertedMember, firstEvent, eventRows, candidates] = await Promise.all([
    guest.hostMemberId ? db.select().from(members).where(eq(members.id, guest.hostMemberId)).limit(1) : Promise.resolve([]),
    guest.convertedMemberId ? db.select().from(members).where(eq(members.id, guest.convertedMemberId)).limit(1) : Promise.resolve([]),
    guest.firstEventId ? db.select().from(events).where(eq(events.id, guest.firstEventId)).limit(1) : Promise.resolve([]),
    db.select({
      attendeeId: eventAttendees.id,
      eventTitle: events.title,
      startsAt: events.startsAt,
      status: eventAttendees.status,
      checkedInAt: eventAttendees.checkedInAt,
    }).from(eventAttendees).innerJoin(events, eq(eventAttendees.eventId, events.id)).where(eq(eventAttendees.guestId, guestId)).orderBy(desc(events.startsAt)),
    db.select({ id: members.id, fullName: members.fullName, email: members.email }).from(members).orderBy(members.fullName),
  ]);
  return { guest, host: host[0] ?? null, convertedMember: convertedMember[0] ?? null, firstEvent: firstEvent[0] ?? null, events: eventRows, candidates };
}

/** Associa um visitante a um membro oficial sem reescrever suas presenças antigas. */
export async function linkGuestToMember(guestId: number, memberId: number) {
  const db = getDb();
  const [guest, member] = await Promise.all([
    db.select().from(eventGuests).where(eq(eventGuests.id, guestId)).limit(1),
    db.select().from(members).where(eq(members.id, memberId)).limit(1),
  ]);
  if (!guest[0]) throw new Error("Convidado não encontrado.");
  if (!member[0]) throw new Error("Membro selecionado não encontrado.");
  const now = new Date().toISOString();
  const [updated] = await db.update(eventGuests).set({ convertedMemberId: memberId, updatedAt: now }).where(eq(eventGuests.id, guestId)).returning();
  return updated;
}

async function getOwnedAttendee(eventId: number, attendeeId: number) {
  const [attendee] = await getDb()
    .select()
    .from(eventAttendees)
    .where(and(eq(eventAttendees.id, attendeeId), eq(eventAttendees.eventId, eventId)))
    .limit(1);
  return attendee ?? null;
}

async function recordChange(
  attendeeId: number,
  previousStatus: "expected" | "present" | "absent" | "cancelled",
  newStatus: "expected" | "present" | "absent" | "cancelled",
  identity: EventManagerIdentity,
) {
  await getDb().insert(checkInHistory).values({
    attendeeId,
    previousStatus,
    newStatus,
    changedBy: identity.id,
    changedByEmail: identity.email,
  });
}

export async function confirmArrival(eventId: number, attendeeId: number, identity: EventManagerIdentity) {
  const attendee = await getOwnedAttendee(eventId, attendeeId);
  if (!attendee) throw new Error("Participante não encontrado neste evento.");
  if (attendee.status === "cancelled") throw new Error("Um participante cancelado não pode receber check-in.");
  if (attendee.status === "present") return attendee;
  const now = new Date().toISOString();
  const [updated] = await getDb()
    .update(eventAttendees)
    .set({ status: "present", checkedInAt: now, checkedInBy: identity.id, checkedInByEmail: identity.email, updatedAt: now })
    .where(eq(eventAttendees.id, attendee.id))
    .returning();
  await recordChange(attendee.id, attendee.status, "present", identity);
  return updated;
}

export async function undoArrival(eventId: number, attendeeId: number, identity: EventManagerIdentity) {
  const attendee = await getOwnedAttendee(eventId, attendeeId);
  if (!attendee) throw new Error("Participante não encontrado neste evento.");
  if (attendee.status !== "present") throw new Error("Somente um check-in confirmado pode ser desfeito.");
  const previous = await getDb()
    .select()
    .from(checkInHistory)
    .where(eq(checkInHistory.attendeeId, attendee.id))
    .orderBy(desc(checkInHistory.changedAt))
    .limit(1);
  const nextStatus = restoreStatusFromHistory(previous);
  const now = new Date().toISOString();
  const [updated] = await getDb()
    .update(eventAttendees)
    .set({ status: nextStatus, checkedInAt: null, checkedInBy: null, checkedInByEmail: "", updatedAt: now })
    .where(eq(eventAttendees.id, attendee.id))
    .returning();
  await recordChange(attendee.id, "present", nextStatus, identity);
  return updated;
}

export async function addGuestAtDoor(eventId: number, payload: unknown, identity: EventManagerIdentity) {
  const input = payload as Record<string, unknown>;
  const fullName = cleanText(input.fullName, 160);
  if (fullName.length < 2) throw new Error("Informe o nome completo da pessoa.");
  const attendeeType = input.attendeeType === "member" ? "member" : "guest";
  const db = getDb();
  const hostAttendeeId = Number(input.hostAttendeeId);
  const hostAttendee = Number.isInteger(hostAttendeeId) && hostAttendeeId > 0
    ? await getOwnedAttendee(eventId, hostAttendeeId)
    : null;
  if (attendeeType === "guest" && hostAttendee && hostAttendee.attendeeType !== "member") throw new Error("O anfitrião precisa ser um membro deste evento.");
  const hostMemberId = typeof input.hostMemberId === "number" && Number.isInteger(input.hostMemberId) && input.hostMemberId > 0
    ? input.hostMemberId
    : hostAttendee?.memberId ?? null;
  const [host] = hostMemberId
    ? await getDb().select().from(members).where(eq(members.id, hostMemberId)).limit(1)
    : [];
  if (hostMemberId && !host) throw new Error("O anfitrião selecionado não foi encontrado.");
  const hostName = attendeeType === "guest" ? hostAttendee?.displayName || host?.fullName || cleanText(input.hostName, 160) : "";
  const now = new Date().toISOString();
  const [matchedMember] = attendeeType === "member"
    ? await db.select().from(members).where(eq(members.fullName, fullName)).limit(1)
    : [];
  const company = cleanText(input.company, 160);
  const phone = cleanText(input.phone, 40);
  const email = cleanText(input.email, 160).toLowerCase();
  const contactKey = normalizeGuestContact(email, phone);
  if (attendeeType === "guest" && !contactKey) throw new Error("Informe o e-mail ou WhatsApp do convidado.");
  const desiredKey = attendeeType === "member"
    ? matchedMember?.id ? `member:${matchedMember.id}` : rosterKey(fullName)
    : `guest:${hostMemberId ?? 0}:${contactKey}`;
  const [existing] = await db.select().from(eventAttendees).where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.rosterKey, desiredKey))).limit(1);
  if (existing) {
    if (input.checkInNow === true && existing.status !== "present") await confirmArrival(eventId, existing.id, identity);
    return (await getOwnedAttendee(eventId, existing.id))!;
  }
  const checkInNow = input.checkInNow === true;

  if (attendeeType === "member") {
    const [attendee] = await db
      .insert(eventAttendees)
      .values({
        eventId,
        memberId: matchedMember?.id ?? null,
        attendeeType: "member",
        rosterKey: desiredKey,
        displayName: fullName,
        company,
        phone: phone || matchedMember?.phone || "",
        status: checkInNow ? "present" : "expected",
        checkedInAt: checkInNow ? now : null,
        checkedInBy: checkInNow ? identity.id : null,
        checkedInByEmail: checkInNow ? identity.email : "",
        addedAtDoor: true,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: [eventAttendees.eventId, eventAttendees.rosterKey] })
      .returning();
    if (!attendee) throw new Error("Esta pessoa já está na lista do evento.");
    if (checkInNow) await recordChange(attendee.id, "expected", "present", identity);
    return attendee;
  }

  const [guest] = await db
    .insert(eventGuests)
    .values({
      fullName,
      phone,
      email,
      company,
      jobTitle: cleanText(input.jobTitle, 160),
      hostMemberId: host?.id ?? null,
      hostName,
      firstEventId: eventId,
      updatedAt: now,
    })
    .returning();
  let attendee: typeof eventAttendees.$inferSelect | undefined;
  try {
    [attendee] = await db
      .insert(eventAttendees)
      .values({
        eventId,
        guestId: guest.id,
        attendeeType: "guest",
        rosterKey: desiredKey,
        displayName: guest.fullName,
        company: guest.company,
        phone: guest.phone,
        hostMemberId: host?.id ?? null,
        hostName,
        status: checkInNow ? "present" : "expected",
        checkedInAt: checkInNow ? now : null,
        checkedInBy: checkInNow ? identity.id : null,
        checkedInByEmail: checkInNow ? identity.email : "",
        addedAtDoor: true,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: [eventAttendees.eventId, eventAttendees.rosterKey] })
      .returning();
  } catch (error) {
    await db.delete(eventGuests).where(eq(eventGuests.id, guest.id));
    throw error;
  }
  if (!attendee) {
    await db.delete(eventGuests).where(eq(eventGuests.id, guest.id));
    const retry = (await db.select().from(eventAttendees).where(eq(eventAttendees.eventId, eventId)))
      .find((person) => person.rosterKey === desiredKey);
    if (!retry) throw new Error("Não foi possível salvar o convidado. Tente novamente.");
    if (checkInNow && retry.status !== "present") await confirmArrival(eventId, retry.id, identity);
    return retry;
  }
  if (checkInNow) await recordChange(attendee.id, "expected", "present", identity);
  return attendee;
}

/** Edita os dados operacionais de uma pessoa na lista do evento. O tipo
 * "anfitrião" é uma relação: um membro passa a ser anfitrião ao ser escolhido
 * em um convidado, sem criar uma identidade paralela ou uma conta fictícia. */
export async function updateEventParticipant(eventId: number, attendeeId: number, payload: unknown, identity: EventManagerIdentity) {
  const attendee = await getOwnedAttendee(eventId, attendeeId);
  if (!attendee) throw new Error("Participante não encontrado neste evento.");
  const input = payload as Record<string, unknown>;
  const displayName = cleanText(input.fullName, 160);
  if (displayName.length < 2) throw new Error("Informe o nome completo da pessoa.");
  const attendeeType = input.attendeeType === "guest" ? "guest" : input.attendeeType === "member" ? "member" : null;
  if (!attendeeType) throw new Error("Selecione se a pessoa é membro do clube ou convidada.");
  const desiredKey = attendee.rosterKey.startsWith("member:") || attendee.rosterKey.startsWith("guest:")
    ? attendee.rosterKey
    : rosterKey(displayName);
  const eventPeople = await getDb().select().from(eventAttendees).where(eq(eventAttendees.eventId, eventId));
  const conflictingPerson = eventPeople.find((person) => person.id !== attendee.id && rosterKey(person.displayName) === desiredKey);
  if (conflictingPerson) throw new Error("Já existe uma pessoa com este nome neste evento. Edite ou exclua o cadastro existente para evitar duplicação.");

  const hostAttendeeId = Number(input.hostAttendeeId);
  let hostMemberId: number | null = null;
  let hostName = "";
  if (attendeeType === "guest" && Number.isInteger(hostAttendeeId) && hostAttendeeId > 0) {
    const hostAttendee = await getOwnedAttendee(eventId, hostAttendeeId);
    if (!hostAttendee || hostAttendee.attendeeType !== "member") throw new Error("O anfitrião precisa ser um membro deste evento.");
    hostMemberId = hostAttendee.memberId ?? null;
    hostName = hostAttendee.displayName;
  } else if (attendeeType === "guest") {
    hostName = cleanText(input.hostName, 160);
  }

  const company = cleanText(input.company, 160);
  const phone = cleanText(input.phone, 40);
  const now = new Date().toISOString();
  let guestId = attendee.guestId;
  const [matchedMember] = attendeeType === "member"
    ? await getDb().select().from(members).where(eq(members.fullName, displayName)).limit(1)
    : [];

  if (attendeeType === "guest") {
    if (!guestId) {
      const [guest] = await getDb().insert(eventGuests).values({
        fullName: displayName,
        company,
        phone,
        hostMemberId,
        hostName,
        firstEventId: eventId,
        updatedAt: now,
      }).returning();
      guestId = guest.id;
    } else {
      await getDb().update(eventGuests).set({
        fullName: displayName,
        company,
        phone,
        hostMemberId,
        hostName,
        updatedAt: now,
      }).where(eq(eventGuests.id, guestId));
    }
  }

  const [updated] = await getDb().update(eventAttendees).set({
    attendeeType,
    rosterKey: desiredKey,
    displayName,
    company,
    phone,
    memberId: attendeeType === "member" ? matchedMember?.id ?? attendee.memberId : null,
    guestId: attendeeType === "guest" ? guestId : null,
    hostMemberId: attendeeType === "guest" ? hostMemberId : null,
    hostName: attendeeType === "guest" ? hostName : "",
    updatedAt: now,
  }).where(eq(eventAttendees.id, attendee.id)).returning();

  // A ação fica registrada no histórico administrativo sem falsificar um
  // status: a linha "esperado → esperado" identifica uma edição de cadastro.
  await recordChange(attendee.id, attendee.status, attendee.status, identity);
  return updated;
}

/** Remove somente a ficha deste evento. Não apaga o perfil geral nem o
 * histórico de visitante; o cancelamento impede que a lista padrão recrie a
 * pessoa na próxima atualização. */
export async function removeEventParticipant(eventId: number, attendeeId: number, identity: EventManagerIdentity) {
  const attendee = await getOwnedAttendee(eventId, attendeeId);
  if (!attendee) throw new Error("Participante não encontrado neste evento.");
  const now = new Date().toISOString();
  await getDb().update(eventAttendees).set({
    status: "cancelled",
    checkedInAt: null,
    checkedInBy: null,
    checkedInByEmail: "",
    updatedAt: now,
  }).where(eq(eventAttendees.id, attendee.id));
  await recordChange(attendee.id, attendee.status, "cancelled", identity);
  return attendee;
}

export async function finalizeCheckIn(eventId: number, identity: EventManagerIdentity) {
  const remaining = await getDb()
    .select()
    .from(eventAttendees)
    .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.status, "expected")));
  const now = new Date().toISOString();
  for (const attendee of remaining) {
    await getDb()
      .update(eventAttendees)
      .set({ status: "absent", updatedAt: now })
      .where(eq(eventAttendees.id, attendee.id));
    await recordChange(attendee.id, "expected", "absent", identity);
  }
  return remaining.length;
}
