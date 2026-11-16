import Link from "next/link";
import { requireNetworkingAccess } from "@/lib/networking-access";
import { findConnections, type ConnectionMatch } from "@/lib/connection-matching";
import { memberInitials } from "@/lib/member-directory";
import { loadMemberProfile } from "@/lib/member-profile-store";
import { profileToDraft } from "@/lib/member-profile";
import MemberShell from "../member-shell";
import "../directory.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Encontrar uma conexão | TIME Escola de Negócios" };

type SearchParams = Promise<{ necessidade?: string }>;

const CONFIANCA: Record<ConnectionMatch["confidence"], string> = {
  alta: "Perfil completo: sugestão com boa base",
  media: "Perfil parcial: complete-o para sugestões melhores",
  baixa: "Pouco preenchido: a sugestão usa só o que você digitou",
};

function MatchCard({ member }: { member: ConnectionMatch }) {
  return <article className="connection-card">
    <div className="connection-card-top">
      <div className="member-avatar" role="img" aria-label={`Foto de ${member.full_name || "membro"}`} style={member.avatar_url ? { backgroundImage: `url(${member.avatar_url})` } : undefined}>{member.avatar_url ? "" : memberInitials(member.full_name)}</div>
      <div><span>{member.segment || "Segmento não informado"}</span><h3>{member.full_name || "Perfil em atualização"}</h3><p>{[member.job_title, member.company_name, member.city].filter(Boolean).join(" · ")}</p></div>
      <strong aria-label={`${member.compatibility} por cento de compatibilidade`}>{member.compatibility}%<small>compatível</small></strong>
    </div>
    <ul className="connection-reasons">{member.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
    {member.matchedTerms.length ? <div className="member-tags">{member.matchedTerms.map((term) => <span key={term}>{term}</span>)}</div> : null}
    {member.notEvaluated.length ? <p className="connection-not-evaluated">{member.notEvaluated.join(" ")}</p> : null}
    <div className="member-card-actions"><Link href={`/app/membros/${member.user_id}`}>Ver perfil</Link><Link href={`/app/membros/${member.user_id}/whatsapp`}>Chamar no WhatsApp</Link></div>
  </article>;
}

export default async function ConnectionsPage({ searchParams }: { searchParams: SearchParams }) {
  const { identity: user } = await requireNetworkingAccess("/app/conexoes");
  const params = await searchParams;
  const query = (params.necessidade ?? "").slice(0, 180);
  const draft = profileToDraft(await loadMemberProfile(user.id), user.fullName);
  const { matches, error, hint } = await findConnections(query, draft, { excludeUserId: user.id });
  const confidence = matches[0]?.confidence;
  const titulo = query
    ? (matches.length ? `${matches.length} conexão${matches.length === 1 ? "" : "ões"} encontrada${matches.length === 1 ? "" : "s"}` : "Ainda não encontramos um perfil compatível")
    : (matches.length ? "Sugeridas a partir do seu perfil" : "Sem sugestões por enquanto");

  return <MemberShell active="conexoes" memberName={user.fullName || user.email.split("@")[0]} memberEmail={user.email} isAdmin={user.isAdmin}>
    <section className="connection-hero">
      <span className="directory-kicker">MOTOR DE CONEXÕES TIME</span>
      <h1>Encontre quem pode ajudar no seu próximo passo.</h1>
      <p>Descreva a pessoa, empresa ou serviço que você procura. A TIME cruza sua necessidade com perfis reais cadastrados na comunidade e explica cada sugestão.</p>
      <form className="connection-search" method="get">
        <label htmlFor="necessidade">De qual profissional, empresa ou serviço você precisa?</label>
        <textarea id="necessidade" name="necessidade" defaultValue={query} maxLength={180} rows={3} placeholder="Ex.: preciso de tráfego pago para uma clínica odontológica" />
        <button type="submit">Encontrar conexões</button>
      </form>
    </section>

    <section className="connection-results" aria-live="polite">
      <header>
        <div><span className="directory-kicker">{query ? "RESULTADO DA BUSCA" : "PARA VOCÊ"}</span><h2>{titulo}</h2>{confidence ? <p className="connection-confidence" data-confidence={confidence}>{CONFIANCA[confidence]}</p> : null}</div>
        {query ? <Link href="/app/conexoes">Nova busca</Link> : <Link href="/app/cadastro">Editar meu perfil</Link>}
      </header>
      {error ? <div className="directory-error" role="alert">{error}</div> : null}
      {matches.length ? <div className="connection-grid">{matches.map((member) => <MatchCard member={member} key={member.user_id} />)}</div>
        : <div className="directory-empty">
          <b>{hint ? "Falta uma informação sua." : query ? "Nenhum membro com esse perfil ainda." : "Nenhuma sugestão ainda."}</b>
          <p>{hint || (query ? "A necessidade foi consultada apenas contra perfis reais e visíveis. Tente termos mais amplos ou registre essa demanda com a equipe TIME." : "Conte no seu perfil o que você procura: é daí que saem as sugestões.")}</p>
          <Link className="directory-primary" href={hint ? "/app/cadastro" : "/app/membros"}>{hint ? "Completar meu perfil" : "Explorar o diretório"}</Link>
        </div>}
    </section>
  </MemberShell>;
}
