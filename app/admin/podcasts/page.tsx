import Link from "next/link";
import AccessGate from "@/app/access-gate";
import { requireUser } from "@/lib/auth";
import PodcastAdmin from "./podcast-admin";
import TimeLogo from "@/app/time-logo";
import { Icon } from "@/app/app/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Podcasts | Administração TIME" };

export default async function PodcastAdminPage() {
  const user = await requireUser("/admin/podcasts");
  if (!user.isAdmin) return <AccessGate kind="admin" email={user.email} />;
  return <main className="podcast-admin-page"><header><div><Link href="/admin" className="podcast-admin-brand" aria-label="TIME Escola de Negócios"><TimeLogo variant="blue" priority /></Link><Link href="/admin"><Icon name="back" size={16} /> Voltar ao painel</Link><span>CONTEÚDO TIME</span><h1>Podcasts</h1><p>Cadastre apenas episódios reais e publique quando o link oficial estiver disponível.</p></div></header><PodcastAdmin /></main>;
}
