import Link from "next/link";
import { requireUser } from "@/lib/auth";
import CheckInConsole from "./check-in-console";
import TimeLogo from "@/app/time-logo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Check-in de evento | TIME Escola de Negócios",
  description: "Controle de presença administrativo da TIME.",
};

export default async function EventCheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventId = Number(id);
  const user = await requireUser(`/admin/eventos/${id}/check-in`);
  if (!user.canManageEvents || !Number.isInteger(eventId) || eventId <= 0) {
    return <main className="event-checkin-denied"><section><TimeLogo variant="blue" className="event-checkin-state-logo" /><span>ÁREA RESTRITA</span><h1>Permissão de evento necessária.</h1><p>Check-in, convidados e presença só ficam disponíveis para perfis de coordenação autorizados.</p><Link href="/app">Ir para a área de membros</Link></section></main>;
  }
  return <CheckInConsole eventId={eventId} userRole={user.role} />;
}
