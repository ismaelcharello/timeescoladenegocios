import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getGuestEventHistory } from "@/lib/event-checkin-store";
import GuestConversion from "./guest-conversion";
import TimeLogo from "@/app/time-logo";
import { Icon } from "@/app/app/icons";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = { expected: "Esperado", present: "Presente", absent: "Ausente", cancelled: "Cancelado" };

export default async function GuestHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/admin");
  if (!user.canManageEvents) {
    return <main className="event-checkin-denied"><section><TimeLogo variant="blue" className="event-checkin-state-logo" /><span>ÁREA RESTRITA</span><h1>Permissão de evento necessária.</h1><p>O histórico de convidados só fica disponível para perfis de coordenação autorizados.</p><Link href="/app">Ir para a área de membros</Link></section></main>;
  }
  const { id } = await params;
  const guestId = Number(id);
  if (!Number.isInteger(guestId) || guestId <= 0) notFound();
  const data = await getGuestEventHistory(guestId);
  if (!data) notFound();
  const hostName = data.host?.fullName || data.guest.hostName || "Sem anfitrião informado";
  const canConvert = user.isAdmin;

  const firstEventDate = data.firstEvent ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(data.firstEvent.startsAt)) : "Não informado";
  return <main className="event-checkin-shell"><header className="event-checkin-header"><div><Link href="/admin" className="event-checkin-brand" aria-label="TIME Escola de Negócios"><TimeLogo variant="blue" priority /></Link><Link href="/admin" className="event-checkin-back"><Icon name="back" size={16} /> Eventos</Link><span>CONTATO · CONVIDADO</span><h1>{data.guest.fullName}</h1><p>Convidado por {hostName}</p></div><span className="event-checkin-role">CONVIDADO</span></header><section className="guest-summary"><article><span>PRIMEIRO EVENTO</span><strong>{firstEventDate}</strong></article><article><span>PRESENÇAS</span><strong>{data.events.filter((event) => event.status === "present").length}</strong></article><article><span>MEMBRO OFICIAL</span><strong>{data.convertedMember?.fullName || "Ainda não vinculado"}</strong></article></section><section className="event-checkin-list member-event-history"><header><div><span>HISTÓRICO</span><h2>{data.events.length} {data.events.length === 1 ? "evento registrado" : "eventos registrados"}</h2></div></header>{data.events.length ? data.events.map((event) => <article key={event.attendeeId} className="event-checkin-participant"><div className="event-checkin-avatar" aria-hidden="true"><Icon name="clock" size={20} /></div><div className="event-checkin-person"><h3>{event.eventTitle}</h3><p>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(event.startsAt))}</p></div><div className="event-checkin-row-action"><span className={`event-checkin-status ${event.status}`}>{statusLabel[event.status] ?? event.status}</span><small>{event.checkedInAt ? `Check-in às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.checkedInAt))}` : "Sem check-in registrado"}</small></div></article>) : <div className="event-checkin-empty"><strong>Sem histórico ainda</strong><p>Os próximos eventos desta pessoa serão registrados aqui.</p></div>}</section>{canConvert ? <GuestConversion guestId={guestId} convertedMemberId={data.guest.convertedMemberId} candidates={data.candidates} /> : <p className="event-checkin-coordinator-note">Apenas administradores podem vincular este convidado a um membro oficial.</p>}</main>;
}
