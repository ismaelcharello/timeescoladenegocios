import Link from "next/link";
import { notFound } from "next/navigation";
import { requireNetworkingAccess } from "@/lib/networking-access";
import { getDirectoryProfile, memberInitials, safeExternalUrl } from "@/lib/member-directory";
import MemberShell from "../../member-shell";
import "../../directory.css";
import { Icon } from "../../icons";

export const dynamic = "force-dynamic";

function Section({ title, value }: { title: string; value: string | null }) {
  if (!value) return null;
  return <section className="profile-section"><h2>{title}</h2><p>{value}</p></section>;
}

function DataItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

export default async function MemberProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ contato?: string }> }) {
  const { id } = await params;
  const { identity: user } = await requireNetworkingAccess(`/app/membros/${id}`);
  const query = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const profile = await getDirectoryProfile(id);
  if (!profile) notFound();
  const name = profile.full_name || "Membro TIME";
  const location = [profile.city, profile.state].filter(Boolean).join(" · ");
  const role = [profile.job_title, profile.company_name].filter(Boolean).join(" · ");
  const links = [
    ["Site", safeExternalUrl(profile.website_url)],
    ["Instagram", safeExternalUrl(profile.instagram_url)],
    ["LinkedIn", safeExternalUrl(profile.linkedin_url)],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return <MemberShell active="membros" memberName={user.fullName || user.email.split("@")[0]} memberEmail={user.email} isAdmin={user.isAdmin}>
    <Link className="member-profile-back" href="/app/membros"><Icon name="back" size={16} /> Voltar para empresários</Link>
    {query.contato === "indisponivel" ? <div className="directory-error" role="status">Este membro ainda não disponibilizou um WhatsApp para contato.</div> : null}
    <section className="member-profile-hero">
      <div className="member-avatar" role="img" aria-label={`Foto de ${name}`} style={profile.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : undefined}>{profile.avatar_url ? "" : memberInitials(name)}</div>
      <div><span className="member-profile-location">{location || profile.segment || "COMUNIDADE TIME"}</span><h1>{name}</h1><p>{role || "Informações profissionais em atualização"}</p></div>
      <Link className="directory-primary" href={`/app/membros/${id}/whatsapp`}>Chamar no WhatsApp</Link>
    </section>
    <div className="member-profile-layout">
      <div className="member-profile-main">
        <Section title="Sobre a empresa" value={profile.company_description} />
        <Section title="Produtos e serviços" value={[profile.products, profile.services].filter(Boolean).join("\n\n") || null} />
        <Section title="Como pode ajudar outros membros" value={profile.how_can_help || profile.offers} />
        <Section title="O que procura na comunidade" value={profile.looking_for} />
      </div>
      <aside className="member-profile-side">
        <section className="profile-section">
          <h2>Informações profissionais</h2>
          <dl>
            <DataItem label="Empresa" value={profile.company_name} />
            <DataItem label="Segmento" value={profile.segment} />
            <DataItem label="Público atendido" value={profile.target_audience} />
            <DataItem label="Área de atuação" value={profile.service_area} />
            <DataItem label="Regiões atendidas" value={profile.regions_served} />
            <DataItem label="Diferenciais" value={profile.differentiators} />
          </dl>
        </section>
        {(profile.desired_professionals || profile.desired_referrals || profile.desired_partnerships) ? <section className="profile-section"><h2>Conexões desejadas</h2><dl><DataItem label="Profissionais" value={profile.desired_professionals} /><DataItem label="Indicações" value={profile.desired_referrals} /><DataItem label="Parcerias" value={profile.desired_partnerships} /></dl></section> : null}
        {links.length ? <section className="profile-section"><h2>Links oficiais</h2><div className="profile-links">{links.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer">{label}<Icon name="external" size={16} /></a>)}</div></section> : null}
      </aside>
    </div>
  </MemberShell>;
}
