import Link from "next/link";
import { requireNetworkingAccess } from "@/lib/networking-access";
import { findConnections } from "@/lib/connection-matching";
import { memberInitials } from "@/lib/member-directory";
import MemberShell from "../member-shell";
import "../directory.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Encontrar uma conexão | TIME Escola de Negócios" };

type SearchParams = Promise<{ necessidade?: string }>;

export default async function ConnectionsPage({ searchParams }: { searchParams: SearchParams }) {
  const { identity: user } = await requireNetworkingAccess("/app/conexoes");
  const params = await searchParams;
  const query = (params.necessidade ?? "").slice(0, 180);
  const { matches, error } = await findConnections(query);

  return <MemberShell active="conexoes" memberName={user.fullName || user.email.split("@")[0]}>
    <section className="connection-hero">
      <span className="directory-kicker">MOTOR DE CONEXÕES TIME</span>
      <h1>Encontre quem pode ajudar no seu próximo passo.</h1>
      <p>Descreva a pessoa, empresa ou serviço que você procura. A TIME cruza sua necessidade com perfis reais cadastrados na comunidade.</p>
      <form className="connection-search" method="get">
        <label htmlFor="necessidade">De qual profissional, empresa ou serviço você precisa?</label>
        <textarea id="necessidade" name="necessidade" defaultValue={query} maxLength={180} rows={3} placeholder="Ex.: preciso de tráfego pago para uma clínica odontológica" />
        <button type="submit">Encontrar conexões</button>
      </form>
    </section>

    {query ? <section className="connection-results" aria-live="polite">
      <header><div><span className="directory-kicker">RESULTADO DA BUSCA</span><h2>{matches.length ? `${matches.length} conexão${matches.length === 1 ? "" : "ões"} encontrada${matches.length === 1 ? "" : "s"}` : "Ainda não encontramos um perfil compatível"}</h2></div><Link href="/app/conexoes">Nova busca</Link></header>
      {error ? <div className="directory-error" role="alert">{error}</div> : null}
      {matches.length ? <div className="connection-grid">{matches.map((member) => <article className="connection-card" key={member.user_id}>
        <div className="connection-card-top"><div className="member-avatar" role="img" aria-label={`Foto de ${member.full_name || "membro"}`} style={member.avatar_url ? { backgroundImage: `url(${member.avatar_url})` } : undefined}>{member.avatar_url ? "" : memberInitials(member.full_name)}</div><div><span>{member.segment || "Segmento não informado"}</span><h3>{member.full_name || "Perfil em atualização"}</h3><p>{[member.job_title, member.company_name, member.city].filter(Boolean).join(" · ")}</p></div><strong>{member.compatibility}%<small>compatível</small></strong></div>
        <p className="connection-reason">{member.reason}</p>
        <div className="member-tags">{member.matchedTerms.map((term) => <span key={term}>{term}</span>)}</div>
        <div className="member-card-actions"><Link href={`/app/membros/${member.user_id}`}>Ver perfil</Link><Link href={`/app/membros/${member.user_id}/whatsapp`}>Chamar no WhatsApp</Link></div>
      </article>)}</div> : <div className="directory-empty"><b>Nenhum membro com esse perfil ainda.</b><p>A necessidade foi consultada apenas contra perfis reais e visíveis. Tente usar termos mais amplos ou registre essa demanda com a equipe TIME.</p><Link className="directory-primary" href="/app/membros">Explorar o diretório</Link></div>}
    </section> : <section className="connection-empty-state"><span>COMO FUNCIONA</span><h2>Uma necessidade clara aproxima as pessoas certas.</h2><div><article><b>01</b><strong>Descreva o que procura</strong><p>Conte o contexto do seu negócio e o tipo de ajuda necessário.</p></article><article><b>02</b><strong>Veja os perfis compatíveis</strong><p>A busca considera apenas informações preenchidas por membros reais.</p></article><article><b>03</b><strong>Conecte diretamente</strong><p>Abra o perfil e inicie uma conversa pelo WhatsApp.</p></article></div></section>}
  </MemberShell>;
}
