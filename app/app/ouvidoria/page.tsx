import { requireMemberAccess } from "@/lib/access";
import MemberShell from "../member-shell";
import OmbudsmanForm from "./ombudsman-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ouvidoria | TIME Escola de Negócios" };

export default async function OmbudsmanPage() {
  const access = await requireMemberAccess("/app/ouvidoria", "ombudsman");
  return <MemberShell active="ouvidoria" memberName={access.identity.fullName || access.identity.email.split("@")[0]} memberEmail={access.identity.email} isAdmin={access.identity.isAdmin}>
    <section className="simple-member-page simple-member-page-narrow">
      <header><span>CANAL PRIVADO</span><h1>Ouvidoria TIME</h1><p>Envie sugestões, reclamações, problemas ou feedback diretamente para a equipe responsável.</p></header>
      <OmbudsmanForm />
    </section>
  </MemberShell>;
}
