import { getRequestIdentity } from "@/lib/auth";
import { getGuestEventHistory, linkGuestToMember } from "@/lib/event-checkin-store";

export const dynamic = "force-dynamic";

function guestIdFrom(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getRequestIdentity(request);
  if (!identity?.canManageEvents) return Response.json({ error: "Acesso de coordenação de eventos necessário." }, { status: 403 });
  const { id } = await params;
  const guestId = guestIdFrom(id);
  if (!guestId) return Response.json({ error: "Convidado inválido." }, { status: 400 });
  const guest = await getGuestEventHistory(guestId);
  return guest ? Response.json(guest) : Response.json({ error: "Convidado não encontrado." }, { status: 404 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getRequestIdentity(request);
  if (!identity?.isAdmin) return Response.json({ error: "Somente administração pode converter um convidado em membro." }, { status: 403 });
  const { id } = await params;
  const guestId = guestIdFrom(id);
  if (!guestId) return Response.json({ error: "Convidado inválido." }, { status: 400 });
  try {
    const body = await request.json() as { memberId?: unknown };
    const memberId = Number(body.memberId);
    if (!Number.isInteger(memberId) || memberId <= 0) return Response.json({ error: "Selecione o membro oficial correspondente." }, { status: 400 });
    await linkGuestToMember(guestId, memberId);
    const guest = await getGuestEventHistory(guestId);
    return Response.json({ ...guest, notice: "Histórico do convidado vinculado ao membro oficial." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível vincular o convidado." }, { status: 400 });
  }
}
