import Link from "next/link";
import AdminPlatform from "./admin-platform";
import AccessGate from "@/app/access-gate";
import { requireUser } from "@/lib/auth";
import { getManagedEvents } from "@/lib/event-checkin-store";
import { Icon } from "@/app/app/icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Administração | TIME Escola de Negócios",
  description: "Gestão de cursos, membros, comunidade e recorrência da TIME.",
};

export default async function AdminPage() {
  const user = await requireUser("/admin");
  if (!user.isAdmin) {
    if (user.canManageEvents) {
      const managedEvents = await getManagedEvents();
      return <main className="event-checkin-shell"><header className="event-checkin-header"><div><Link href="/app" className="event-checkin-back"><Icon name="back" size={16} /> Área de membros</Link><span>COORDENAÇÃO TIME</span><h1>Eventos e check-in</h1><p>Escolha o evento para confirmar chegadas e registrar convidados.</p></div><span className="event-checkin-role">COORDENAÇÃO</span></header><section className="admin-events-list">{managedEvents.map((event) => <article className="admin-surface-light" key={event.id}><div><span>EVENTO</span><h3>{event.title}</h3><p>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(event.startsAt))} · {event.summary.expected} esperados</p></div><div className="admin-event-breakdown"><span><b>{event.summary.present}</b> presentes</span><span><b>{event.summary.guestsPresent}</b> convidados presentes</span></div><Link href={`/admin/eventos/${event.id}/check-in`}>Abrir check-in</Link></article>)}</section></main>;
    }
    return <AccessGate kind="admin" email={user.email} />;
  }

  return (
    <AdminPlatform
      admin={{
        email: user.email,
        name: user.fullName || user.email.split("@")[0],
      }}
    />
  );
}
