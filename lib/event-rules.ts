export type EventAvailability =
  | "open"
  | "last_spots"
  | "sold_out"
  | "registration_closed"
  | "completed"
  | "cancelled";

type EventRuleInput = {
  status: "draft" | "published" | "completed" | "cancelled";
  startsAt: string;
  endsAt?: string | null;
  registrationDeadline: string | null;
  capacity: number | null;
  occupied: number;
};

export function getEventAvailability(event: EventRuleInput, now = Date.now()): EventAvailability {
  if (event.status === "cancelled") return "cancelled";
  if (event.status === "completed" || (event.endsAt && Date.parse(event.endsAt) <= now)) return "completed";
  if (event.status !== "published") return "registration_closed";
  if (Date.parse(event.startsAt) <= now) return "registration_closed";
  if (event.registrationDeadline && Date.parse(event.registrationDeadline) <= now) return "registration_closed";
  if (event.capacity !== null && event.occupied >= event.capacity) return "sold_out";
  if (event.capacity !== null && event.capacity - event.occupied <= Math.max(3, Math.ceil(event.capacity * 0.1))) {
    return "last_spots";
  }
  return "open";
}

export function remainingSpots(capacity: number | null, occupied: number) {
  return capacity === null ? null : Math.max(0, capacity - occupied);
}

export function eventAcceptsRegistration(availability: EventAvailability) {
  return availability === "open" || availability === "last_spots";
}

export function normalizeGuestContact(email: string, phone: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail) return `email:${cleanEmail}`;
  const cleanPhone = phone.replace(/\D/g, "");
  return cleanPhone ? `phone:${cleanPhone}` : "";
}
