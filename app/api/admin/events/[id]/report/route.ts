import { getRequestIdentity } from "@/lib/auth";
import { getCheckInEvent } from "@/lib/event-checkin-store";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getRequestIdentity(request);
  if (!identity?.canManageEvents) return Response.json({ error: "Acesso de coordenação necessário." }, { status: 403 });
  const eventId = Number((await params).id);
  if (!Number.isInteger(eventId) || eventId < 1) return Response.json({ error: "Evento inválido." }, { status: 400 });
  const data = await getCheckInEvent(eventId);
  if (!data) return Response.json({ error: "Evento não encontrado." }, { status: 404 });

  const rows = [
    ["Nome", "Tipo", "Empresa", "Contato", "Anfitrião", "Status", "Check-in"],
    ...data.participants.map((participant) => [
      participant.displayName,
      participant.attendeeType === "guest" ? "Convidado" : "Membro",
      participant.company,
      participant.phone,
      participant.hostName,
      participant.status,
      participant.checkedInAt ?? "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="evento-${eventId}-participantes.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
