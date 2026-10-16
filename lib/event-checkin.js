/**
 * Regras puras do módulo de check-in. Mantê-las fora da rota torna a busca,
 * os totais e as transições testáveis sem depender do banco ou da interface.
 */
export const CHECK_IN_STATUSES = ["expected", "present", "absent", "cancelled"];

export function normalizedText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesParticipantSearch(participant, query) {
  const terms = normalizedText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = normalizedText([
    participant.displayName,
    participant.company,
    participant.hostName,
    participant.host?.fullName,
  ].filter(Boolean).join(" "));
  return terms.every((term) => haystack.includes(term));
}

export function calculateCheckInSummary(participants) {
  const initial = {
    expected: 0,
    present: 0,
    absent: 0,
    cancelled: 0,
    members: 0,
    guests: 0,
    membersPresent: 0,
    guestsPresent: 0,
    addedAtDoor: 0,
  };

  return participants.reduce((summary, participant) => {
    // Removidos da lista não entram no resumo operacional nem são reintroduzidos.
    if (participant.status === "cancelled") {
      summary.cancelled += 1;
      return summary;
    }
    // `expected` é o total que a equipe esperava receber no evento — não a
    // quantidade de pessoas com o status `expected`. Assim os indicadores
    // permanecem corretos depois de check-ins e ausências.
    summary.expected += 1;
    if (participant.status === "present") summary.present += 1;
    if (participant.status === "absent") summary.absent += 1;
    if (participant.attendeeType === "guest") {
      summary.guests += 1;
      if (participant.status === "present") summary.guestsPresent += 1;
      if (participant.addedAtDoor) summary.addedAtDoor += 1;
    } else {
      summary.members += 1;
      if (participant.status === "present") summary.membersPresent += 1;
    }
    return summary;
  }, initial);
}

export function canConfirmArrival(status) {
  return status === "expected" || status === "absent";
}

export function restoreStatusFromHistory(history) {
  const latest = history?.[0];
  if (!latest || latest.newStatus !== "present") return "expected";
  return CHECK_IN_STATUSES.includes(latest.previousStatus) ? latest.previousStatus : "expected";
}
