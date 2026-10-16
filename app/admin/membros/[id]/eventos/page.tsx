import Link from "next/link";
import { notFound } from "next/navigation";
import AccessGate from "@/app/access-gate";
import { requireUser } from "@/lib/auth";
import { getAdminMemberEventHistory } from "@/lib/event-checkin-store";
import TimeLogo from "@/app/time-logo";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  expected: "Esperado",
  present: "Presente",
  absent: "Ausente",
  cancelled: "Cancelado",
};

export default async function MemberEventHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/admin");
  if (!user.isAdmin) return <AccessGate kind="admin" email={user.email} />;

  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isInteger(memberId) || memberId <= 0) notFound();
  const history = await getAdminMemberEventHistory(memberId);
  if (!history) notFound();

  return <main className="event-checkin-shell"><header className="event-checkin-header"><div><Link href="/admin" className="event-checkin-brand" aria-label="TIME Escola de Negócios"><TimeLogo variant="blue" priority /></Link><Link href="/admin" className="event-checkin-back">← Administração</Link><span>MEMBRO · EVENTOS</span><h1>{history.member.fullName || "Membro TIME"}</h1><p>Histórico real de presença, disponível somente para administração.</p></div></header><section className="event-checkin-list member-event-history"><header><div><span>HISTÓRICO</span><h2>{history.events.length} {history.events.length === 1 ? "evento registrado" : "eventos registrados"}</h2></div></header>{history.events.length ? history.events.map((event) => <article key={event.attendeeId} className="event-checkin-participant"><div className="event-checkin-avatar" aria-hidden="true">◷</div><div className="event-checkin-person"><h3>{event.eventTitle}</h3><p>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(event.startsAt))}</p></div><div className="event-checkin-row-action"><span className={`event-checkin-status ${event.status}`}>{statusLabel[event.status] ?? event.status}</span><small>{event.checkedInAt ? `Check-in às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.checkedInAt))}` : "Sem check-in registrado"}</small></div></article>) : <div className="event-checkin-empty"><strong>Ainda não há histórico de eventos</strong><p>As presenças aparecerão aqui quando este membro for vinculado e confirmado em um evento.</p></div>}</section></main>;
}
