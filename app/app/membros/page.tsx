import Link from "next/link";
import { requireNetworkingAccess } from "@/lib/networking-access";
import { memberInitials, searchDirectory } from "@/lib/member-directory";
import MemberShell from "../member-shell";
import "../directory.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Empresários | TIME Escola de Negócios" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input.slice(0, 100) : "";
}

function excerpt(input: string | null, max = 150) {
  if (!input) return "Este membro ainda não adicionou uma apresentação curta.";
  return input.length > max ? `${input.slice(0, max).trim()}…` : input;
}

function tags(...inputs: Array<string | null>) {
  return inputs
    .flatMap((input) => (input ?? "").split(/[,;\n]/))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export default async function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  const { identity: user } = await requireNetworkingAccess("/app/membros");
  const params = await searchParams;
  const filters = {
    search: value(params.busca),
    segment: value(params.segmento),
    city: value(params.cidade),
    service: value(params.servico),
  };
  const { members, error } = await searchDirectory(filters);
  const hasFilters = Object.values(filters).some(Boolean);

  return <MemberShell active="membros" memberName={user.fullName || user.email.split("@")[0]} memberEmail={user.email} isAdmin={user.isAdmin}>
    <section className="directory-hero">
      <span className="directory-kicker">DIRETÓRIO EMPRESARIAL</span>
      <h1>Quem pode ajudar no seu próximo passo?</h1>
      <p>Pesquise entre os empresários da comunidade por nome, empresa, segmento, especialidade ou serviço.</p>
      <form className="directory-search" method="get">
        <input name="busca" defaultValue={filters.search} maxLength={100} aria-label="Buscar empresários" placeholder="Ex.: tráfego pago para clínicas, designer, fornecedor…" />
        <button type="submit">Buscar na comunidade</button>
      </form>
    </section>

    <div className="directory-layout">
      <form className="directory-filters" method="get">
        {filters.search ? <input type="hidden" name="busca" value={filters.search} /> : null}
        <header><h2>Filtros</h2>{hasFilters ? <Link href="/app/membros">Limpar</Link> : null}</header>
        <label className="directory-field"><span>Segmento</span><input name="segmento" defaultValue={filters.segment} maxLength={100} placeholder="Ex.: Saúde" /></label>
        <label className="directory-field"><span>Cidade</span><input name="cidade" defaultValue={filters.city} maxLength={100} placeholder="Ex.: São Paulo" /></label>
        <label className="directory-field"><span>Serviço</span><input name="servico" defaultValue={filters.service} maxLength={100} placeholder="Ex.: Consultoria" /></label>
        <button type="submit">Aplicar filtros</button>
      </form>

      <section>
        <header className="directory-results-header">
          <div><h2>{hasFilters ? "Resultados encontrados" : "Empresários da TIME"}</h2><p>{members.length} {members.length === 1 ? "perfil disponível" : "perfis disponíveis"}</p></div>
        </header>
        {error ? <div className="directory-error" role="alert">{error}</div> : null}
        {!error && members.length ? <div className="directory-grid">
          {members.map((member) => {
            const label = [member.job_title, member.company_name].filter(Boolean).join(" · ");
            return <article className="member-card" key={member.user_id}>
              <div className="member-avatar" role="img" aria-label={`Foto de ${member.full_name || "membro"}`} style={member.avatar_url ? { backgroundImage: `url(${member.avatar_url})` } : undefined}>{member.avatar_url ? "" : memberInitials(member.full_name)}</div>
              <div className="member-card-copy">
                <span>{member.segment || "Segmento não informado"}</span>
                <h3><Link href={`/app/membros/${member.user_id}`}>{member.full_name || "Perfil em atualização"}</Link></h3>
                <p className="member-role">{label || "Informações profissionais em atualização"}</p>
              </div>
              <p className="member-description">{excerpt(member.company_description || member.offers)}</p>
              <div className="member-card-context">
                <div><span>OFERECE</span><p>{excerpt(member.offers || member.services, 92)}</p></div>
                <div><span>ATUA EM</span><p>{excerpt(member.service_area, 92)}</p></div>
              </div>
              {tags(member.services, member.offers, member.service_area).length ? <div className="member-tags">{tags(member.services, member.offers, member.service_area).map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
              <div className="member-card-actions">
                <Link href={`/app/membros/${member.user_id}`}>Ver perfil</Link>
                <Link href={`/app/membros/${member.user_id}/whatsapp`}>Chamar no WhatsApp</Link>
              </div>
            </article>;
          })}
        </div> : null}
        {!error && !members.length ? <div className="directory-empty"><b>Nenhum perfil compatível</b><p>{hasFilters ? "Tente retirar um filtro ou usar termos mais amplos. A busca usa apenas informações reais cadastradas pelos membros." : "Ainda não há perfis empresariais concluídos e visíveis no diretório."}</p></div> : null}
      </section>
    </div>
  </MemberShell>;
}
