"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import StripeFinanceAdmin from "./stripe-finance";
import { courseThumbnailLibrary } from "@/lib/course-thumbnails";
import TimeLogo from "@/app/time-logo";

type AdminSection = "visao" | "cursos" | "membros" | "eventos" | "comunidade" | "beneficios" | "ouvidoria" | "tutor" | "financeiro" | "config";
type AdminIdentity = { email: string; name: string };
type AdminLesson = {
  id: number;
  moduleId: number | null;
  moduleTitle: string;
  title: string;
  description: string;
  durationSeconds: number;
  position: number;
  status: "draft" | "published";
  videoUrl: string;
  materials: Array<{ id: number; title: string; kind: "file" | "link"; storageKey: string | null; externalUrl: string | null; mimeType: string; status: "draft" | "published" }>;
  reviews: Array<{ id: number; authorName: string | null; memberEmail: string; rating: number; comment: string; status: "published" | "hidden" }>;
};
type AdminModule = {
  id: number;
  title: string;
  description: string;
  position: number;
  status: "draft" | "published";
  lessonCount: number;
};
type AdminCourse = {
  id: number;
  title: string;
  description: string;
  teacher: string;
  category: string;
  thumbnailUrl: string;
  position: number;
  status: "draft" | "published" | "archived";
  lessonCount: number;
  startedMembers: number;
  completedLessons: number;
  modules: AdminModule[];
  lessons: AdminLesson[];
  updatedAt: string;
};
type AdminMember = {
  id: number;
  email: string;
  fullName: string;
  accessStatus: "pending" | "active" | "complimentary" | "past_due" | "canceled" | "blocked";
  accessExpiresAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  watchSeconds: number;
  completedLessons: number;
};
type AdminPost = {
  id: number;
  authorName: string;
  content: string;
  official: boolean;
  likesCount: number;
  commentsCount: number;
  status: string;
  createdAt: string;
};
type AdminData = {
  stats: {
    members: number;
    activeMembers: number;
    attentionMembers: number;
    watchSeconds: number;
    completedLessons: number;
    publishedCourses: number;
    draftCourses: number;
  };
  members: AdminMember[];
  courses: AdminCourse[];
  community: { published: number; pending: number; interactions: number; posts: AdminPost[] };
  tutor: {
    openaiConfigured: boolean;
    model: string;
    publishedCourses: number;
    authorizedLessons: number;
    describedLessons: number;
  };
};

const adminMenu: Array<{ id: AdminSection; icon: string; label: string }> = [
  { id: "visao", icon: "▦", label: "Visão geral" },
  { id: "cursos", icon: "▶", label: "Cursos e aulas" },
  { id: "membros", icon: "◉", label: "Membros" },
  { id: "eventos", icon: "◷", label: "Eventos e check-in" },
  { id: "comunidade", icon: "◇", label: "Comunidade" },
  { id: "beneficios", icon: "✧", label: "Clube de Benefícios" },
  { id: "ouvidoria", icon: "▤", label: "Ouvidoria" },
  { id: "tutor", icon: "✦", label: "Tutor TIME IA" },
  { id: "financeiro", icon: "↗", label: "Assinaturas" },
  { id: "config", icon: "⚙", label: "Configurações" },
];

const adminMobileMenu = adminMenu.filter((item) => ["visao", "cursos", "eventos", "membros"].includes(item.id));

const benefitCategories = ["Alimentação", "Farmácias", "Saúde", "Academias", "Combustível", "Viagens", "Educação", "Varejo", "Serviços", "Entretenimento"] as const;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "T";
}

function formatTime(seconds: number) {
  if (!seconds) return "0 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}min`;
}

function formatDate(value?: string | null) {
  if (!value) return "Sem acesso registrado";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(timestamp));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Ativo",
    complimentary: "Isento",
    pending: "Pendente",
    past_due: "Pagamento em atraso",
    canceled: "Cancelado",
    blocked: "Bloqueado",
    published: "Publicado",
    draft: "Rascunho",
    archived: "Arquivado",
  };
  return labels[status] ?? status;
}

function AdminHeading({ kicker, title, description, action, actionLabel = "+ Novo curso" }: { kicker: string; title: string; description: string; action?: () => void; actionLabel?: string }) {
  return <header className="admin-heading"><div><span>{kicker}</span><h1>{title}</h1><p>{description}</p></div>{action ? <button className="admin-primary-button" onClick={action}>{actionLabel}</button> : null}</header>;
}

function AdminLoading({ label = "Carregando dados reais…" }: { label?: string }) {
  return <div className="real-admin-loading"><span /><strong>{label}</strong></div>;
}

function AdminError({ message, retry }: { message: string; retry: () => void }) {
  return <section className="real-admin-error" role="alert"><span>!</span><div><strong>Não foi possível carregar</strong><p>{message}</p></div><button onClick={retry}>Tentar novamente</button></section>;
}

function Overview({ data, admin, onNewCourse }: { data: AdminData; admin: AdminIdentity; onNewCourse: () => void }) {
  return (
    <>
      <AdminHeading kicker="PAINEL ADMINISTRATIVO" title={`Olá, ${admin.name.split(/\s+/)[0]}.`} description="Indicadores abaixo são calculados a partir dos registros reais da plataforma." action={onNewCourse} />
      <div className="admin-kpis real-admin-kpis">
        <article><div><span>MEMBROS CADASTRADOS</span><strong>{data.stats.members}</strong><small>{data.stats.activeMembers} com acesso ativo</small></div><i>◉</i></article>
        <article><div><span>CURSOS PUBLICADOS</span><strong>{data.stats.publishedCourses}</strong><small>{data.stats.draftCourses} em rascunho</small></div><i>▶</i></article>
        <article><div><span>TEMPO REGISTRADO</span><strong>{formatTime(data.stats.watchSeconds)}</strong><small>Somatório do progresso das aulas</small></div><i>◷</i></article>
        <article><div><span>AULAS CONCLUÍDAS</span><strong>{data.stats.completedLessons}</strong><small>Conclusões persistidas na base</small></div><i>✓</i></article>
      </div>
      <div className="admin-overview-grid real-overview-grid">
        <section className="engagement-chart real-health-panel"><header><div><span>SAÚDE DO PRODUTO</span><h3>Jornada operacional</h3></div></header><div className="real-health-rows"><div><span>Conteúdo</span><strong>{data.stats.publishedCourses ? "Em operação" : "Aguardando publicação"}</strong><i className={data.stats.publishedCourses ? "ready" : "attention"} /></div><div><span>Comunidade</span><strong>{data.community.published ? "Com publicações" : "Pronta para a primeira publicação"}</strong><i className={data.community.published ? "ready" : "attention"} /></div><div><span>Assinaturas</span><strong>{data.stats.activeMembers ? "Acessos ativos registrados" : "Sem acesso ativo registrado"}</strong><i className={data.stats.activeMembers ? "ready" : "attention"} /></div><div><span>Tutor IA</span><strong>{data.tutor.openaiConfigured ? "Chave configurada" : "Aguardando chave no ambiente"}</strong><i className={data.tutor.openaiConfigured ? "ready" : "attention"} /></div></div></section>
        <section className="admin-live-activity real-admin-recent"><header><div><span>COMUNIDADE</span><h3>Publicações recentes</h3></div><b>{data.community.published} publicadas</b></header>{data.community.posts.length ? data.community.posts.slice(0, 4).map((post) => <div className="activity-row" key={post.id}><span>{initials(post.authorName)}</span><div><strong>{post.authorName}</strong><small>{post.content.slice(0, 78)}{post.content.length > 78 ? "…" : ""}</small></div><time>{formatDate(post.createdAt)}</time></div>) : <div className="real-admin-empty"><strong>Nenhuma publicação</strong><p>Os avisos e posts aparecerão aqui.</p></div>}</section>
      </div>
      <section className="admin-course-performance"><header><div><span>CONTEÚDO</span><h3>Cursos cadastrados</h3></div><button onClick={onNewCourse}>Adicionar conteúdo →</button></header><div className="admin-course-table">{data.courses.length ? data.courses.slice(0, 5).map((course, index) => <article key={course.id}><b>{String(index + 1).padStart(2, "0")}</b>{course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" /> : <span className="real-admin-thumb">TIME</span>}<div className="admin-course-name"><strong>{course.title}</strong><small>{course.teacher || "Professor não informado"}</small></div><div><span>AULAS</span><strong>{course.lessonCount}</strong></div><div><span>INICIARAM</span><strong>{course.startedMembers}</strong></div><span className={`real-course-status ${course.status}`}>{statusLabel(course.status)}</span></article>) : <div className="real-admin-empty"><strong>Nenhum curso cadastrado</strong><p>Crie o primeiro curso para iniciar a biblioteca.</p></div>}</div></section>
    </>
  );
}

function CoursesAdmin({ courses, onNewCourse, onEditCourse }: { courses: AdminCourse[]; onNewCourse: () => void; onEditCourse: (course: AdminCourse) => void }) {
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [query, setQuery] = useState("");
  const filtered = courses.filter((course) => (filter === "all" || course.status === filter) && `${course.title} ${course.teacher}`.toLowerCase().includes(query.toLowerCase()));
  return <><AdminHeading kicker="CONTEÚDO" title="Cursos e aulas" description="Publique, organize e acompanhe o conteúdo salvo na plataforma." action={onNewCourse} /><div className="admin-toolbar"><label><span>⌕</span><input placeholder="Buscar cursos..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><div><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos ({courses.length})</button><button className={filter === "published" ? "active" : ""} onClick={() => setFilter("published")}>Publicados ({courses.filter((course) => course.status === "published").length})</button><button className={filter === "draft" ? "active" : ""} onClick={() => setFilter("draft")}>Rascunhos ({courses.filter((course) => course.status === "draft").length})</button></div></div><div className="admin-course-cards">{filtered.map((course) => <article key={course.id}><div className="admin-course-cover">{course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" /> : <div className="real-course-placeholder">TIME</div>}<div /><span className={course.status === "published" ? "published" : "draft"}>{statusLabel(course.status)}</span><button aria-label={`Editar ${course.title}`} onClick={() => onEditCourse(course)}>✎</button></div><div className="admin-course-card-copy"><small>{course.teacher || "Professor não informado"}</small><h3>{course.title}</h3><div><span>{course.lessonCount} {course.lessonCount === 1 ? "aula" : "aulas"}</span><span>{course.startedMembers} iniciaram</span><span>Atualizado {formatDate(course.updatedAt)}</span></div><footer><button onClick={() => onEditCourse(course)}>Gerenciar conteúdo</button></footer></div></article>)}<button className="new-course-card" onClick={onNewCourse}><span>+</span><strong>Criar novo curso</strong><small>Adicione dados, thumbnail e a primeira aula</small></button></div><a className="admin-podcast-link" href="/admin/podcasts"><span>◉</span><div><strong>Gerenciar podcasts</strong><small>Cadastrar, editar e publicar episódios oficiais</small></div><b>→</b></a>{!filtered.length && courses.length ? <div className="real-admin-empty"><strong>Nenhum resultado</strong><p>Ajuste a busca ou o filtro selecionado.</p></div> : null}</>;
}

function MembersAdmin({ data }: { data: AdminData }) {
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState("");
  const filtered = data.members.filter((member) => `${member.fullName} ${member.email}`.toLowerCase().includes(query.toLowerCase()));

  async function changeStatus(member: AdminMember, accessStatus: AdminMember["accessStatus"]) {
    let reason = "";
    if (accessStatus === "complimentary") {
      reason = window.prompt("Informe o motivo da gratuidade:")?.trim() ?? "";
      if (!reason) return;
    }
    if (accessStatus === "blocked") {
      reason = window.prompt("Informe o motivo do bloqueio:")?.trim() ?? "";
      if (!reason) return;
    }
    setUpdatingId(member.id); setUpdateError("");
    try {
      const response = await fetch(`/api/admin/members/${member.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ accessStatus, reason }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível alterar o acesso.");
      window.location.reload();
    } catch (error) { setUpdateError(error instanceof Error ? error.message : "Não foi possível alterar o acesso."); }
    finally { setUpdatingId(null); }
  }

  async function changeExpiry(member: AdminMember) {
    const current = member.accessExpiresAt ? member.accessExpiresAt.slice(0, 10) : "";
    const value = window.prompt("Validade do acesso (AAAA-MM-DD). Deixe vazio para não expirar:", current);
    if (value === null) return;
    const parsedExpiry = value.trim() ? new Date(`${value.trim()}T23:59:59.000Z`) : null;
    if (parsedExpiry && Number.isNaN(parsedExpiry.valueOf())) { setUpdateError("Informe a validade no formato AAAA-MM-DD."); return; }
    const accessExpiresAt = parsedExpiry?.toISOString() ?? null;
    setUpdatingId(member.id); setUpdateError("");
    try {
      const response = await fetch(`/api/admin/members/${member.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ accessStatus: member.accessStatus, accessExpiresAt }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível alterar a validade.");
      window.location.reload();
    } catch (error) { setUpdateError(error instanceof Error ? error.message : "Não foi possível alterar a validade."); }
    finally { setUpdatingId(null); }
  }

  return <><AdminHeading kicker="GESTÃO DE ACESSO" title="Membros" description="Ative, isente ou bloqueie acessos com validação no servidor e histórico administrativo." />{updateError ? <div className="real-inline-error" role="alert">{updateError}</div> : null}<div className="admin-kpis compact-kpis"><article><div><span>TOTAL</span><strong>{data.stats.members}</strong></div><i>◉</i></article><article><div><span>ATIVOS</span><strong>{data.stats.activeMembers}</strong></div><i>✓</i></article><article><div><span>ATENÇÃO</span><strong>{data.stats.attentionMembers}</strong></div><i>!</i></article><article><div><span>TEMPO REGISTRADO</span><strong>{formatTime(data.stats.watchSeconds)}</strong></div><i>◷</i></article></div><section className="members-table-card"><header className="admin-toolbar"><label><span>⌕</span><input placeholder="Buscar por nome ou e-mail..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><div><span>{filtered.length} resultados</span></div></header><div className="members-table"><div className="member-table-header"><span>MEMBRO</span><span>ACESSO</span><span>TEMPO</span><span>PROGRESSO</span><span>ÚLTIMA ATIVIDADE</span><span /></div>{filtered.map((member) => <div className="member-table-row" key={member.id}><div className="admin-member-name"><span>{initials(member.fullName || member.email)}</span><div><strong>{member.fullName || "Nome não informado"}</strong><small>{member.email}</small></div></div><select aria-label={`Acesso de ${member.fullName || member.email}`} value={member.accessStatus} disabled={updatingId === member.id} onChange={(event) => void changeStatus(member, event.target.value as AdminMember["accessStatus"])}><option value="pending">Cadastrado</option><option value="active">Membro ativo</option><option value="complimentary">Membro isento</option><option value="past_due">Pagamento em atraso</option><option value="canceled">Cancelado</option><option value="blocked">Bloqueado</option></select><strong>{formatTime(member.watchSeconds)}</strong><div className="member-progress-cell"><strong>{member.completedLessons}</strong><span>{member.completedLessons === 1 ? "aula concluída" : "aulas concluídas"}</span></div><span className={`member-status ${member.accessStatus}`}>{member.accessExpiresAt ? `Até ${formatDate(member.accessExpiresAt)}` : formatDate(member.lastSeenAt)}</span><button className="member-events-link" type="button" onClick={() => void changeExpiry(member)}>Validade</button><a className="member-events-link" href={`/admin/membros/${member.id}/eventos`}>Eventos</a></div>)}{!filtered.length ? <div className="real-admin-empty"><strong>{data.members.length ? "Nenhum membro encontrado" : "Nenhum membro cadastrado"}</strong><p>{data.members.length ? "Ajuste o termo de busca." : "As matrículas aparecerão após o primeiro checkout."}</p></div> : null}</div></section></>;
}

type ManagedEvent = {
  id: number;
  title: string;
  description: string;
  bannerUrl: string;
  startsAt: string;
  endsAt: string | null;
  locationName: string;
  city: string;
  capacity: number | null;
  registrationDeadline: string | null;
  allowGuests: boolean;
  maxGuestsPerMember: number;
  status: "draft" | "published" | "completed" | "cancelled";
  summary: { expected: number; present: number; absent: number; cancelled: number; members: number; guests: number; membersPresent: number; guestsPresent: number };
};

type EventDraft = Omit<ManagedEvent, "id" | "summary" | "startsAt" | "endsAt" | "registrationDeadline"> & {
  id?: number;
  startsAt: string;
  endsAt: string;
  registrationDeadline: string;
};

const emptyEventDraft: EventDraft = { title: "", description: "", bannerUrl: "", startsAt: "", endsAt: "", locationName: "", city: "", capacity: null, registrationDeadline: "", allowGuests: false, maxGuestsPerMember: 0, status: "draft" };

function dateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function EventsAdmin() {
  const [items, setItems] = useState<ManagedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ManagedEvent | null>(null);

  async function loadEvents() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/events", { cache: "no-store" });
      const payload = await response.json() as { events?: ManagedEvent[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os eventos.");
      setItems(payload.events ?? []);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Falha ao carregar eventos."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/events", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as { events?: ManagedEvent[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os eventos.");
      if (active) setItems(payload.events ?? []);
    }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Falha ao carregar eventos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function editEvent(event: ManagedEvent) {
    setDraft({ ...event, startsAt: dateTimeInput(event.startsAt), endsAt: dateTimeInput(event.endsAt), registrationDeadline: dateTimeInput(event.registrationDeadline) });
  }

  async function uploadBanner(file: File) {
    setSaving(true); setError("");
    try {
      const form = new FormData(); form.append("file", file); form.append("kind", "event-banner");
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "Não foi possível enviar a capa.");
      setDraft((current) => current ? { ...current, bannerUrl: payload.url! } : current);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível enviar a capa."); }
    finally { setSaving(false); }
  }

  async function saveEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!draft) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const body = { ...draft, startsAt: new Date(draft.startsAt).toISOString(), endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null, registrationDeadline: draft.registrationDeadline ? new Date(draft.registrationDeadline).toISOString() : null };
      const response = await fetch("/api/admin/events", { method: draft.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar o evento.");
      setDraft(null); setNotice(draft.id ? "Evento atualizado." : "Evento criado como rascunho."); await loadEvents();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar o evento."); }
    finally { setSaving(false); }
  }

  async function deleteEvent(event: ManagedEvent) {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/events", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: event.id }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível excluir o evento.");
      setNotice("Evento excluído."); setPendingDelete(null); await loadEvents();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível excluir o evento."); }
    finally { setSaving(false); }
  }

  return <>
    <AdminHeading kicker="EVENTOS" title="Agenda, inscrições e check-in" description="Cadastre eventos, publique inscrições e acompanhe presença com dados reais." action={() => setDraft({ ...emptyEventDraft })} actionLabel="+ Novo evento" />
    {notice ? <div className="admin-toast">✓ {notice}</div> : null}
    {loading ? <AdminLoading label="Preparando lista de eventos…" /> : null}
    {error ? <div className="real-inline-error" role="alert">{error}</div> : null}
    {draft ? <form className="admin-event-editor admin-surface-light" onSubmit={saveEvent}>
      <header><div><span>{draft.id ? "EDITAR EVENTO" : "NOVO EVENTO"}</span><h3>{draft.id ? draft.title : "Cadastre as informações oficiais"}</h3></div><button type="button" onClick={() => setDraft(null)} aria-label="Fechar editor">×</button></header>
      <label><span>Título</span><input required minLength={3} maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label><span>Descrição</span><textarea maxLength={6000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <div className="editor-two-columns"><label><span>Início</span><input required type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></label><label><span>Encerramento</span><input type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} /></label></div>
      <div className="editor-two-columns"><label><span>Endereço/local</span><input maxLength={260} value={draft.locationName} onChange={(event) => setDraft({ ...draft, locationName: event.target.value })} /></label><label><span>Cidade</span><input maxLength={120} value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} /></label></div>
      <div className="editor-two-columns"><label><span>Prazo de inscrição</span><input type="datetime-local" value={draft.registrationDeadline} onChange={(event) => setDraft({ ...draft, registrationDeadline: event.target.value })} /></label><label><span>Capacidade (vazio = ilimitada)</span><input type="number" min="1" value={draft.capacity ?? ""} onChange={(event) => setDraft({ ...draft, capacity: event.target.value ? Number(event.target.value) : null })} /></label></div>
      <div className="editor-two-columns"><label><span>Status</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ManagedEvent["status"] })}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="completed">Encerrado</option><option value="cancelled">Cancelado</option></select></label><label><span>Máximo de convidados por membro</span><input type="number" min="0" max="20" disabled={!draft.allowGuests} value={draft.maxGuestsPerMember} onChange={(event) => setDraft({ ...draft, maxGuestsPerMember: Number(event.target.value) || 0 })} /></label></div>
      <label className="event-admin-checkbox"><input type="checkbox" checked={draft.allowGuests} onChange={(event) => setDraft({ ...draft, allowGuests: event.target.checked, maxGuestsPerMember: event.target.checked ? Math.max(1, draft.maxGuestsPerMember) : 0 })} /> Permitir convidados</label>
      <label className="admin-event-banner-upload"><span>Capa do evento</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBanner(file); }} />{draft.bannerUrl ? <img src={draft.bannerUrl} alt="Prévia da capa do evento" /> : <small>Nenhuma capa enviada.</small>}</label>
      <footer><button type="button" onClick={() => setDraft(null)}>Cancelar</button><button className="admin-primary-button" disabled={saving}>{saving ? "Salvando…" : "Salvar evento"}</button></footer>
    </form> : null}
    {!loading ? <section className="admin-events-list">
      {items.map((event) => <article className="admin-surface-light" key={event.id}>
        <div><span>{statusLabel(event.status).toUpperCase()}</span><h3>{event.title}</h3><p>{formatDate(event.startsAt)} · {event.summary.expected} inscritos · {event.capacity ? `${event.capacity} vagas` : "sem limite"}</p></div>
        <div className="admin-event-breakdown"><span><b>{event.summary.present}</b> presentes</span><span><b>{event.summary.guests}</b> convidados</span><span><b>{event.summary.absent}</b> ausentes</span></div>
        <div className="admin-event-actions"><button onClick={() => editEvent(event)}>Editar</button><a href={`/admin/eventos/${event.id}/check-in`}>Check-in</a><a href={`/api/admin/events/${event.id}/report`}>CSV</a><button disabled={saving} onClick={() => { setError(""); setPendingDelete(event); }}>Excluir</button></div>
      </article>)}
      {!items.length ? <div className="real-admin-empty"><strong>Nenhum evento disponível</strong><p>O primeiro evento publicado aparecerá aqui.</p></div> : null}
    </section> : null}
    {pendingDelete ? <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="delete-event-title"><button className="admin-modal-backdrop" aria-label="Fechar confirmação" disabled={saving} onClick={() => setPendingDelete(null)} /><section className="admin-confirmation-card"><span>CONFIRMAÇÃO NECESSÁRIA</span><h2 id="delete-event-title">Excluir “{pendingDelete.title}”?</h2><p>Esta ação só será concluída se o evento não possuir inscrições. O evento será removido permanentemente.</p>{error ? <div className="real-inline-error" role="alert">{error}</div> : null}<footer><button type="button" disabled={saving} onClick={() => setPendingDelete(null)}>Manter evento</button><button type="button" className="admin-primary-button" disabled={saving} onClick={() => void deleteEvent(pendingDelete)}>{saving ? "Excluindo…" : "Sim, excluir evento"}</button></footer></section></div> : null}
  </>;
}

type ModerationPost = AdminPost & { category: string; title: string };
type ModerationComment = { id: number; postId: number; authorName: string; content: string; status: "published" | "hidden"; createdAt: string };
type ModerationReport = { id: number; postId: number; commentId: number | null; reporterEmail: string; reason: string; status: "pending" | "reviewed" | "dismissed"; createdAt: string };

function CommunityAdmin({ data, onReload }: { data: AdminData; onReload: () => Promise<void> }) {
  const [announcement, setAnnouncement] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [category, setCategory] = useState("all");
  const [moderation, setModeration] = useState<{ posts: ModerationPost[]; comments: ModerationComment[]; reports: ModerationReport[] }>({ posts: [], comments: [], reports: [] });

  async function loadModeration() {
    const response = await fetch("/api/admin/community", { cache: "no-store" });
    const payload = await response.json() as { posts?: ModerationPost[]; comments?: ModerationComment[]; reports?: ModerationReport[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar a moderação.");
    setModeration({ posts: payload.posts ?? [], comments: payload.comments ?? [], reports: payload.reports ?? [] });
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/community", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as { posts?: ModerationPost[]; comments?: ModerationComment[]; reports?: ModerationReport[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar a moderação.");
      if (active) setModeration({ posts: payload.posts ?? [], comments: payload.comments ?? [], reports: payload.reports ?? [] });
    }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar a moderação."); });
    return () => { active = false; };
  }, []);

  async function publishAnnouncement() {
    if (!announcement.trim()) return;
    setSending(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/community", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: announcement.trim(), official: true }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível publicar o aviso.");
      setAnnouncement(""); setNotice("Aviso publicado para a comunidade."); await onReload();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível publicar."); }
    finally { setSending(false); }
  }

  async function moderate(target: "post" | "comment" | "report", id: number, action: "publish" | "hide" | "dismiss" | "review") {
    setSending(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/community", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ target, id, action }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir a moderação.");
      await Promise.all([loadModeration(), onReload()]); setNotice("Moderação atualizada.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível concluir a moderação."); }
    finally { setSending(false); }
  }

  const filteredPosts = moderation.posts.filter((post) => category === "all" || post.category === category);
  const pendingReports = moderation.reports.filter((report) => report.status === "pending");
  return <><AdminHeading kicker="RELACIONAMENTO" title="Comunidade" description="Publique avisos, filtre conteúdos e modere publicações, comentários e denúncias." />{notice ? <div className="admin-toast">✓ {notice}</div> : null}{error ? <div className="real-inline-error" role="alert">{error}</div> : null}<div className="community-admin-grid"><section className="announcement-composer"><header><div><span>✦</span><div><small>NOVO AVISO OFICIAL</small><h3>Fale com toda a comunidade</h3></div></div></header><textarea maxLength={4000} placeholder="Escreva a mensagem que será exibida em destaque..." value={announcement} onChange={(event) => setAnnouncement(event.target.value)} /><footer><small>{announcement.length}/4000</small><button className="admin-primary-button" onClick={publishAnnouncement} disabled={!announcement.trim() || sending}>{sending ? "Publicando…" : "Publicar aviso"}</button></footer></section><section className="moderation-summary"><header><span>MODERAÇÃO</span><h3>Dados da comunidade</h3></header><div><strong>{data.community.published}</strong><span>publicações publicadas</span></div><div><strong>{moderation.comments.filter((comment) => comment.status === "published").length}</strong><span>comentários visíveis</span></div><div><strong>{pendingReports.length}</strong><span>denúncias pendentes</span></div></section></div>
    {pendingReports.length ? <section className="community-reports-admin"><header><div><span>DENÚNCIAS PENDENTES</span><h3>Conteúdo sinalizado por membros</h3></div></header>{pendingReports.map((report) => <article key={report.id}><div><strong>Publicação #{report.postId}</strong><p>{report.reason}</p><small>Enviado por {report.reporterEmail} · {formatDate(report.createdAt)}</small></div><span><button disabled={sending} onClick={() => void moderate("post", report.postId, "hide")}>Ocultar conteúdo</button><button disabled={sending} onClick={() => void moderate("report", report.id, "dismiss")}>Manter</button><button disabled={sending} onClick={() => void moderate("report", report.id, "review")}>Marcar revisado</button></span></article>)}</section> : null}
    <section className="recent-admin-posts community-moderation-list"><header><div><span>PUBLICAÇÕES</span><h3>Conteúdo da comunidade</h3></div><select aria-label="Filtrar publicações por categoria" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas as categorias</option><option value="opportunity">Oportunidades</option><option value="achievement">Conquistas</option><option value="question">Dúvidas</option><option value="business">Negócios</option><option value="offer">Ofertas</option><option value="news">Novidades</option><option value="general">Conversas</option></select></header>{filteredPosts.length ? filteredPosts.map((post) => <article key={post.id}><span>{initials(post.authorName)}</span><div><strong>{post.title || post.authorName}{post.official ? " · TIME" : ""}</strong><p>{post.content}</p><small>{post.category} · {formatDate(post.createdAt)}</small></div><b className={`moderation-status ${post.status}`}>{post.status}</b><button disabled={sending} onClick={() => void moderate("post", post.id, post.status === "published" ? "hide" : "publish")}>{post.status === "published" ? "Remover" : "Publicar"}</button></article>) : <div className="real-admin-empty"><strong>Nenhuma publicação</strong><p>O primeiro conteúdo aparecerá aqui.</p></div>}</section>
    <section className="recent-admin-posts community-moderation-list"><header><div><span>COMENTÁRIOS</span><h3>Moderação recente</h3></div></header>{moderation.comments.slice(0, 30).map((comment) => <article key={comment.id}><span>{initials(comment.authorName)}</span><div><strong>{comment.authorName}</strong><p>{comment.content}</p><small>Publicação #{comment.postId} · {formatDate(comment.createdAt)}</small></div><b className={`moderation-status ${comment.status}`}>{comment.status}</b><button disabled={sending} onClick={() => void moderate("comment", comment.id, comment.status === "published" ? "hide" : "publish")}>{comment.status === "published" ? "Remover" : "Publicar"}</button></article>)}</section></>;
}

type AdminBenefit = {
  id: number;
  title: string;
  category: typeof benefitCategories[number];
  description: string;
  benefit: string;
  conditions: string;
  validUntil: string | null;
  coverage: string;
  ctaLabel: string;
  ctaUrl: string;
  status: "active" | "inactive" | "coming_soon";
};

const emptyBenefit: Omit<AdminBenefit, "id"> = {
  title: "",
  category: "Alimentação",
  description: "",
  benefit: "",
  conditions: "",
  validUntil: null,
  coverage: "",
  ctaLabel: "Saiba mais",
  ctaUrl: "",
  status: "inactive",
};

function BenefitsAdmin() {
  const [items, setItems] = useState<AdminBenefit[]>([]);
  const [editing, setEditing] = useState<AdminBenefit | Omit<AdminBenefit, "id"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadBenefits() {
    const response = await fetch("/api/admin/benefits", { cache: "no-store" });
    const payload = await response.json() as { benefits?: AdminBenefit[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os benefícios.");
    setItems(payload.benefits ?? []);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/benefits", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as { benefits?: AdminBenefit[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os benefícios.");
      if (active) setItems(payload.benefits ?? []);
    }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Falha ao carregar benefícios."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function saveBenefit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/benefits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(editing) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar o benefício.");
      await loadBenefits(); setEditing(null); setNotice("Benefício salvo e persistido.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar o benefício."); }
    finally { setSaving(false); }
  }

  async function changeBenefitStatus(item: AdminBenefit, status: AdminBenefit["status"]) {
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/benefits", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, status }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível alterar o status.");
      await loadBenefits(); setNotice(status === "active" ? "Benefício ativado." : status === "inactive" ? "Benefício desativado." : "Benefício marcado como Em breve.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível alterar o status."); }
    finally { setSaving(false); }
  }

  return <><AdminHeading kicker="ECOSSISTEMA TIME" title="Clube de Benefícios" description="Cadastre, revise e controle quais benefícios aparecem para os membros." action={() => setEditing({ ...emptyBenefit })} actionLabel="+ Novo benefício" />
    {notice ? <div className="admin-toast">✓ {notice}</div> : null}{error ? <div className="real-inline-error" role="alert">{error}</div> : null}
    {loading ? <AdminLoading label="Carregando benefícios…" /> : <section className="admin-benefits-list"><header><span>{items.length} {items.length === 1 ? "benefício cadastrado" : "benefícios cadastrados"}</span></header>{items.length ? items.map((item) => <article key={item.id}><div><span>{item.category}</span><h3>{item.title}</h3><p>{item.description}</p><small>{item.benefit} · {item.coverage || "Abrangência não informada"}</small></div><b className={`admin-benefit-status ${item.status}`}>{item.status === "coming_soon" ? "Em breve" : item.status === "active" ? "Ativo" : "Inativo"}</b><div className="admin-benefit-actions"><button onClick={() => setEditing(item)}>Editar</button>{item.status === "active" ? <button disabled={saving} onClick={() => void changeBenefitStatus(item, "inactive")}>Desativar</button> : <button disabled={saving} onClick={() => void changeBenefitStatus(item, "active")}>Ativar</button>}<button disabled={saving || item.status === "coming_soon"} onClick={() => void changeBenefitStatus(item, "coming_soon")}>Em breve</button></div></article>) : <div className="real-admin-empty"><strong>Nenhum benefício cadastrado</strong><p>Crie o primeiro item do catálogo.</p></div>}</section>}
    {editing ? <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="benefit-form-title"><button className="admin-modal-backdrop" aria-label="Fechar formulário" disabled={saving} onClick={() => setEditing(null)} /><form className="admin-benefit-form" onSubmit={saveBenefit}><header><div><span>CLUBE DE BENEFÍCIOS</span><h2 id="benefit-form-title">{"id" in editing ? "Editar benefício" : "Novo benefício"}</h2></div><button type="button" aria-label="Fechar formulário" disabled={saving} onClick={() => setEditing(null)}>×</button></header><div className="admin-form-grid"><label>Título<input required minLength={3} maxLength={180} value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} /></label><label>Categoria<select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value as AdminBenefit["category"] })}>{benefitCategories.map((category) => <option key={category}>{category}</option>)}</select></label></div><label>Descrição<textarea required minLength={3} maxLength={1200} value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></label><label>Benefício ou desconto<textarea required minLength={3} maxLength={500} value={editing.benefit} onChange={(event) => setEditing({ ...editing, benefit: event.target.value })} /></label><label>Condições<textarea maxLength={1200} value={editing.conditions} onChange={(event) => setEditing({ ...editing, conditions: event.target.value })} /></label><div className="admin-form-grid"><label>Validade<input type="date" value={editing.validUntil?.slice(0, 10) ?? ""} onChange={(event) => setEditing({ ...editing, validUntil: event.target.value || null })} /></label><label>Abrangência<input maxLength={180} value={editing.coverage} onChange={(event) => setEditing({ ...editing, coverage: event.target.value })} /></label></div><div className="admin-form-grid"><label>Texto do CTA<input required minLength={2} maxLength={80} value={editing.ctaLabel} onChange={(event) => setEditing({ ...editing, ctaLabel: event.target.value })} /></label><label>URL do CTA<input type="url" placeholder="https://" value={editing.ctaUrl} onChange={(event) => setEditing({ ...editing, ctaUrl: event.target.value })} /></label></div><label>Status<select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as AdminBenefit["status"] })}><option value="active">Ativo</option><option value="inactive">Inativo</option><option value="coming_soon">Em breve</option></select></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<footer><button type="button" disabled={saving} onClick={() => setEditing(null)}>Cancelar</button><button className="admin-primary-button" disabled={saving}>{saving ? "Salvando…" : "Salvar benefício"}</button></footer></form></div> : null}
  </>;
}

type OmbudsmanMessage = { id: number; memberEmail: string; type: "suggestion" | "complaint" | "problem" | "feedback"; subject: string; message: string; status: "received" | "in_progress" | "completed"; createdAt: string };

function OmbudsmanAdmin() {
  const [messages, setMessages] = useState<OmbudsmanMessage[]>([]);
  const [selected, setSelected] = useState<OmbudsmanMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadMessages() {
    const response = await fetch("/api/ombudsman", { cache: "no-store" });
    const payload = await response.json() as { messages?: OmbudsmanMessage[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar a Ouvidoria.");
    const next = payload.messages ?? [];
    setMessages(next);
    setSelected((current) => current ? next.find((item) => item.id === current.id) ?? null : null);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/ombudsman", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as { messages?: OmbudsmanMessage[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar a Ouvidoria.");
      if (active) setMessages(payload.messages ?? []);
    }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Falha ao carregar a Ouvidoria."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function changeStatus(status: OmbudsmanMessage["status"]) {
    if (!selected) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/ombudsman", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selected.id, status }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível atualizar o status.");
      await loadMessages(); setNotice("Status da mensagem atualizado e persistido.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível atualizar o status."); }
    finally { setSaving(false); }
  }

  const typeLabel = { suggestion: "Sugestão", complaint: "Reclamação", problem: "Problema", feedback: "Feedback" };
  const statusText = { received: "Novo", in_progress: "Em andamento", completed: "Concluído" };
  return <><AdminHeading kicker="ATENDIMENTO PRIVADO" title="Ouvidoria" description="Receba mensagens dos membros e acompanhe cada atendimento com privacidade." />{notice ? <div className="admin-toast">✓ {notice}</div> : null}{error ? <div className="real-inline-error" role="alert">{error}</div> : null}{loading ? <AdminLoading label="Carregando mensagens…" /> : <div className="admin-ombudsman-layout"><section className="admin-ombudsman-list"><header><strong>Caixa de entrada</strong><span>{messages.filter((item) => item.status === "received").length} novas</span></header>{messages.length ? messages.map((item) => <button className={selected?.id === item.id ? "selected" : ""} key={item.id} onClick={() => setSelected(item)}><span className={`ombudsman-status-dot ${item.status}`} /><div><small>{typeLabel[item.type]} · {formatDate(item.createdAt)}</small><strong>{item.subject}</strong><span>{item.memberEmail}</span></div><b>{statusText[item.status]}</b></button>) : <div className="real-admin-empty"><strong>Nenhuma mensagem</strong><p>As mensagens privadas dos membros aparecerão aqui.</p></div>}</section><section className="admin-ombudsman-detail">{selected ? <><header><div><span>{typeLabel[selected.type]}</span><h2>{selected.subject}</h2></div><b className={`admin-ombudsman-status ${selected.status}`}>{statusText[selected.status]}</b></header><dl><div><dt>Remetente</dt><dd>{selected.memberEmail}</dd></div><div><dt>Recebida em</dt><dd>{formatDate(selected.createdAt)}</dd></div></dl><article><span>MENSAGEM</span><p>{selected.message}</p></article><label>Status do atendimento<select value={selected.status} disabled={saving} onChange={(event) => void changeStatus(event.target.value as OmbudsmanMessage["status"])}><option value="received">Novo</option><option value="in_progress">Em andamento</option><option value="completed">Concluído</option></select></label></> : <div className="real-admin-empty"><strong>Selecione uma mensagem</strong><p>O conteúdo completo e o status aparecerão aqui.</p></div>}</section></div>}</>;
}

type TutorConfig = { enabled: boolean; tone: "execution_mentor" | "didactic_teacher" | "strategic_consultant"; customInstructions: string };

function TutorAdmin({ data }: { data: AdminData }) {
  const [config, setConfig] = useState<TutorConfig>({ enabled: true, tone: "execution_mentor", customInstructions: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/tutor-config", { cache: "no-store" }).then(async (response) => {
      const payload = (await response.json()) as { settings?: TutorConfig; error?: string };
      if (!response.ok || !payload.settings) throw new Error(payload.error ?? "Não foi possível carregar a configuração.");
      if (active) setConfig(payload.settings);
    }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Falha ao carregar."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/tutor-config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(config) });
      const payload = (await response.json()) as { settings?: TutorConfig; error?: string };
      if (!response.ok || !payload.settings) throw new Error(payload.error ?? "Não foi possível salvar.");
      setConfig(payload.settings); setNotice("Configuração do Tutor salva.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }

  return <><AdminHeading kicker="INTELIGÊNCIA DA PLATAFORMA" title="Tutor TIME IA" description="Controle o tom editorial sem enfraquecer as regras fixas de segurança e grounding." /><div className="ai-admin-kpis"><article><span>OPENAI</span><strong>{data.tutor.openaiConfigured ? "Conectada" : "Pendente"}</strong><small>Chave verificada sem expor o segredo</small></article><article><span>MODELO</span><strong className="real-model-name">{data.tutor.model}</strong><small>Raciocínio baixo para controlar latência e custo</small></article><article><span>CURSOS AUTORIZADOS</span><strong>{data.tutor.publishedCourses}</strong><small>Somente cursos publicados</small></article><article><span>AULAS DESCRITAS</span><strong>{data.tutor.describedLessons}/{data.tutor.authorizedLessons}</strong><small>Descrições utilizáveis como fonte</small></article></div>{loading ? <AdminLoading label="Carregando configuração do Tutor…" /> : <div className="ai-admin-layout"><form className="ai-config-card" onSubmit={saveConfig}><header><div><span>CONFIGURAÇÃO DO TUTOR</span><h3>Personalidade e comportamento</h3></div><button type="button" aria-label={config.enabled ? "Pausar Tutor" : "Ativar Tutor"} className={config.enabled ? "on" : ""} onClick={() => setConfig({ ...config, enabled: !config.enabled })}><i /></button></header><label><span>TOM DE VOZ</span><select value={config.tone} onChange={(event) => setConfig({ ...config, tone: event.target.value as TutorConfig["tone"] })}><option value="execution_mentor">Mentor de execução</option><option value="didactic_teacher">Professor didático</option><option value="strategic_consultant">Consultor estratégico</option></select></label><label><span>ORIENTAÇÃO ADICIONAL</span><textarea maxLength={2000} placeholder="Ex.: priorize exemplos curtos e perguntas de diagnóstico." value={config.customInstructions} onChange={(event) => setConfig({ ...config, customInstructions: event.target.value })} /></label><div className="ai-guardrails"><div><span>✓</span><p><strong>Base TIME obrigatória</strong><small>Esta regra não pode ser removida pela orientação adicional.</small></p></div><div><span>✓</span><p><strong>Citações controladas pelo servidor</strong><small>O modelo não cria a lista de fontes exibida ao membro.</small></p></div><div><span>✓</span><p><strong>Limite de conhecimento</strong><small>Sem fonte suficiente, o Tutor reconhece que não sabe.</small></p></div></div>{error ? <p className="form-error">{error}</p> : null}{notice ? <p className="real-form-success">✓ {notice}</p> : null}<button className="admin-primary-button" disabled={saving}>{saving ? "Salvando…" : "Salvar configuração"}</button></form><section className="ai-knowledge-card"><header><div><span>BASE DE CONHECIMENTO</span><h3>Conteúdos conectados</h3></div></header>{data.courses.filter((course) => course.status === "published").length ? data.courses.filter((course) => course.status === "published").map((course) => <article key={course.id}><span>▶</span><div><strong>{course.title}</strong><small>{course.lessonCount} aulas · {course.lessons.filter((lesson) => lesson.description.trim()).length} com descrição</small></div><b>{course.lessons.some((lesson) => lesson.description.trim()) || course.description.trim() ? "Fonte disponível" : "Precisa de descrição"}</b></article>) : <div className="real-admin-empty"><strong>Nenhuma fonte publicada</strong><p>Publique um curso e descreva as aulas para alimentar o Tutor.</p></div>}<footer><i /><span>Fontes são consultadas no momento de cada pergunta.</span></footer></section></div>}<section className="ai-unresolved-card real-tutor-quality"><header><div><span>QUALIDADE E CUSTO</span><h3>Decisões implementadas</h3></div></header><div><article><b>01</b><strong>Até quatro fontes por pergunta</strong><span>Reduz contexto, custo e ruído.</span></article><article><b>02</b><strong>Respostas limitadas</strong><span>Até 600 tokens e timeout controlado.</span></article><article><b>03</b><strong>Privacidade</strong><span>Respostas não são armazenadas pela API.</span></article></div></section></>;
}

function SettingsAdmin({ admin }: { admin: AdminIdentity }) {
  const items = [["✓", "Identidade", "Conta administrativa autenticada"], ["✓", "Banco de dados", "Cursos, membros, progresso e comunidade persistentes"], ["✓", "Mídia", "Capas na TIME; vídeos incorporados de provedores externos"], ["✓", "Segurança", "Acesso administrativo validado no servidor"], ["↗", "Pagamentos", "Acompanhe a conexão Stripe em Assinaturas"], ["✦", "Tutor IA", "Acompanhe a conexão OpenAI no painel do Tutor"]];
  return <><AdminHeading kicker="PLATAFORMA" title="Configurações" description="Mapa do que está conectado e onde administrar cada recurso." /><div className="settings-grid real-settings-grid">{items.map((item) => <article key={item[1]}><span>{item[0]}</span><div><strong>{item[1]}</strong><small>{item[2]}</small></div></article>)}</div><section className="real-admin-account"><span>ADMINISTRADOR ATUAL</span><strong>{admin.name}</strong><small>{admin.email}</small><a href="/auth/signout">Sair da conta</a></section></>;
}

function CourseModal({ course, onClose, onSaved }: { course: AdminCourse | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [courseName, setCourseName] = useState(course?.title ?? "");
  const [teacher, setTeacher] = useState(course?.teacher ?? "");
  const [category, setCategory] = useState(course?.category ?? "negocios");
  const [description, setDescription] = useState(course?.description ?? "");
  const [status, setStatus] = useState<"draft" | "published" | "archived">(course?.status ?? "draft");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState(course?.thumbnailUrl ?? "");
  const [externalVideoUrl, setExternalVideoUrl] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [moduleId, setModuleId] = useState<number | null>(course?.modules[0]?.id ?? null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [creatingModule, setCreatingModule] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function pickFile(event: ChangeEvent<HTMLInputElement>) { setThumbnailFile(event.target.files?.[0] ?? null); }

  async function upload(file: File, kind: "thumbnail" | "lesson-material" = "thumbnail") {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    const payload = (await response.json()) as { url?: string; key?: string; type?: string; name?: string; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Falha no envio do arquivo.");
    return payload;
  }

  function chooseNewModule() { setCreatingModule(true); setModuleId(null); }
  function chooseExistingModule(value: string) { setModuleId(value ? Number(value) : null); setCreatingModule(!value); }

  async function updateContent(body: Record<string, unknown>, method: "POST" | "DELETE" = "POST") {
    setSaving(true); setError(""); setNotice("Salvando conteúdo…");
    try {
      const response = await fetch("/api/admin/course-content", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível atualizar o conteúdo.");
      await onSaved();
      setNotice("Conteúdo atualizado.");
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível atualizar o conteúdo.");
      setNotice("");
      return false;
    } finally { setSaving(false); }
  }

  async function editModule(module: AdminModule) {
    if (!course) return;
    const title = window.prompt("Nome do módulo:", module.title)?.trim();
    if (!title) return;
    const description = window.prompt("Descrição opcional:", module.description) ?? module.description;
    await updateContent({ action: "module.upsert", id: module.id, courseId: course.id, title, description, status: module.status, position: module.position });
  }

  async function toggleModule(module: AdminModule) {
    if (!course) return;
    await updateContent({ action: "module.upsert", id: module.id, courseId: course.id, title: module.title, description: module.description, status: module.status === "published" ? "draft" : "published", position: module.position });
  }

  async function moveModule(index: number, direction: -1 | 1) {
    if (!course) return;
    const target = index + direction;
    if (target < 0 || target >= course.modules.length) return;
    const ids = course.modules.map((module) => module.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    await updateContent({ action: "module.reorder", courseId: course.id, ids });
  }

  async function deleteModule(module: AdminModule) {
    if (!window.confirm(`Excluir o módulo “${module.title}”? Módulos com aulas não podem ser excluídos.`)) return;
    await updateContent({ resource: "module", id: module.id }, "DELETE");
  }

  async function editLesson(item: AdminLesson) {
    if (!course) return;
    const title = window.prompt("Nome da aula:", item.title)?.trim();
    if (!title) return;
    const description = window.prompt("Descrição da aula:", item.description) ?? item.description;
    const videoUrl = window.prompt("Link do YouTube, Vimeo ou Panda (vazio para Em breve):", item.videoUrl) ?? item.videoUrl;
    const minutes = window.prompt("Duração em minutos:", String(Math.round(item.durationSeconds / 60)));
    if (minutes === null) return;
    await updateContent({ action: "lesson.upsert", id: item.id, courseId: course.id, moduleId: item.moduleId, title, description, videoUrl, durationSeconds: Math.max(0, Number(minutes) || 0) * 60, status: item.status, position: item.position });
  }

  async function toggleLesson(item: AdminLesson) {
    if (!course) return;
    await updateContent({ action: "lesson.upsert", id: item.id, courseId: course.id, moduleId: item.moduleId, title: item.title, description: item.description, videoUrl: item.videoUrl, durationSeconds: item.durationSeconds, status: item.status === "published" ? "draft" : "published", position: item.position });
  }

  async function moveLesson(item: AdminLesson, direction: -1 | 1) {
    if (!course) return;
    const siblings = course.lessons.filter((lesson) => lesson.moduleId === item.moduleId).sort((left, right) => left.position - right.position);
    const index = siblings.findIndex((lesson) => lesson.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    const ids = siblings.map((lesson) => lesson.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    await updateContent({ action: "lesson.reorder", courseId: course.id, moduleId: item.moduleId, ids });
  }

  async function deleteLesson(item: AdminLesson) {
    if (!window.confirm(`Excluir a aula “${item.title}” e seus registros de progresso, notas, avaliações e materiais?`)) return;
    await updateContent({ resource: "lesson", id: item.id }, "DELETE");
  }

  async function addMaterialLink(item: AdminLesson) {
    const title = window.prompt("Nome do material:")?.trim();
    if (!title) return;
    const externalUrl = window.prompt("Link HTTPS do material:")?.trim();
    if (!externalUrl) return;
    await updateContent({ action: "material.upsert", lessonId: item.id, title, kind: "link", externalUrl, storageKey: null, mimeType: "Link externo", status: "published", position: item.materials.length });
  }

  async function addMaterialFile(item: AdminLesson, file: File) {
    setSaving(true); setError(""); setNotice("Enviando material…");
    try {
      const uploaded = await upload(file, "lesson-material");
      if (!uploaded.key) throw new Error("O arquivo não retornou uma chave válida.");
      await updateContent({ action: "material.upsert", lessonId: item.id, title: uploaded.name || file.name, kind: "file", storageKey: uploaded.key, externalUrl: null, mimeType: uploaded.type || file.type, status: "published", position: item.materials.length });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível enviar o material.");
      setNotice("");
      setSaving(false);
    }
  }

  async function deleteMaterial(material: AdminLesson["materials"][number]) {
    if (!window.confirm(`Remover o material “${material.title}” da aula?`)) return;
    await updateContent({ resource: "material", id: material.id }, "DELETE");
  }

  async function moderateReview(review: AdminLesson["reviews"][number]) {
    await updateContent({ action: "review.moderate", id: review.id, status: review.status === "published" ? "hidden" : "published" });
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseName.trim()) { setError("Informe o nome do curso."); return; }
    if (status === "published" && !thumbnailFile && !selectedThumbnail) { setError("Todo curso publicado precisa de uma thumbnail."); return; }
    if (externalVideoUrl.trim() && !lessonTitle.trim()) { setError("Informe o nome da nova aula."); return; }
    if (externalVideoUrl.trim() && !moduleTitle.trim() && !moduleId) { setError("Escolha um módulo existente ou informe o nome do novo módulo."); return; }
    if (creatingModule && !moduleTitle.trim()) { setError("Informe o nome do novo módulo."); return; }
    setSaving(true); setError(""); setNotice(thumbnailFile ? "Enviando a thumbnail…" : "Salvando curso…");
    try {
      const thumbnailUpload = thumbnailFile ? await upload(thumbnailFile) : null;
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: course?.id,
          title: courseName.trim(), teacher: teacher.trim(), category, description: description.trim(), status,
          thumbnailUrl: thumbnailUpload?.url ?? selectedThumbnail,
          externalVideoUrl: externalVideoUrl.trim(), lessonTitle: lessonTitle.trim(), lessonDescription: lessonDescription.trim(),
          moduleId: moduleId ?? undefined,
          moduleTitle: moduleId ? undefined : moduleTitle.trim(),
          moduleDescription: moduleId ? undefined : moduleDescription.trim(),
          createModule: Boolean(!moduleId && moduleTitle.trim()),
          durationSeconds: Math.max(0, Number(durationMinutes) || 0) * 60,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar o curso.");
      setNotice("Curso salvo."); await onSaved(); onClose();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar."); setNotice(""); }
    finally { setSaving(false); }
  }

  return <div className="admin-modal" role="dialog" aria-modal="true" aria-label={course ? `Editar ${course.title}` : "Novo curso"}>
    <button className="admin-modal-backdrop" aria-label="Fechar editor" onClick={onClose} />
    <form className="course-editor" onSubmit={saveCourse}>
      <header><div><span>{course ? "EDITAR CURSO" : "CRIAR CONTEÚDO"}</span><h2>{course?.title ?? "Novo curso"}</h2></div><button type="button" aria-label="Fechar" onClick={onClose}>×</button></header>
      <div className="course-editor-body">
        <section className="course-hierarchy-note"><span>HIERARQUIA DO ALUNO</span><strong>Área de membros <b>→</b> Cursos <b>→</b> Módulos <b>→</b> Aulas</strong><p>A thumbnail identifica o curso; cada vídeo é cadastrado dentro de um módulo.</p></section>
        <label><span>Nome do curso</span><input required value={courseName} onChange={(event) => setCourseName(event.target.value)} placeholder="Nome oficial do curso" /></label>
        <div className="editor-two-columns"><label><span>Professor</span><input value={teacher} onChange={(event) => setTeacher(event.target.value)} placeholder="Nome do professor" /></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label></div>
        <div className="editor-two-columns"><label><span>Categoria</span><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: vendas" /></label><label><span>Thumbnail atual</span><input readOnly value={selectedThumbnail ? "Imagem cadastrada" : "Obrigatória antes de publicar"} /></label></div>
        <label><span>Descrição do curso</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Use apenas informações autorizadas sobre o curso." /></label>
        <section className="course-cover-library" aria-labelledby="course-cover-library-title"><header><div><span>CAPAS OFICIAIS TIME</span><strong id="course-cover-library-title">Escolha uma composição editorial</strong></div><small>16:9 · responsivas · sem conteúdo fictício</small></header><div>{courseThumbnailLibrary.map((cover) => <button type="button" className={selectedThumbnail === cover.src ? "active" : ""} key={cover.id} onClick={() => { setSelectedThumbnail(cover.src); setThumbnailFile(null); if (!category.trim() || category === "negocios") setCategory(cover.category.toLocaleLowerCase("pt-BR")); }} aria-pressed={selectedThumbnail === cover.src}><img src={cover.src} alt="" /><span>{cover.label}</span>{selectedThumbnail === cover.src ? <b>✓</b> : null}</button>)}</div></section>
        <div className="upload-grid"><label className="upload-drop"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={pickFile} /><span>▧</span><strong>{thumbnailFile?.name ?? "Enviar thumbnail"}</strong><small>JPG, PNG, WebP ou AVIF · até 15 MB</small><b>{thumbnailFile ? "Trocar imagem" : "Selecionar arquivo"}</b></label><section className="upload-drop real-external-video"><span>▶</span><strong>Link externo da aula</strong><small>YouTube não listado, Vimeo ou Panda. O vídeo não é enviado para a TIME.</small><input type="url" inputMode="url" placeholder="https://youtube.com/watch?v=…" value={externalVideoUrl} onChange={(event) => setExternalVideoUrl(event.target.value)} /></section></div>
        {externalVideoUrl.trim() || creatingModule ? <section className="real-new-lesson"><header><span>{externalVideoUrl.trim() ? "NOVA AULA" : "NOVO MÓDULO"}</span><strong>{externalVideoUrl.trim() ? "Organize a aula antes de salvar" : "Crie uma etapa da jornada do curso"}</strong></header><div className="editor-two-columns"><label><span>Módulo</span>{course?.modules.length && !creatingModule ? <select value={moduleId ?? ""} onChange={(event) => chooseExistingModule(event.target.value)}>{course.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}<option value="">Criar novo módulo…</option></select> : <input required value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} placeholder="Ex.: Fundamentos" />}</label>{externalVideoUrl.trim() ? <label><span>Nome da aula</span><input required value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} placeholder="Ex.: Aula 1" /></label> : null}</div>{creatingModule ? <label><span>Descrição do módulo</span><textarea value={moduleDescription} onChange={(event) => setModuleDescription(event.target.value)} placeholder="Objetivo ou contexto deste módulo (opcional)." /></label> : null}{externalVideoUrl.trim() ? <><label><span>Descrição ou resumo autorizado</span><textarea value={lessonDescription} onChange={(event) => setLessonDescription(event.target.value)} placeholder="Descreva os conceitos abordados. O Tutor só poderá usar o que estiver autorizado aqui." /></label><label><span>Duração em minutos</span><input type="number" min="0" inputMode="numeric" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label></> : null}</section> : null}
        {course && !creatingModule ? <button className="admin-module-add" type="button" onClick={chooseNewModule}>+ Criar módulo antes da próxima aula</button> : null}
        <section className="module-editor real-module-editor admin-learning-content">
          <header><div><span>MÓDULOS E AULAS CADASTRADOS</span><strong>{course?.modules.length ?? 0} módulos · {course?.lessonCount ?? 0} aulas</strong></div></header>
          {course?.modules.length ? course.modules.map((module, index) => <div className="admin-module-row" key={module.id}><span>▦</span><b>{String(index + 1).padStart(2, "0")}</b><strong>{module.title}</strong><small>{module.lessonCount} {module.lessonCount === 1 ? "aula" : "aulas"} · {module.status === "published" ? "Publicado" : "Rascunho"}</small><span className="admin-content-actions"><button type="button" disabled={index === 0 || saving} onClick={() => void moveModule(index, -1)}>↑</button><button type="button" disabled={index === course.modules.length - 1 || saving} onClick={() => void moveModule(index, 1)}>↓</button><button type="button" disabled={saving} onClick={() => void editModule(module)}>Editar</button><button type="button" disabled={saving} onClick={() => void toggleModule(module)}>{module.status === "published" ? "Despublicar" : "Publicar"}</button><button type="button" disabled={saving || module.lessonCount > 0} onClick={() => void deleteModule(module)}>Excluir</button></span></div>) : <p>Crie o primeiro módulo e depois adicione a primeira aula com um link externo.</p>}
          {course?.lessons.length ? course.lessons.map((lesson) => {
            const siblings = course.lessons.filter((item) => item.moduleId === lesson.moduleId).sort((left, right) => left.position - right.position);
            const siblingIndex = siblings.findIndex((item) => item.id === lesson.id);
            return <div className="admin-lesson-management" key={lesson.id}><span>{lesson.videoUrl ? "▶" : "○"}</span><b>{String(siblingIndex + 1).padStart(2, "0")}</b><strong>{lesson.title}</strong><small>{lesson.moduleTitle} · {lesson.status === "published" ? "Publicada" : "Rascunho"}</small><span className="admin-content-actions"><button type="button" disabled={siblingIndex === 0 || saving} onClick={() => void moveLesson(lesson, -1)}>↑</button><button type="button" disabled={siblingIndex === siblings.length - 1 || saving} onClick={() => void moveLesson(lesson, 1)}>↓</button><button type="button" disabled={saving} onClick={() => void editLesson(lesson)}>Editar</button><button type="button" disabled={saving} onClick={() => void toggleLesson(lesson)}>{lesson.status === "published" ? "Despublicar" : "Publicar"}</button><button type="button" disabled={saving} onClick={() => void addMaterialLink(lesson)}>+ Link</button><label className="admin-file-action"><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip" disabled={saving} onChange={(event) => { const file = event.target.files?.[0]; if (file) void addMaterialFile(lesson, file); event.target.value = ""; }} /><span>+ Arquivo</span></label><button type="button" disabled={saving} onClick={() => void deleteLesson(lesson)}>Excluir</button></span>{lesson.materials.length ? <div className="admin-lesson-subitems">{lesson.materials.map((material) => <p key={material.id}><span>↧</span><strong>{material.title}</strong><small>{material.kind === "file" ? "Arquivo privado" : "Link externo"}</small><button type="button" disabled={saving} onClick={() => void deleteMaterial(material)}>Remover</button></p>)}</div> : null}{lesson.reviews.filter((review) => review.comment).length ? <div className="admin-lesson-subitems reviews">{lesson.reviews.filter((review) => review.comment).map((review) => <p key={review.id}><span>{review.status === "published" ? "◯" : "⊘"}</span><strong>{review.authorName || review.memberEmail}</strong><small>{review.comment}</small><button type="button" disabled={saving} onClick={() => void moderateReview(review)}>{review.status === "published" ? "Ocultar" : "Publicar"}</button></p>)}</div> : null}</div>;
          }) : null}
        </section>
      </div>
      <footer><span className={error ? "form-error" : notice ? "real-form-success" : ""}>{error || notice || "As alterações só serão publicadas após salvar."}</span><div><button type="button" onClick={onClose}>Cancelar</button><button className="admin-primary-button" disabled={saving}>{saving ? "Salvando…" : "Salvar curso"}</button></div></footer>
    </form>
  </div>;
}

export default function AdminPlatform({ admin }: { admin: AdminIdentity }) {
  const [section, setSection] = useState<AdminSection>("visao");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingCourse, setEditingCourse] = useState<AdminCourse | "new" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const adminInitials = useMemo(() => initials(admin.name), [admin.name]);

  async function loadData() {
    setError("");
    const response = await fetch("/api/admin/overview", { cache: "no-store" });
    const payload = (await response.json()) as AdminData & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar a administração.");
    setData(payload);
    setEditingCourse((current) => current && current !== "new" ? payload.courses.find((course) => course.id === current.id) ?? null : current);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/overview", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as AdminData & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar a administração.");
        if (active) setData(payload);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Falha ao carregar.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function navigateTo(nextSection: AdminSection) { setSection(nextSection); setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()).toUpperCase();

  return <main className="admin-app real-admin-app"><aside className="admin-sidebar"><a href="/" className="admin-logo" aria-label="TIME Escola de Negócios"><TimeLogo variant="white" priority /><span>ADMIN</span></a><nav aria-label="Navegação administrativa"><small>GESTÃO</small>{adminMenu.slice(0, 8).map((item) => <button className={section === item.id ? "active" : ""} key={item.id} onClick={() => navigateTo(item.id)} aria-current={section === item.id ? "page" : undefined}><span>{item.icon}</span>{item.label}{item.id === "membros" && data ? <i>{data.stats.members}</i> : null}</button>)}<small>SISTEMA</small>{adminMenu.slice(8).map((item) => <button className={section === item.id ? "active" : ""} key={item.id} onClick={() => navigateTo(item.id)} aria-current={section === item.id ? "page" : undefined}><span>{item.icon}</span>{item.label}</button>)}</nav><div className="admin-sidebar-footer"><a href="/app"><span>↗</span>Ver área de membros</a><div><span>{adminInitials}</span><div><strong>{admin.name}</strong><small>Administrador autorizado</small></div></div></div></aside><section className="admin-main"><header className="admin-topbar"><label><span>⌕</span><input placeholder="Buscar na administração..." /><kbd>TIME</kbd></label><div><span>{date}</span><b>{adminInitials}</b></div></header><div className="admin-content">{loading ? <AdminLoading /> : error || !data ? <AdminError message={error || "Dados indisponíveis."} retry={() => { setLoading(true); void loadData().catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Falha ao carregar.")).finally(() => setLoading(false)); }} /> : <>{section === "visao" ? <Overview data={data} admin={admin} onNewCourse={() => setEditingCourse("new")} /> : null}{section === "cursos" ? <CoursesAdmin courses={data.courses} onNewCourse={() => setEditingCourse("new")} onEditCourse={setEditingCourse} /> : null}{section === "membros" ? <MembersAdmin data={data} /> : null}{section === "eventos" ? <EventsAdmin /> : null}{section === "comunidade" ? <CommunityAdmin data={data} onReload={loadData} /> : null}{section === "beneficios" ? <BenefitsAdmin /> : null}{section === "ouvidoria" ? <OmbudsmanAdmin /> : null}{section === "tutor" ? <TutorAdmin data={data} /> : null}{section === "financeiro" ? <StripeFinanceAdmin /> : null}{section === "config" ? <SettingsAdmin admin={admin} /> : null}</>}</div></section>{mobileMenuOpen ? <div className="mobile-more-menu admin-more-menu" role="dialog" aria-modal="true" aria-label="Mais opções administrativas"><button className="mobile-more-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} /><section><header><div><span>{adminInitials}</span><div><strong>Administração TIME</strong><small>{admin.email}</small></div></div><button aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)}>×</button></header><nav>{adminMenu.filter((item) => ["comunidade", "beneficios", "ouvidoria", "tutor", "financeiro", "config"].includes(item.id)).map((item) => <button className={section === item.id ? "active" : ""} key={item.id} onClick={() => navigateTo(item.id)}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.id === "comunidade" ? "Avisos e moderação" : item.id === "beneficios" ? "Catálogo e disponibilidade" : item.id === "ouvidoria" ? "Mensagens privadas" : item.id === "tutor" ? "Fontes, prompt e segurança" : item.id === "financeiro" ? "Assinaturas e pagamentos" : "Estado do sistema"}</small></div><b>→</b></button>)}<a href="/app"><span>↗</span><div><strong>Ver área de membros</strong><small>Abrir experiência do aluno</small></div><b>→</b></a></nav></section></div> : null}<nav className="admin-mobile-nav" aria-label="Navegação administrativa mobile">{adminMobileMenu.map((item) => <button className={section === item.id ? "active" : ""} key={item.id} onClick={() => navigateTo(item.id)} aria-current={section === item.id ? "page" : undefined}><span>{item.icon}</span>{item.label.split(" ")[0]}</button>)}<button className={["comunidade", "beneficios", "ouvidoria", "tutor", "financeiro", "config"].includes(section) || mobileMenuOpen ? "active" : ""} onClick={() => setMobileMenuOpen(true)} aria-expanded={mobileMenuOpen}><span>•••</span>Mais</button></nav>{editingCourse ? <CourseModal key={editingCourse === "new" ? "new" : editingCourse.id} course={editingCourse === "new" ? null : editingCourse} onClose={() => setEditingCourse(null)} onSaved={loadData} /> : null}</main>;
}
