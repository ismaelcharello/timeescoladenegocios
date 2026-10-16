"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getEmbedVideoUrl, getExternalVideoProvider } from "@/lib/video-hosting";
import { courseThumbnailLibrary } from "@/lib/course-thumbnails";
import { selectHomeCourse, selectHomePosts, selectNextEvent } from "@/lib/member-home";
import TimeLogo from "@/app/time-logo";

type Section = "inicio" | "cursos" | "podcasts" | "tutor" | "comunidade" | "agenda" | "conquistas";
type SchoolStatus = "active" | "coming_soon";
type Member = { email: string; name: string; isAdmin: boolean; accessLevel: "registered" | "active" | "complimentary" | "admin"; accessStatus: string; permissions: Array<"courses" | "networking" | "community" | "events" | "podcasts" | "benefits" | "ombudsman"> };
type LessonProgress = { watchSeconds: number; completed: boolean; startedAt: string | null; updatedAt: string };
type Lesson = {
  id: number;
  moduleId: number | null;
  moduleTitle: string;
  title: string;
  description: string;
  durationSeconds: number;
  position: number;
  videoUrl?: string;
  progress: LessonProgress | null;
};
type CourseModule = {
  id: number | string;
  title: string;
  description: string;
  position: number;
  lessons: Lesson[];
};
type Course = {
  id: number;
  title: string;
  description: string;
  teacher: string;
  category: string;
  thumbnailUrl: string;
  lessons: Lesson[];
  modules: CourseModule[];
  lessonCount: number;
  completedLessons: number;
  startedLessons: number;
  progressPercent: number;
  reviewCount: number;
  averageRating: number | null;
  locked?: boolean;
};
type CommunityAttachment = {
  kind: "image" | "gif" | "video" | "link";
  url: string;
  label?: string;
};
type CommunityCategory = "general" | "opportunity" | "achievement" | "question" | "business" | "offer" | "news";
type CommunityPost = {
  id: number;
  authorName: string;
  content: string;
  category: CommunityCategory;
  attachments: CommunityAttachment[];
  official: boolean;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  own: boolean;
  title: string;
  company: string;
  benefit: string;
  discount: string;
  conditions: string;
  validUntil: string | null;
  contact: string;
  createdAt: string;
};
type CommunityComment = { id: number; authorName: string; content: string; createdAt: string; own: boolean };
type LessonMaterial = { id: number; title: string; kind: "file" | "link"; mimeType: string; url: string };
type LessonReview = { id: number; rating: number; comment: string; createdAt: string; updatedAt: string; own: boolean; hidden: boolean; authorName: string };
type TimeEvent = {
  id: number;
  slug: string;
  title: string;
  description: string;
  bannerUrl: string;
  startsAt: string;
  endsAt: string | null;
  locationName: string;
  city: string;
  status: "published" | "completed" | "cancelled";
  availability: "open" | "last_spots" | "sold_out" | "registration_closed" | "completed" | "cancelled";
  capacity: number | null;
  remainingSpots: number | null;
  registrationDeadline: string | null;
  allowGuests: boolean;
  maxGuestsPerMember: number;
  participantCount: number;
  registered: boolean;
  registrationStatus: "expected" | "present" | "absent" | null;
  registration: { phone: string; company: string } | null;
  guests: Array<{ id: number; name: string; email: string; phone: string; status: string }>;
};
type TutorCitation = {
  id: string;
  title: string;
  course: string;
  module: string | null;
  excerpt: string;
};
type TutorMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: TutorCitation[];
  grounded?: boolean;
};
type PodcastEpisode = { id: number; title: string; description: string; guestName: string; seasonNumber: number | null; episodeNumber: number | null; thumbnailUrl: string; externalUrl: string; locked: boolean };
type HomeConnection = { userId: string; name: string | null; avatarUrl: string | null; company: string | null; jobTitle: string | null; segment: string | null; reason: string };

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: "accepted" | "dismissed" }> };

const menu: Array<{ id: Section; icon: string; label: string }> = [
  { id: "inicio", icon: "⌂", label: "Início" },
  { id: "cursos", icon: "▶", label: "Cursos" },
  { id: "podcasts", icon: "◉", label: "Podcasts" },
  { id: "tutor", icon: "✦", label: "Tutor TIME IA" },
  { id: "comunidade", icon: "◉", label: "Comunidade" },
  { id: "agenda", icon: "□", label: "Eventos" },
  { id: "conquistas", icon: "◇", label: "Conquistas" },
];

const communityCategories: Array<{ id: CommunityCategory | "all"; label: string; icon: string }> = [
  { id: "all", label: "Todos", icon: "◉" },
  { id: "opportunity", label: "Oportunidades", icon: "↗" },
  { id: "achievement", label: "Conquistas", icon: "◇" },
  { id: "question", label: "Dúvidas", icon: "?" },
  { id: "business", label: "Negócios", icon: "◇" },
  { id: "offer", label: "Ofertas dos membros", icon: "↗" },
  { id: "news", label: "Novidades", icon: "○" },
  { id: "general", label: "Conversas", icon: "○" },
];

const mobileMenu = menu.slice(0, 2);

// Prévia editorial: estas áreas não representam cursos publicados, professores
// ou datas confirmadas. Elas mostram como a biblioteca será organizada quando
// a TIME liberar conteúdo real pelo painel administrativo.
const upcomingCoursePreviews = [
  { area: "Vendas", image: "/course-carousel/vendas.webp" },
  { area: "Comunicação", image: "/course-carousel/comunicacao.webp" },
  { area: "Automotivo", image: "/course-carousel/automotivo.webp" },
  { area: "Gestão", image: "/course-carousel/gestao.webp" },
  { area: "Finanças", image: "/course-carousel/financas.webp" },
  { area: "Patrimônio", image: "/course-carousel/patrimonio.webp" },
  { area: "Bitcoin", image: "/course-carousel/bitcoin.webp" },
  { area: "Marketing", image: "/course-carousel/marketing.webp" },
  { area: "Networking", image: "/course-carousel/networking.webp" },
] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "T";
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "membro";
}

function formatDuration(seconds: number) {
  if (!seconds) return "Duração não informada";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}min`
    : `${minutes} min`;
}

function timeAgo(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

function formatShortDate(value: string) {
  const normalized = value.length === 10 ? `${value}T12:00:00` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "A confirmar" : new Intl.DateTimeFormat("pt-BR").format(date);
}

function eventDateParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: "--", month: "---", full: "Data a confirmar", time: "" };
  const formatOptions = { timeZone: "America/Sao_Paulo" } as const;
  return {
    day: new Intl.DateTimeFormat("pt-BR", { ...formatOptions, day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("pt-BR", { ...formatOptions, month: "short" }).format(date).replace(".", "").toUpperCase(),
    full: new Intl.DateTimeFormat("pt-BR", { ...formatOptions, weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat("pt-BR", { ...formatOptions, hour: "2-digit", minute: "2-digit" }).format(date),
  };
}

function calendarUrl(event: TimeEvent) {
  const compact = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = event.endsAt || new Date(new Date(event.startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${compact(event.startsAt)}/${compact(end)}`,
    details: event.description || "Evento da TIME Escola de Negócios",
    location: [event.locationName, event.city].filter(Boolean).join(" · "),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function eventCoverUrl(event: TimeEvent) {
  return event.bannerUrl || "";
}

function eventAvailabilityLabel(event: TimeEvent) {
  const labels: Record<TimeEvent["availability"], string> = {
    open: "INSCRIÇÕES ABERTAS",
    last_spots: "ÚLTIMAS VAGAS",
    sold_out: "LOTADO",
    registration_closed: "INSCRIÇÕES ENCERRADAS",
    completed: "EVENTO ENCERRADO",
    cancelled: "EVENTO CANCELADO",
  };
  return labels[event.availability];
}

function categoryLabel(category: CommunityCategory) {
  return communityCategories.find((item) => item.id === category)?.label ?? "Conversas";
}

function renderLinkedText(value: string) {
  const urlPattern = /(https:\/\/[^\s<]+)/g;
  return value.split(urlPattern).map((part, index) => {
    if (!part.startsWith("https://")) return part;
    const href = part.replace(/[),.!?]+$/, "");
    const suffix = part.slice(href.length);
    return <span key={`${href}-${index}`}><a href={href} target="_blank" rel="noreferrer">{href}</a>{suffix}</span>;
  });
}

function displayLink(url: string) {
  if (url.startsWith("/api/uploads")) return "Mídia da comunidade";
  try { return new URL(url).hostname.replace(/^www\./, "") || "Link"; } catch { return "Link"; }
}

function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <section className="real-empty-state">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </section>
  );
}

function LoadingCards() {
  return (
    <div className="real-loading-grid" aria-label="Carregando conteúdo">
      {[0, 1, 2].map((item) => <div key={item}><i /><span /><span /></div>)}
    </div>
  );
}

function PageHeading({ kicker, title, description, aside }: { kicker: string; title: string; description: string; aside?: React.ReactNode }) {
  return (
    <section className="member-page-heading">
      <div><span>{kicker}</span><h1>{title}</h1><p>{description}</p></div>
      {aside}
    </section>
  );
}

function ProfileGate({ completeness, missingFields, area }: { completeness: number; missingFields: string[]; area: string }) {
  return <section className="profile-access-gate" role="status">
    <div className="profile-gate-score"><strong>{completeness}</strong><span>%</span></div>
    <div><span className="profile-gate-kicker">CAMPOS ESSENCIAIS</span><h2>Complete os dados necessários para acessar {area}</h2><p>Para participar, informe os dados profissionais essenciais usados nas conexões da TIME. Os demais campos continuam opcionais.</p><div className="profile-gate-progress"><i style={{ width: `${completeness}%` }} /></div><small>{completeness}% preenchido · faltam {missingFields.length} campos essenciais</small></div>
    <a href="/app/cadastro">Completar meu perfil →</a>
    {missingFields.length ? <ul>{missingFields.slice(0, 5).map((field) => <li key={field}>{field}</li>)}{missingFields.length > 5 ? <li>e mais {missingFields.length - 5} itens</li> : null}</ul> : null}
  </section>;
}

function MembershipGate({ area }: { area: string }) {
  return <section className="membership-gate"><span>EXCLUSIVO PARA MEMBROS</span><h2>Seu cadastro está pronto. Ative sua participação.</h2><p>Conheça a estrutura da TIME e torne-se membro para acessar {area}, networking, eventos e benefícios empresariais.</p><a href="/checkout">Tornar-me membro →</a></section>;
}

function CourseCard({ course, onOpen }: { course: Course; onOpen: () => void }) {
  return (
    <button className="member-course-card real-course-card" onClick={onOpen} aria-label={`Abrir ${course.title}`}>
      <div className="member-course-image">
        {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" /> : <div className="real-course-placeholder">TIME</div>}
        <div className="member-course-shade" />
        <span>{course.category || "CURSO TIME"}</span>
        <b aria-hidden="true">▶</b>
        <div className="streaming-card-hover" aria-hidden="true">
          <strong>{course.title}</strong>
          <small>{[course.teacher, `${course.lessonCount} ${course.lessonCount === 1 ? "aula" : "aulas"}`].filter(Boolean).join(" · ")}</small>
          <em>{course.progressPercent ? "Continuar curso" : "Ver curso"}</em>
        </div>
      </div>
      <div className="member-course-copy">
        <h3>{course.title}</h3>
        <p>{[course.teacher, `${course.lessonCount} ${course.lessonCount === 1 ? "aula" : "aulas"}`].filter(Boolean).join(" · ")}</p>
        <div className="member-course-progress" aria-label={`${course.progressPercent}% concluído`}><i style={{ width: `${course.progressPercent}%` }} /></div>
        <div className="member-course-meta">
          <span>{course.progressPercent ? `${course.progressPercent}% concluído` : "Começar curso"}</span>
          {course.averageRating ? <strong>★ {course.averageRating}</strong> : <strong>Sem avaliações</strong>}
        </div>
      </div>
    </button>
  );
}

function CourseRail({ title, eyebrow, courses, onOpen }: { title: string; eyebrow?: string; courses: Course[]; onOpen: (course: Course) => void }) {
  if (!courses.length) return null;
  return <section className="course-streaming-rail" aria-label={title}>
    <header>
      <div>{eyebrow ? <span>{eyebrow}</span> : null}<h2>{title}</h2></div>
      <span className="course-streaming-count">{courses.length} {courses.length === 1 ? "curso" : "cursos"}</span>
    </header>
    <div className="course-streaming-rail-track">
      {courses.map((course) => <CourseCard course={course} key={course.id} onOpen={() => onOpen(course)} />)}
    </div>
  </section>;
}

function UpcomingCourseShelf({ compact = false }: { compact?: boolean }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [carouselPaused, setCarouselPaused] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || carouselPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      const firstCard = rail.querySelector<HTMLElement>(".upcoming-course-card");
      if (!firstCard) return;
      const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 0;
      const step = firstCard.getBoundingClientRect().width + gap;
      const loopWidth = rail.scrollWidth / 2;

      const normalizedLeft = rail.scrollLeft >= loopWidth - step * 1.25
        ? Math.max(0, rail.scrollLeft - loopWidth)
        : rail.scrollLeft;

      if (normalizedLeft !== rail.scrollLeft) {
        rail.scrollTo({ left: normalizedLeft, behavior: "auto" });
      }
      rail.scrollTo({ left: normalizedLeft + step, behavior: "smooth" });
    }, 4800);

    return () => window.clearInterval(timer);
  }, [carouselPaused]);

  const repeatedPreviews = [...upcomingCoursePreviews, ...upcomingCoursePreviews];

  return (
    <section className={`upcoming-course-shelf ${compact ? "upcoming-course-shelf-compact" : ""}`} aria-labelledby="upcoming-courses-title">
      <header className="upcoming-course-heading">
        <div>
          <span>EM BREVE NA TIME</span>
          <h2 id="upcoming-courses-title">Uma biblioteca feita para acompanhar sua jornada.</h2>
        </div>
        {!compact ? <p>Estas áreas mostram a organização da plataforma. Títulos, professores, datas e materiais só aparecerão quando a TIME publicar cada conteúdo.</p> : null}
      </header>
      <div
        className="upcoming-course-rail"
        aria-label="Próximas áreas de conteúdo"
        ref={railRef}
        onFocus={() => setCarouselPaused(true)}
        onBlur={() => setCarouselPaused(false)}
        onPointerDown={() => setCarouselPaused(true)}
        onPointerUp={() => setCarouselPaused(false)}
      >
        {repeatedPreviews.map((preview, index) => (
          <article className="upcoming-course-card" key={`${preview.area}-${index}`} aria-hidden={index >= upcomingCoursePreviews.length ? "true" : undefined}>
            <div className="upcoming-course-art upcoming-course-art-image">
              <img src={preview.image} alt="" />
              <i />
              <span>TIME</span><b>{String((index % upcomingCoursePreviews.length) + 1).padStart(2, "0")}</b><em>EM BREVE</em>
            </div>
            <div className="upcoming-course-copy">
              <span>{preview.area}</span>
              <h3>Conteúdo em breve</h3>
              <p>A TIME divulgará esta trilha assim que estiver pronta.</p>
            </div>
          </article>
        ))}
      </div>
      <small className="upcoming-course-note">A prévia não representa matrícula, professor, data ou conteúdo confirmado.</small>
    </section>
  );
}

function SchoolComingSoon() {
  return (
    <section className="school-coming-soon" aria-labelledby="school-coming-soon-title">
      <div className="school-coming-soon-glow" aria-hidden="true" />
      <header className="school-coming-soon-hero">
        <div>
          <span>ESCOLA TIME</span>
          <strong>EM BREVE</strong>
        </div>
        <h1 id="school-coming-soon-title">Conteúdo que transforma conhecimento em resultado.</h1>
        <p>Estamos preparando os primeiros cursos e trilhas da TIME Escola de Negócios. Em breve você terá acesso a conteúdos práticos para vender mais, liderar melhor, organizar suas finanças, construir patrimônio e expandir seus negócios.</p>
        <small>PRÓXIMAS FORMAÇÕES</small>
      </header>
      <UpcomingCourseShelf />
    </section>
  );
}

function HomeSection({ member, courses, schoolComingSoon, posts, events, connections, profileCompleteness, profileReady, missingFields, greeting, todayLabel, loading, errors, onOpenCourse, onNavigate }: {
  member: Member;
  courses: Course[];
  schoolComingSoon: boolean;
  posts: CommunityPost[];
  events: TimeEvent[];
  connections: HomeConnection[];
  profileCompleteness: number;
  profileReady: boolean;
  missingFields: string[];
  greeting: string;
  todayLabel: string;
  loading: { courses: boolean; community: boolean; events: boolean };
  errors: { courses: string; community: string; events: string; connections: string };
  onOpenCourse: (course: Course) => void;
  onNavigate: (section: Section) => void;
}) {
  const recommended = schoolComingSoon ? null : selectHomeCourse(courses);
  const nextEvent = selectNextEvent(events);
  const recentPosts = selectHomePosts(posts);
  const canUse = (resource: Member["permissions"][number]) => member.permissions.includes(resource);
  const nextAction = !profileReady
    ? { eyebrow: "PRÓXIMA AÇÃO", title: "Complete seu perfil profissional", text: "Perfis completos geram conexões mais relevantes dentro da TIME.", label: "Completar perfil", href: "/app/cadastro" }
    : schoolComingSoon
      ? { eyebrow: "ESCOLA TIME", title: "Os primeiros conteúdos estão a caminho", text: "Conheça as próximas formações da TIME Escola de Negócios.", label: "Ver próximas formações", section: "cursos" as Section }
      : recommended
      ? { eyebrow: "PRÓXIMA AÇÃO", title: recommended.progressPercent ? "Continue sua jornada de aprendizado" : "Comece seu próximo aprendizado", text: recommended.title, label: recommended.progressPercent ? "Continuar curso" : "Abrir curso", course: recommended }
      : nextEvent
        ? { eyebrow: "PRÓXIMA AÇÃO", title: "Confira o próximo encontro da TIME", text: nextEvent.title, label: "Ver evento", section: "agenda" as Section }
        : { eyebrow: "PRÓXIMA AÇÃO", title: "Encontre uma conexão para o seu negócio", text: "Pesquise profissionais e empresas reais da comunidade TIME.", label: "Explorar conexões", href: "/app/conexoes" };

  return (
    <div className="member-home">
      <section className="member-home-intro">
        <span>{todayLabel}</span>
        <h1>{greeting}, <em>{firstName(member.name)}.</em></h1>
        <p>O que vamos movimentar hoje?</p>
      </section>

      <section className="member-home-next-action" aria-labelledby="home-next-action-title">
        <div><span>{nextAction.eyebrow}</span><h2 id="home-next-action-title">{nextAction.title}</h2><p>{nextAction.text}</p></div>
        {"course" in nextAction && nextAction.course ? <button onClick={() => onOpenCourse(nextAction.course)}>{nextAction.label}<b>→</b></button> : null}
        {"section" in nextAction && nextAction.section ? <button onClick={() => onNavigate(nextAction.section)}>{nextAction.label}<b>→</b></button> : null}
        {"href" in nextAction && nextAction.href ? <a href={nextAction.href}>{nextAction.label}<b>→</b></a> : null}
      </section>

      {profileCompleteness < 100 ? <section className="member-home-profile" aria-label="Completude do perfil">
        <div><span>SEU PERFIL</span><strong>{profileCompleteness}% completo</strong><p>Complete os dados que faltam para melhorar suas conexões.</p></div>
        <div className="member-home-profile-progress" aria-label={`${profileCompleteness}% do perfil preenchido`}><i style={{ width: `${profileCompleteness}%` }} /></div>
        <small>{missingFields.length ? `Próximo dado: ${missingFields[0]}` : "Revise seus dados profissionais"}</small>
        <a href="/app/cadastro">Completar perfil</a>
      </section> : null}

      <nav className="member-home-quick-actions" aria-label="Ações rápidas">
        <button onClick={() => onNavigate("cursos")}><span>01</span><strong>{schoolComingSoon ? "Escola em breve" : "Continuar curso"}</strong><small>{schoolComingSoon ? "Próximas formações" : "Aprender"}</small></button>
        {canUse("networking") ? <a href="/app/conexoes"><span>02</span><strong>Encontrar conexão</strong><small>Conectar</small></a> : <a href="/checkout"><span>02</span><strong>Liberar conexões</strong><small>Tornar-se membro</small></a>}
        <button onClick={() => onNavigate("agenda")}><span>03</span><strong>Confirmar evento</strong><small>Participar</small></button>
        <button onClick={() => onNavigate("comunidade")}><span>04</span><strong>Publicar oportunidade</strong><small>Fazer negócios</small></button>
      </nav>

      <section className="member-home-section" aria-labelledby="home-learning-title">
        <header><div><span>APRENDER</span><h2 id="home-learning-title">{schoolComingSoon ? "Escola TIME" : "Continue aprendendo"}</h2></div><button onClick={() => onNavigate("cursos")}>{schoolComingSoon ? "Ver prévia" : "Ver cursos"} <b>→</b></button></header>
        {schoolComingSoon ? <div className="member-home-inline-state school-coming-soon-home"><strong>Conteúdos e trilhas em breve.</strong><p>Estamos preparando formações práticas para o próximo movimento do seu negócio.</p><button onClick={() => onNavigate("cursos")}>Conhecer as próximas formações</button></div> : loading.courses ? <LoadingCards /> : errors.courses ? <div className="member-home-inline-state error" role="alert"><strong>Não foi possível carregar seu aprendizado.</strong><p>{errors.courses}</p></div> : recommended ? <article className="member-home-learning">
          {recommended.thumbnailUrl ? <img src={recommended.thumbnailUrl} alt="" /> : null}
          <div className="member-home-learning-overlay" />
          <div>
            <span>{recommended.progressPercent ? "CONTINUE DE ONDE PAROU" : "CONTEÚDO DISPONÍVEL"}</span>
            <h2>{recommended.title}</h2>
            <p>{recommended.description || "Abra o curso para conhecer as aulas disponíveis."}</p>
            <div className="member-home-learning-progress"><i style={{ width: `${recommended.progressPercent}%` }} /></div>
            <small>{recommended.completedLessons} de {recommended.lessonCount} aulas concluídas</small>
          </div>
          <button onClick={() => onOpenCourse(recommended)}>{recommended.progressPercent ? "Continuar" : "Abrir curso"}<b>→</b></button>
        </article> : <div className="member-home-inline-state"><strong>Nenhum curso disponível agora.</strong><p>Conteúdos publicados pela TIME aparecerão aqui automaticamente.</p></div>}
      </section>

      <section className="member-home-section" aria-labelledby="home-connections-title">
        <header><div><span>CONECTAR</span><h2 id="home-connections-title">Pessoas que podem fazer sentido para você</h2></div>{canUse("networking") ? <a href="/app/conexoes">Ver conexões <b>→</b></a> : null}</header>
        {!canUse("networking") ? <div className="member-home-inline-state locked"><strong>Conexões são exclusivas para membros.</strong><p>Ative sua associação para acessar perfis profissionais e contatos autorizados.</p><a href="/checkout">Tornar-me membro</a></div> : !profileReady ? <div className="member-home-inline-state"><strong>Complete os campos essenciais para receber conexões melhores.</strong><p>Usamos seus objetivos e necessidades reais, sem recomendações inventadas.</p><a href="/app/cadastro">Completar perfil</a></div> : errors.connections ? <div className="member-home-inline-state error" role="alert"><strong>Conexões indisponíveis no momento.</strong><p>{errors.connections}</p></div> : connections.length ? <div className="member-home-connections">{connections.map((connection) => <article key={connection.userId}>
          <div className="member-home-avatar" role="img" aria-label={`Foto de ${connection.name || "membro TIME"}`} style={connection.avatarUrl ? { backgroundImage: `url(${connection.avatarUrl})` } : undefined}>{connection.avatarUrl ? "" : initials(connection.name || "TIME")}</div>
          <div><span>{connection.segment || "Perfil empresarial"}</span><h3>{connection.name || "Perfil em atualização"}</h3><p>{[connection.jobTitle, connection.company].filter(Boolean).join(" · ") || "Informações profissionais em atualização"}</p><small>{connection.reason}</small></div>
          <a href={`/app/membros/${connection.userId}`}>Ver perfil</a>
        </article>)}</div> : <div className="member-home-inline-state"><strong>Ainda não encontramos uma conexão compatível.</strong><p>As recomendações usam somente dados reais preenchidos pelos membros.</p><a href="/app/conexoes">Pesquisar no TIME Match</a></div>}
      </section>

      <section className="member-home-split">
        <article className="member-home-event" aria-label="Próximo evento">
          <header><span>PRÓXIMO EVENTO</span><button onClick={() => onNavigate("agenda")}>Ver agenda <b>→</b></button></header>
          {loading.events ? <div className="member-home-card-loading" aria-label="Carregando próximo evento" /> : errors.events ? <div className="member-home-inline-state error" role="alert"><strong>Agenda indisponível.</strong><p>{errors.events}</p></div> : nextEvent ? <div className="member-home-event-content">
            {eventCoverUrl(nextEvent) ? <img src={eventCoverUrl(nextEvent)} alt="" /> : null}
            <div><span>{eventAvailabilityLabel(nextEvent)}</span><h2 id="home-event-title">{nextEvent.title}</h2><p>{eventDateParts(nextEvent.startsAt).full} · {eventDateParts(nextEvent.startsAt).time}</p><small>{[nextEvent.locationName, nextEvent.city].filter(Boolean).join(" · ") || "Local a confirmar"}</small><button onClick={() => onNavigate("agenda")}>{nextEvent.registered ? "Inscrição confirmada" : "Ver evento"}<b>→</b></button></div>
          </div> : <div className="member-home-inline-state"><strong id="home-event-title">Nenhum próximo evento publicado.</strong><p>A agenda será atualizada quando a equipe confirmar uma nova data.</p></div>}
        </article>

        <article className="member-home-community" aria-labelledby="home-community-title">
          <header><div><span>COMUNIDADE</span><h2 id="home-community-title">O que está movimentando a TIME</h2></div><button onClick={() => onNavigate("comunidade")}>Ver comunidade <b>→</b></button></header>
          {loading.community ? <div className="member-home-card-loading" aria-label="Carregando comunidade" /> : errors.community ? <div className="member-home-inline-state error" role="alert"><strong>Comunidade indisponível.</strong><p>{errors.community}</p></div> : recentPosts.length ? <div className="member-home-posts">{recentPosts.map((post) => <button key={post.id} onClick={() => onNavigate("comunidade")}><span>{categoryLabel(post.category)}</span><strong>{post.title || post.content.slice(0, 88)}</strong><small>{post.authorName} · {timeAgo(post.createdAt)}</small></button>)}</div> : <div className="member-home-inline-state"><strong>Nenhuma oportunidade ou novidade recente.</strong><p>As publicações reais da comunidade aparecerão aqui.</p></div>}
        </article>
      </section>

      <section className="member-home-business" aria-labelledby="home-business-title">
        <div><span>FAZER NEGÓCIOS</span><h2 id="home-business-title">Transforme uma necessidade em movimento.</h2><p>Encontre fornecedores, procure parceiros ou compartilhe uma oportunidade com a comunidade.</p></div>
        <div>
          {canUse("networking") ? <a href="/app/conexoes">Procurar fornecedor <b>→</b></a> : <a href="/checkout">Liberar networking <b>→</b></a>}
          <button onClick={() => onNavigate("comunidade")}>Publicar oportunidade <b>→</b></button>
          <button onClick={() => onNavigate("comunidade")}>Publicar oferta <b>→</b></button>
        </div>
      </section>
    </div>
  );
}

function CoursesSection({ courses, loading, error, search, onOpen }: { courses: Course[]; loading: boolean; error: string; search: string; onOpen: (course: Course) => void }) {
  const [filter, setFilter] = useState("Todos");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const categories = useMemo(() => ["Todas", ...Array.from(new Set(courses.map((course) => course.category).filter(Boolean)))], [courses]);
  const filtered = courses.filter((course) => {
    const matchesSearch = `${course.title} ${course.teacher} ${course.category}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "Todos" || (filter === "Em andamento" && course.startedLessons > 0 && course.progressPercent < 100) || (filter === "Não iniciados" && course.startedLessons === 0) || (filter === "Concluídos" && course.progressPercent === 100);
    const matchesCategory = categoryFilter === "Todas" || course.category === categoryFilter;
    return matchesSearch && matchesFilter && matchesCategory;
  });
  const inProgress = courses.filter((course) => course.startedLessons > 0 && course.progressPercent < 100);
  const completed = courses.filter((course) => course.lessonCount > 0 && course.progressPercent === 100);
  const featured = inProgress[0] ?? courses[0] ?? null;
  const featuredDuration = featured ? featured.lessons.reduce((total, lesson) => total + lesson.durationSeconds, 0) : 0;
  const categoryRails = categories.filter((category) => category !== "Todas").map((category) => ({ category, courses: courses.filter((course) => course.category === category) }));

  return (
    <section className="course-streaming-shell">
      <header className="course-streaming-heading">
        <div><span>BIBLIOTECA TIME</span><h1>Conhecimento para o próximo movimento.</h1></div>
        {courses.length ? <small>{courses.length} {courses.length === 1 ? "curso publicado" : "cursos publicados"}</small> : null}
      </header>

      {featured ? <section className="course-streaming-hero">
        {featured.thumbnailUrl ? <img src={featured.thumbnailUrl} alt="" /> : <div className="course-streaming-hero-placeholder">TIME</div>}
        <div className="course-streaming-hero-overlay" />
        <div className="course-streaming-hero-content">
          <span>{featured.progressPercent ? "CONTINUE DE ONDE PAROU" : "CURSO EM DESTAQUE"}</span>
          <h2>{featured.title}</h2>
          <p>{featured.description || "Abra o curso para conhecer a jornada, os módulos e as aulas disponíveis."}</p>
          <ul>
            {featured.category ? <li>{featured.category}</li> : null}
            {featured.teacher ? <li>{featured.teacher}</li> : null}
            {featuredDuration ? <li>{formatDuration(featuredDuration)}</li> : null}
            <li>{featured.lessonCount} {featured.lessonCount === 1 ? "aula" : "aulas"}</li>
          </ul>
          {featured.progressPercent ? <div className="course-streaming-hero-progress"><i style={{ width: `${featured.progressPercent}%` }} /><small>{featured.progressPercent}% concluído</small></div> : null}
          <div className="course-streaming-hero-actions"><button onClick={() => onOpen(featured)}><span>▶</span>{featured.progressPercent ? "Continuar curso" : "Começar agora"}</button><button className="secondary" onClick={() => onOpen(featured)}>Abrir curso</button></div>
        </div>
      </section> : loading ? <LoadingCards /> : <EmptyState icon="▶" title="A biblioteca está sendo preparada" text="Quando a TIME publicar o primeiro curso, ele aparecerá aqui automaticamente." />}

      {error ? <div className="real-inline-error" role="alert">{error}</div> : null}

      {courses.length ? <>
        <div className="course-streaming-filters">
          {categories.length > 1 ? <div className="course-streaming-filter-rail" role="tablist" aria-label="Filtrar por categoria">{categories.map((category) => <button role="tab" aria-selected={categoryFilter === category} className={categoryFilter === category ? "active" : ""} key={category} onClick={() => setCategoryFilter(category)}>{category}</button>)}</div> : null}
          <div className="course-streaming-filter-rail status" role="tablist" aria-label="Filtrar por progresso">{["Todos", "Em andamento", "Não iniciados", "Concluídos"].map((item) => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
        </div>
        <CourseRail title="Continue de onde parou" eyebrow="SUA JORNADA" courses={inProgress} onOpen={onOpen} />
        <CourseRail title="Em destaque na TIME" eyebrow="CONTEÚDOS PUBLICADOS" courses={courses.slice(0, 8)} onOpen={onOpen} />
        {categoryRails.map(({ category, courses: categoryCourses }) => <CourseRail title={category} eyebrow="EXPLORAR POR CATEGORIA" courses={categoryCourses} onOpen={onOpen} key={category} />)}
        {completed.length ? <CourseRail title="Cursos concluídos" eyebrow="SUA HISTÓRIA" courses={completed} onOpen={onOpen} /> : null}
        <section className="course-streaming-catalog"><header><div><span>CATÁLOGO COMPLETO</span><h2>{categoryFilter === "Todas" ? "Todos os cursos publicados" : categoryFilter}</h2></div><small>{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}</small></header>{loading ? <LoadingCards /> : filtered.length ? <div className="course-streaming-catalog-grid">{filtered.map((course) => <CourseCard course={course} key={course.id} onOpen={() => onOpen(course)} />)}</div> : <EmptyState icon="⌕" title="Nenhum curso neste filtro" text="Tente uma categoria ou status diferente." />}</section>
      </> : null}
      <UpcomingCourseShelf />
    </section>
  );
}

function CommunityPostCard({ post, onUpdate, onRemove }: { post: CommunityPost; onUpdate: (patch: Partial<CommunityPost>) => void; onRemove: () => void }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [interactionError, setInteractionError] = useState("");
  const [sharingNotice, setSharingNotice] = useState("");

  async function toggleInteraction(action: "like" | "save") {
    setInteractionError("");
    try {
      const response = await fetch(`/api/community/${post.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const payload = (await response.json()) as { active?: boolean; error?: string };
      if (!response.ok || typeof payload.active !== "boolean") throw new Error(payload.error ?? "Não foi possível registrar a interação.");
      if (action === "like") onUpdate({ likedByMe: payload.active, likesCount: Math.max(0, post.likesCount + (payload.active ? 1 : -1)) });
      else onUpdate({ savedByMe: payload.active });
    } catch (error) {
      setInteractionError(error instanceof Error ? error.message : "Não foi possível registrar a interação.");
    }
  }

  async function loadComments() {
    if (commentsLoaded || commentsLoading) return;
    setCommentsLoading(true);
    setInteractionError("");
    try {
      const response = await fetch(`/api/community/${post.id}/comments`, { cache: "no-store" });
      const payload = (await response.json()) as { comments?: CommunityComment[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os comentários.");
      setComments(payload.comments ?? []);
      setCommentsLoaded(true);
    } catch (error) {
      setInteractionError(error instanceof Error ? error.message : "Não foi possível carregar os comentários.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function toggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next) await loadComments();
  }

  async function publishComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = commentText.trim();
    if (!content) return;
    setCommentsLoading(true);
    setInteractionError("");
    try {
      const response = await fetch(`/api/community/${post.id}/comments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }) });
      const payload = (await response.json()) as { comment?: CommunityComment; error?: string };
      if (!response.ok || !payload.comment) throw new Error(payload.error ?? "Não foi possível publicar o comentário.");
      setComments((current) => [...current, payload.comment!]);
      setCommentText("");
      onUpdate({ commentsCount: post.commentsCount + 1 });
    } catch (error) {
      setInteractionError(error instanceof Error ? error.message : "Não foi possível publicar o comentário.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function sharePost() {
    const url = `${window.location.origin}/app/comunidade#publicacao-${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `Publicação de ${post.authorName} na TIME`, text: post.content.slice(0, 180), url });
      else { await navigator.clipboard.writeText(url); setSharingNotice("Link copiado"); }
    } catch { /* O usuário pode fechar o compartilhamento sem concluir. */ }
  }

  async function editPost() {
    const content = window.prompt("Editar publicação:", post.content)?.trim();
    if (!content || content === post.content) return;
    setInteractionError("");
    try {
      const response = await fetch(`/api/community/${post.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }) });
      const payload = await response.json() as { post?: { content: string }; error?: string };
      if (!response.ok || !payload.post) throw new Error(payload.error ?? "Não foi possível editar a publicação.");
      onUpdate({ content: payload.post.content });
    } catch (error) { setInteractionError(error instanceof Error ? error.message : "Não foi possível editar a publicação."); }
  }

  async function deletePost() {
    if (!window.confirm("Excluir esta publicação?")) return;
    setInteractionError("");
    try {
      const response = await fetch(`/api/community/${post.id}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível excluir a publicação.");
      onRemove();
    } catch (error) { setInteractionError(error instanceof Error ? error.message : "Não foi possível excluir a publicação."); }
  }

  async function reportPost() {
    const reason = window.prompt("Por que este conteúdo deve ser revisado?", "Conteúdo inadequado")?.trim();
    if (!reason) return;
    try {
      const response = await fetch(`/api/community/${post.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "report", reason }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível enviar a denúncia.");
      setSharingNotice("Enviado para revisão");
    } catch (error) { setInteractionError(error instanceof Error ? error.message : "Não foi possível enviar a denúncia."); }
  }

  async function deleteComment(comment: CommunityComment) {
    if (!window.confirm("Excluir este comentário?")) return;
    try {
      const response = await fetch(`/api/community/${post.id}/comments`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ commentId: comment.id }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível excluir o comentário.");
      setComments((current) => current.filter((item) => item.id !== comment.id));
      onUpdate({ commentsCount: Math.max(0, post.commentsCount - 1) });
    } catch (error) { setInteractionError(error instanceof Error ? error.message : "Não foi possível excluir o comentário."); }
  }

  return <article id={`publicacao-${post.id}`} className={`community-post reference-social-post ${post.official ? "official-real-post" : ""}`}>
    <header><span className="community-avatar">{initials(post.authorName)}</span><div><strong>{post.authorName}</strong><small>{post.official ? "Aviso oficial · " : `${categoryLabel(post.category)} · `}{timeAgo(post.createdAt)}</small></div>{post.official ? <b>TIME</b> : <span className="reference-post-category">{categoryLabel(post.category)}</span>}</header>
    {post.title ? <h3 className="community-offer-title">{post.title}</h3> : null}
    {post.content ? <p>{renderLinkedText(post.content)}</p> : null}
    {post.category === "offer" ? <dl className="community-offer-details"><div><dt>Empresa</dt><dd>{post.company}</dd></div><div><dt>Benefício</dt><dd>{post.benefit}</dd></div>{post.discount ? <div><dt>Desconto</dt><dd>{post.discount}</dd></div> : null}{post.conditions ? <div><dt>Condições</dt><dd>{post.conditions}</dd></div> : null}{post.validUntil ? <div><dt>Validade</dt><dd>{formatShortDate(post.validUntil)}</dd></div> : null}<div><dt>Contato</dt><dd>{post.contact}</dd></div></dl> : null}
    {post.attachments?.length ? <div className="community-post-attachments">{post.attachments.map((attachment) => attachment.kind === "link" ? <a className="community-link-card" href={attachment.url} target="_blank" rel="noreferrer" key={attachment.url}><span>↗</span><div><small>LINK COMPARTILHADO</small><strong>{attachment.label || displayLink(attachment.url)}</strong><em>Abrir em nova aba</em></div></a> : attachment.kind === "video" ? <figure className="is-video" key={attachment.url}><video controls playsInline preload="metadata" src={attachment.url} aria-label={attachment.label || "Vídeo compartilhado na comunidade"} /><figcaption>{attachment.label || "Vídeo compartilhado"}</figcaption></figure> : <figure className={attachment.kind === "gif" ? "is-gif" : ""} key={attachment.url}><img src={attachment.url} alt={attachment.label || "Imagem compartilhada na comunidade"} loading="lazy" /><figcaption>{attachment.kind === "gif" ? "GIF compartilhado" : attachment.label || "Imagem compartilhada"}</figcaption></figure>)}</div> : null}
    <footer className="reference-post-actions">
      <button className={post.likedByMe ? "active" : ""} onClick={() => void toggleInteraction("like")} aria-pressed={post.likedByMe}>♡ <span>{post.likesCount || "Curtir"}</span></button>
      <button className={commentsOpen ? "active" : ""} onClick={() => void toggleComments()} aria-expanded={commentsOpen}>◯ <span>{post.commentsCount || "Comentar"}</span></button>
      <button onClick={() => void sharePost()}>↗ <span>{sharingNotice || "Compartilhar"}</span></button>
      <button className={post.savedByMe ? "active save" : "save"} onClick={() => void toggleInteraction("save")} aria-pressed={post.savedByMe}>◇ <span>{post.savedByMe ? "Salvo" : "Salvar"}</span></button>
      {post.own ? <><button onClick={() => void editPost()}>✎ <span>Editar</span></button><button onClick={() => void deletePost()}>× <span>Excluir</span></button></> : <button onClick={() => void reportPost()}>! <span>Denunciar</span></button>}
    </footer>
    {commentsOpen ? <section className="reference-comments" aria-label="Comentários da publicação">
      {commentsLoading && !commentsLoaded ? <p>Carregando comentários…</p> : null}
      {commentsLoaded && !comments.length ? <p>Seja a primeira pessoa a comentar.</p> : comments.map((comment) => <article key={comment.id}><span>{initials(comment.authorName)}</span><div><strong>{comment.authorName}</strong><small>{timeAgo(comment.createdAt)}</small><p>{comment.content}</p>{comment.own ? <button className="comment-delete-action" onClick={() => void deleteComment(comment)}>Excluir comentário</button> : null}</div></article>)}
      <form onSubmit={publishComment}><input maxLength={1200} aria-label="Escrever comentário" placeholder="Contribua com contexto…" value={commentText} onChange={(event) => setCommentText(event.target.value)} /><button disabled={commentText.trim().length < 2 || commentsLoading}>Enviar</button></form>
    </section> : null}
    {interactionError ? <p className="form-error" role="alert">{interactionError}</p> : null}
  </article>;
}

function CommunitySection({ member, posts, setPosts, loading, error, reload }: { member: Member; posts: CommunityPost[]; setPosts: React.Dispatch<React.SetStateAction<CommunityPost[]>>; loading: boolean; error: string; reload: () => Promise<void> }) {
  const [postText, setPostText] = useState("");
  const [postCategory, setPostCategory] = useState<CommunityCategory>("general");
  const [feedCategory, setFeedCategory] = useState<CommunityCategory | "all">("all");
  const [linkInput, setLinkInput] = useState("");
  const [attachments, setAttachments] = useState<CommunityAttachment[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [offerDraft, setOfferDraft] = useState({ title: "", company: "", benefit: "", discount: "", conditions: "", validUntil: "", contact: "" });
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const maxAttachments = 4;
  const filteredPosts = posts.filter((post) => feedCategory === "all" || post.category === feedCategory || (post.official && feedCategory === "general"));

  function removeAttachment(url: string) {
    setAttachments((current) => current.filter((attachment) => attachment.url !== url));
  }

  function addLink() {
    const url = linkInput.trim();
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") throw new Error();
      if (attachments.length >= maxAttachments) { setAttachmentError(`Você pode adicionar até ${maxAttachments} mídias ou links por publicação.`); return; }
      if (attachments.some((attachment) => attachment.url === parsed.toString())) { setAttachmentError("Este link já foi adicionado."); return; }
      const kind: CommunityAttachment["kind"] = /\.gif(?:$|[?#])/i.test(parsed.pathname) || parsed.hostname.includes("giphy") ? "gif" : "link";
      setAttachments((current) => [...current, { kind, url: parsed.toString() }]);
      setLinkInput("");
      setAttachmentError("");
    } catch {
      setAttachmentError("Cole um link HTTPS válido.");
    }
  }

  async function uploadCommunityMedia(file: File | null) {
    if (!file) return;
    if (attachments.length >= maxAttachments) { setAttachmentError(`Você pode adicionar até ${maxAttachments} mídias ou links por publicação.`); return; }
    const isVideo = file.type.startsWith("video/");
    setUploading(true);
    setAttachmentError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "community");
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "Não foi possível enviar a mídia.");
      setAttachments((current) => [...current, {
        kind: isVideo ? "video" : file.type === "image/gif" ? "gif" : "image",
        url: payload.url!,
        label: file.name.slice(0, 160),
      }]);
    } catch (requestError) {
      const rawMessage = requestError instanceof Error ? requestError.message : "";
      setAttachmentError(/failed to fetch/i.test(rawMessage) ? "Não foi possível conectar ao envio agora. Verifique sua conexão e tente novamente." : rawMessage || "Não foi possível enviar a mídia.");
    } finally {
      setUploading(false);
      if (imageInput.current) imageInput.current.value = "";
      if (videoInput.current) videoInput.current.value = "";
    }
  }

  async function publishPost() {
    const clean = postText.trim();
    if (!clean && !attachments.length) return;
    setPublishing(true);
    setPublishError("");
    try {
      const response = await fetch("/api/community", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: clean, category: postCategory, attachments, ...(postCategory === "offer" ? { offer: offerDraft } : {}) }) });
      const data = (await response.json()) as { post?: CommunityPost; error?: string };
      if (!response.ok || !data.post) throw new Error(data.error ?? "Não foi possível publicar.");
      setPosts((current) => [data.post!, ...current]);
      setPostText("");
      setPostCategory("general");
      setAttachments([]);
      setOfferDraft({ title: "", company: "", benefit: "", discount: "", conditions: "", validUntil: "", contact: "" });
    } catch (requestError) {
      const rawMessage = requestError instanceof Error ? requestError.message : "";
      setPublishError(/failed to fetch/i.test(rawMessage) ? "Não foi possível conectar à comunidade agora. Sua publicação não foi enviada; tente novamente." : rawMessage || "Não foi possível publicar.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <>
      <PageHeading kicker="COMUNIDADE EMPRESARIAL" title="Contexto antes do contato." description="Compartilhe oportunidades, conquistas, dúvidas e aprendizados com pessoas que também constroem negócios." aside={<div className="online-members"><div><i />Ambiente próprio</div><span>{posts.length} {posts.length === 1 ? "publicação carregada" : "publicações carregadas"}</span></div>} />
      <nav className="reference-community-tabs" aria-label="Filtrar publicações">{communityCategories.map((category) => <button className={feedCategory === category.id ? "active" : ""} key={category.id} onClick={() => setFeedCategory(category.id)}><span>{category.icon}</span>{category.label}</button>)}</nav>
      <div className="community-layout real-community-layout">
        <div className="community-feed">
          <article className="new-post-card social-post-composer">
            <span className="community-avatar own-avatar">{initials(member.name)}</span>
            <div className="community-composer-main">
              <label className="community-composer-label" htmlFor="community-caption">NOVA PUBLICAÇÃO</label>
              <div className="reference-intent-picker" role="group" aria-label="Tipo de publicação">{communityCategories.filter((category) => category.id !== "all").map((category) => <button type="button" className={postCategory === category.id ? "active" : ""} key={category.id} onClick={() => setPostCategory(category.id as CommunityCategory)}>{category.icon} {category.label}</button>)}</div>
              <textarea id="community-caption" aria-label="Legenda da publicação" maxLength={4000} placeholder="Escreva sua legenda, aprendizado, dúvida ou oportunidade…" value={postText} onChange={(event) => setPostText(event.target.value)} />
              {postCategory === "offer" ? <fieldset className="community-offer-form"><legend>Informações da oferta</legend><div><label>Título<input required maxLength={180} value={offerDraft.title} onChange={(event) => setOfferDraft({ ...offerDraft, title: event.target.value })} placeholder="Ex.: Condição especial para membros TIME" /></label><label>Empresa<input required maxLength={180} value={offerDraft.company} onChange={(event) => setOfferDraft({ ...offerDraft, company: event.target.value })} /></label></div><label>Benefício<textarea required maxLength={500} value={offerDraft.benefit} onChange={(event) => setOfferDraft({ ...offerDraft, benefit: event.target.value })} placeholder="Descreva o benefício oferecido." /></label><div><label>Desconto ou condição<input maxLength={100} value={offerDraft.discount} onChange={(event) => setOfferDraft({ ...offerDraft, discount: event.target.value })} placeholder="Ex.: 20% de desconto" /></label><label>Validade<input type="date" value={offerDraft.validUntil} onChange={(event) => setOfferDraft({ ...offerDraft, validUntil: event.target.value })} /></label></div><label>Condições<textarea maxLength={1200} value={offerDraft.conditions} onChange={(event) => setOfferDraft({ ...offerDraft, conditions: event.target.value })} /></label><label>Contato<input required maxLength={220} value={offerDraft.contact} onChange={(event) => setOfferDraft({ ...offerDraft, contact: event.target.value })} placeholder="WhatsApp ou link HTTPS" /></label></fieldset> : null}
              <div className="community-composer-tools" aria-label="Adicionar mídia à publicação">
                <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={(event) => void uploadCommunityMedia(event.target.files?.[0] ?? null)} />
                <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => void uploadCommunityMedia(event.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => imageInput.current?.click()} disabled={uploading || attachments.length >= maxAttachments}>{uploading ? "Enviando…" : "▧ Imagem ou GIF"}</button>
                <button type="button" onClick={() => videoInput.current?.click()} disabled={uploading || attachments.length >= maxAttachments}>{uploading ? "Enviando…" : "▶ Vídeo"}</button>
                <div className="community-link-input"><input aria-label="Colar link na publicação" type="url" inputMode="url" placeholder="Cole um link https://" value={linkInput} onChange={(event) => setLinkInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addLink(); } }} /><button type="button" onClick={addLink} disabled={!linkInput.trim() || attachments.length >= maxAttachments}>Adicionar link</button></div>
              </div>
              {attachments.length ? <div className="community-attachment-drafts" aria-label="Mídias e links da publicação">{attachments.map((attachment) => <div key={attachment.url} className={`attachment-draft ${attachment.kind}`}><span>{attachment.kind === "link" ? "↗" : attachment.kind === "gif" ? "GIF" : attachment.kind === "video" ? "▶" : "▧"}</span><strong>{attachment.label || displayLink(attachment.url)}</strong><button type="button" onClick={() => removeAttachment(attachment.url)} aria-label={`Remover ${attachment.label || "anexo"}`}>×</button></div>)}</div> : null}
              <div className="new-post-actions"><small>{postText.length}/4000 · até {maxAttachments} mídias ou links</small><button className="publish-button" disabled={(!postText.trim() && !attachments.length) || (postCategory === "offer" && (!offerDraft.title.trim() || !offerDraft.company.trim() || !offerDraft.benefit.trim() || !offerDraft.contact.trim())) || publishing || uploading} onClick={publishPost}>{publishing ? "Publicando…" : "Publicar agora →"}</button></div>
              {attachmentError ? <p className="form-error" role="alert">{attachmentError}</p> : null}
              {publishError ? <p className="form-error" role="alert">{publishError}</p> : null}
            </div>
          </article>
          {error ? <div className="real-inline-error" role="alert">{error}<button onClick={() => void reload()}>Tentar novamente</button></div> : null}
          {loading ? <LoadingCards /> : filteredPosts.length ? filteredPosts.map((post) => <CommunityPostCard post={post} key={post.id} onUpdate={(patch) => setPosts((current) => current.map((item) => item.id === post.id ? { ...item, ...patch } : item))} onRemove={() => setPosts((current) => current.filter((item) => item.id !== post.id))} />) : <EmptyState icon="◉" title={posts.length ? "Nenhuma publicação neste tema" : "A conversa começa aqui"} text={posts.length ? "Escolha outro filtro ou publique a primeira contribuição desta categoria." : "Ainda não há publicações. Compartilhe o primeiro aprendizado com a comunidade."} />}
        </div>
        <aside className="community-rail real-community-rail">
          <section className="network-card"><div className="rail-title"><div><span>NETWORKING COM CONTEXTO</span><h3>Construa relevância antes do contato</h3></div></div><ol><li><b>01</b><span>Compartilhe o que você está construindo.</span></li><li><b>02</b><span>Explique qual conexão procura.</span></li><li><b>03</b><span>Contribua antes de pedir.</span></li></ol></section>
          <section className="real-safety-card"><span>AMBIENTE PRÓPRIO</span><h3>Sem depender de grupos externos</h3><p>Avisos e conversas ficam vinculados à conta e ao acesso ativo do membro.</p></section>
        </aside>
      </div>
    </>
  );
}

function PodcastsSection({ episodes, loading, error, canListen }: { episodes: PodcastEpisode[]; loading: boolean; error: string; canListen: boolean }) {
  return <><PageHeading kicker="TIME PODCAST" title="Conversas para quem constrói negócios." description="Episódios e entrevistas publicados oficialmente pela TIME." />{error ? <div className="real-inline-error" role="alert">{error}</div> : null}{loading ? <LoadingCards /> : episodes.length ? <div className="podcast-grid">{episodes.map((episode) => <article key={episode.id}><div className="podcast-cover">{episode.thumbnailUrl ? <img src={episode.thumbnailUrl} alt="" /> : <img src={courseThumbnailLibrary[9].src} alt="" />}</div><div><small>{[episode.seasonNumber ? `TEMPORADA ${episode.seasonNumber}` : "TIME PODCAST", episode.episodeNumber ? `EP. ${episode.episodeNumber}` : ""].filter(Boolean).join(" · ")}</small><h2>{episode.title}</h2>{episode.guestName ? <strong>Com {episode.guestName}</strong> : null}<p>{episode.description || "Descrição em preparação."}</p>{canListen && episode.externalUrl ? <a href={episode.externalUrl} target="_blank" rel="noreferrer">Assistir episódio →</a> : <button type="button" disabled>Exclusivo para membros</button>}</div></article>)}</div> : <EmptyState icon="◉" title="Podcasts em preparação" text="Os episódios oficiais aparecerão aqui assim que forem publicados pela equipe TIME." />}{!canListen ? <MembershipGate area="os episódios completos" /> : null}</>;
}

function TutorSection({ courses, member }: { courses: Course[]; member: Member }) {
  const welcome = `Olá, ${firstName(member.name)}. Eu respondo somente com base nas descrições de cursos e aulas autorizadas pela TIME. Se a base não sustentar a resposta, eu vou dizer isso claramente.`;
  const [messages, setMessages] = useState<TutorMessage[]>([{ id: "welcome", role: "assistant", text: welcome, grounded: true }]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const describedLessons = courses.reduce((total, course) => total + course.lessons.filter((lesson) => lesson.description.trim()).length, 0);

  async function askTutor(value?: string) {
    const clean = (value ?? question).trim();
    if (!clean || sending) return;
    const id = `${Date.now()}-${Math.random()}`;
    setMessages((current) => [...current, { id, role: "user", text: clean }]);
    setQuestion("");
    setSending(true);
    try {
      const response = await fetch("/api/tutor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: clean }) });
      const data = (await response.json()) as { answer?: string; citations?: TutorCitation[]; grounded?: boolean; error?: string };
      if (!response.ok || !data.answer) throw new Error(data.error ?? "Não foi possível responder agora.");
      setMessages((current) => [...current, { id: `${id}-answer`, role: "assistant", text: data.answer!, citations: data.citations, grounded: data.grounded }]);
    } catch (requestError) {
      setMessages((current) => [...current, { id: `${id}-error`, role: "assistant", text: requestError instanceof Error ? requestError.message : "Não foi possível responder agora.", grounded: false }]);
    } finally {
      setSending(false);
    }
  }

  const suggestions = courses.slice(0, 3).map((course) => `O que posso aplicar do curso ${course.title}?`);
  if (!suggestions.length) suggestions.push("Quais conteúdos autorizados estão disponíveis para consulta?");

  return (
    <>
      <PageHeading kicker="TUTOR TIME IA" title="Conhecimento com fonte, não improviso." description="Pergunte sobre os conteúdos autorizados e receba uma ação prática para as próximas 24 horas." aside={<div className="tutor-status"><i />Base autorizada</div>} />
      <div className="tutor-layout">
        <section className="tutor-chat-card">
          <header><div className="tutor-avatar">✦</div><div><strong>Tutor TIME</strong><span>Grounding, citações e limite de conhecimento</span></div><button aria-label="Nova conversa" onClick={() => setMessages([{ id: "welcome", role: "assistant", text: welcome, grounded: true }])}>↻</button></header>
          <div className="tutor-messages" aria-live="polite">
            {messages.map((message) => <article className={`tutor-message ${message.role}`} key={message.id}>{message.role === "assistant" ? <span>✦</span> : null}<div><p>{message.text}</p>{message.citations?.length ? <footer>{message.citations.map((citation, index) => <span title={citation.excerpt} key={citation.id}>▧ Fonte {index + 1}: {citation.course} · {citation.title}</span>)}</footer> : message.role === "assistant" && message.grounded === false ? <footer><span>Sem fonte suficiente</span></footer> : null}</div></article>)}
            {sending ? <div className="tutor-typing"><i /><i /><i />Consultando a base autorizada</div> : null}
          </div>
          <div className="tutor-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void askTutor(suggestion)}>{suggestion}</button>)}</div>
          <form className="tutor-composer" onSubmit={(event) => { event.preventDefault(); void askTutor(); }}><textarea maxLength={1600} aria-label="Pergunte ao Tutor TIME" placeholder="Pergunte citando uma aula, curso ou desafio..." value={question} onChange={(event) => setQuestion(event.target.value)} /><div><span>Somente conteúdos autorizados · sem conhecimento externo</span><button disabled={!question.trim() || sending}>{sending ? "Consultando…" : "Enviar ↗"}</button></div></form>
        </section>
        <aside className="tutor-context-rail">
          <section><span>BASE DISPONÍVEL</span><h3>{courses.length} {courses.length === 1 ? "curso publicado" : "cursos publicados"}</h3><p>{describedLessons} {describedLessons === 1 ? "aula com descrição autorizada" : "aulas com descrição autorizada"}</p></section>
          <section><span>COMPROMISSOS DO TUTOR</span><ul><li>Citar o material utilizado</li><li>Reconhecer quando a base não basta</li><li>Finalizar com uma ação para 24 horas</li></ul></section>
          <section className="tutor-insight-card"><b>QUALIDADE DA BASE</b><p>Quanto mais completas forem as descrições ou transcrições das aulas, mais útil e específica será a resposta.</p></section>
        </aside>
      </div>
    </>
  );
}

function AgendaSection({ member, events, loading, error, onCommunity, reload }: { member: Member; events: TimeEvent[]; loading: boolean; error: string; onCommunity: () => void; reload: () => Promise<void> }) {
  const [now] = useState(() => Date.now());
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [registrationEvent, setRegistrationEvent] = useState<TimeEvent | null>(null);
  const [presenceConfirmed, setPresenceConfirmed] = useState(false);
  const [registrationData, setRegistrationData] = useState({ phone: "", company: "" });
  const [guestEvent, setGuestEvent] = useState<TimeEvent | null>(null);
  const [guestData, setGuestData] = useState({ name: "", email: "", phone: "" });
  const [destructiveAction, setDestructiveAction] = useState<
    | { kind: "cancel-registration"; event: TimeEvent }
    | { kind: "remove-guest"; event: TimeEvent; guest: TimeEvent["guests"][number] }
    | null
  >(null);
  const upcoming = events.filter((event) => Date.parse(event.startsAt) > now && event.status === "published");
  const past = events.filter((event) => Date.parse(event.startsAt) <= now || event.status === "completed");
  const visible = filter === "upcoming" ? upcoming : filter === "past" ? past : events;

  async function updateRegistration(event: TimeEvent, action: "register" | "cancel") {
    setActionId(event.id);
    setActionError("");
    setActionNotice("");
    try {
      const response = await fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId: event.id, action, ...(action === "register" ? { registration: { ...registrationData, confirmed: presenceConfirmed } } : {}) }) });
      const payload = (await response.json()) as { registered?: boolean; error?: string; registration?: { phone: string; company: string } };
      if (!response.ok || typeof payload.registered !== "boolean") throw new Error(payload.error ?? "Não foi possível atualizar sua inscrição.");
      await reload();
      if (action === "register") setRegistrationEvent(null);
      setActionNotice(action === "register" ? "Inscrição confirmada com sucesso." : "Inscrição cancelada com sucesso.");
      return true;
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Não foi possível atualizar sua inscrição.");
      return false;
    } finally {
      setActionId(null);
    }
  }

  async function updateGuest(event: TimeEvent, action: "add-guest" | "remove-guest", attendeeId?: number) {
    setActionId(event.id); setActionError(""); setActionNotice("");
    try {
      const response = await fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId: event.id, action, ...(action === "add-guest" ? { guest: guestData } : { attendeeId }) }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível atualizar o convidado.");
      setGuestData({ name: "", email: "", phone: "" }); await reload();
      if (action === "add-guest") setGuestEvent(null);
      setActionNotice(action === "add-guest" ? "Convidado adicionado com sucesso." : "Convidado removido com sucesso.");
      return true;
    } catch (requestError) { setActionError(requestError instanceof Error ? requestError.message : "Não foi possível atualizar o convidado."); return false; }
    finally { setActionId(null); }
  }

  return <>
    <PageHeading kicker="EVENTOS TIME" title="Presença que vira conexão." description="Agenda, inscrições e histórico em uma experiência pensada para encontros empresariais." aside={<div className="course-total"><strong>{upcoming.length}</strong><span>{upcoming.length === 1 ? "próximo encontro" : "próximos encontros"}</span></div>} />
    <div className="reference-event-filters" role="tablist" aria-label="Filtrar eventos"><button className={filter === "upcoming" ? "active" : ""} onClick={() => setFilter("upcoming")}>Próximos <span>{upcoming.length}</span></button><button className={filter === "past" ? "active" : ""} onClick={() => setFilter("past")}>Anteriores <span>{past.length}</span></button><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos <span>{events.length}</span></button></div>
    {error ? <div className="real-inline-error" role="alert">{error}<button onClick={() => void reload()}>Tentar novamente</button></div> : null}
    {actionError ? <div className="real-inline-error" role="alert">{actionError}</div> : null}
    {actionNotice ? <div className="onboarding-message" role="status">✓ {actionNotice}</div> : null}
    {loading ? <LoadingCards /> : visible.length ? <div className="reference-events-list">{visible.map((event) => {
      const date = eventDateParts(event.startsAt);
      const isPast = Date.parse(event.startsAt) <= now || event.status === "completed";
      const coverUrl = eventCoverUrl(event);
      return <article className={isPast ? "past" : "upcoming"} key={event.id}>
        {coverUrl ? <img className="reference-event-cover" src={coverUrl} alt={`Capa oficial do evento ${event.title}`} /> : null}
        <div className="reference-event-date"><strong>{date.day}</strong><span>{date.month}</span></div>
        <div className="reference-event-body"><div><span>{eventAvailabilityLabel(event)}</span>{event.registered ? <b>✓ Você está na lista</b> : null}</div><h2>{event.title}</h2><p>{event.description || "A equipe TIME ainda não adicionou uma descrição para este evento."}</p><footer><span>◷ {date.full} · {date.time}</span>{event.locationName || event.city ? <span>⌖ {[event.locationName, event.city].filter(Boolean).join(" · ")}</span> : null}<span>◎ {event.remainingSpots === null ? `${event.participantCount} participantes` : event.remainingSpots === 0 ? "Sem vagas" : `${event.remainingSpots} vagas restantes`}</span></footer>{event.guests.length ? <div className="member-event-guests"><strong>Seus convidados</strong>{event.guests.map((guest) => <span key={guest.id}>{guest.name}<button disabled={actionId === event.id} onClick={() => { setActionError(""); setDestructiveAction({ kind: "remove-guest", event, guest }); }}>Remover</button></span>)}</div> : null}</div>
        <div className="reference-event-actions">{!isPast && event.availability !== "cancelled" ? <>{event.registered ? <button className="secondary" disabled={actionId === event.id} onClick={() => { setActionError(""); setDestructiveAction({ kind: "cancel-registration", event }); }}>{actionId === event.id ? "Atualizando…" : "Cancelar inscrição"}</button> : <button className="primary" disabled={actionId === event.id || !["open", "last_spots"].includes(event.availability)} onClick={() => { setPresenceConfirmed(false); setRegistrationData({ phone: event.registration?.phone ?? "", company: event.registration?.company ?? "" }); setRegistrationEvent(event); }}>{event.availability === "sold_out" ? "Evento lotado" : event.availability === "registration_closed" ? "Inscrições encerradas" : "Quero participar"}</button>}{event.registered && event.allowGuests && event.guests.length < event.maxGuestsPerMember && ["open", "last_spots"].includes(event.availability) ? <button className="secondary" onClick={() => setGuestEvent(event)}>Adicionar convidado</button> : null}<a href={calendarUrl(event)} target="_blank" rel="noreferrer">Adicionar à agenda</a></> : <button className="secondary" onClick={onCommunity}>Ver conversas da comunidade</button>}</div>
      </article>;
    })}</div> : <EmptyState icon="□" title={filter === "upcoming" ? "Nenhum próximo evento publicado" : "Nenhum evento neste período"} text="Não exibimos datas, vagas ou convidados sem uma fonte cadastrada pela equipe TIME." action={<button onClick={onCommunity}>Acompanhar avisos na comunidade</button>} />}
    {registrationEvent ? <div className="event-registration-backdrop" role="presentation">
      <section className="event-registration-modal" role="dialog" aria-modal="true" aria-labelledby="event-registration-title">
        <button className="event-registration-close" type="button" aria-label="Fechar formulário de inscrição" onClick={() => setRegistrationEvent(null)}>×</button>
        {eventCoverUrl(registrationEvent) ? <img src={eventCoverUrl(registrationEvent)} alt={`Capa oficial do evento ${registrationEvent.title}`} /> : null}
        <div className="event-registration-content">
          <span>INSCRIÇÃO PARA MEMBROS</span>
          <h2 id="event-registration-title">{registrationEvent.title}</h2>
          <p>{registrationEvent.description}</p>
          <dl><div><dt>Data e horário</dt><dd>{eventDateParts(registrationEvent.startsAt).full} · {eventDateParts(registrationEvent.startsAt).time}</dd></div><div><dt>Local</dt><dd>{[registrationEvent.locationName, registrationEvent.city].filter(Boolean).join(" · ")}</dd></div></dl>
          <form onSubmit={(formEvent) => { formEvent.preventDefault(); if (presenceConfirmed) void updateRegistration(registrationEvent, "register"); }}>
            <fieldset className="event-registration-fields"><legend>Dados do participante</legend><p>Usaremos estes dados exclusivamente para a organização e o check-in do evento.</p><label>Nome completo<input value={member.name} readOnly aria-readonly="true" /></label><label>E-mail<input value={member.email} readOnly aria-readonly="true" /></label><label>WhatsApp <em>obrigatório</em><input type="tel" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={registrationData.phone} onChange={(inputEvent) => setRegistrationData((current) => ({ ...current, phone: inputEvent.target.value }))} required /></label><label>Empresa <em>opcional</em><input autoComplete="organization" placeholder="Nome da empresa" value={registrationData.company} onChange={(inputEvent) => setRegistrationData((current) => ({ ...current, company: inputEvent.target.value }))} /></label></fieldset>
            <label className="event-presence-confirmation"><input type="checkbox" checked={presenceConfirmed} onChange={(inputEvent) => setPresenceConfirmed(inputEvent.target.checked)} required /> Confirmo minha presença e entendo que esta inscrição será usada pela TIME para organizar o evento.</label>
            <div><button type="button" className="secondary" onClick={() => setRegistrationEvent(null)}>Voltar</button><button className="primary" disabled={!presenceConfirmed || actionId === registrationEvent.id}>{actionId === registrationEvent.id ? "Confirmando…" : "Confirmar inscrição"}</button></div>
          </form>
        </div>
      </section>
    </div> : null}
    {guestEvent ? <div className="event-registration-backdrop" role="presentation"><section className="event-registration-modal compact" role="dialog" aria-modal="true" aria-labelledby="guest-registration-title"><button className="event-registration-close" type="button" aria-label="Fechar formulário de convidado" onClick={() => setGuestEvent(null)}>×</button><div className="event-registration-content"><span>CONVIDADO</span><h2 id="guest-registration-title">Adicionar convidado</h2><p>{guestEvent.title} · limite de {guestEvent.maxGuestsPerMember} por membro.</p><form onSubmit={(formEvent) => { formEvent.preventDefault(); void updateGuest(guestEvent, "add-guest"); }}><fieldset className="event-registration-fields"><legend>Dados essenciais</legend><label>Nome completo<input required minLength={3} maxLength={160} value={guestData.name} onChange={(event) => setGuestData({ ...guestData, name: event.target.value })} /></label><label>E-mail<input type="email" maxLength={180} value={guestData.email} onChange={(event) => setGuestData({ ...guestData, email: event.target.value })} /></label><label>WhatsApp<input type="tel" maxLength={32} value={guestData.phone} onChange={(event) => setGuestData({ ...guestData, phone: event.target.value })} /></label><small>Informe ao menos e-mail ou WhatsApp para evitar duplicidade.</small></fieldset><div><button type="button" className="secondary" onClick={() => setGuestEvent(null)}>Voltar</button><button className="primary" disabled={actionId === guestEvent.id || (!guestData.email.trim() && !guestData.phone.trim())}>{actionId === guestEvent.id ? "Salvando…" : "Adicionar convidado"}</button></div></form></div></section></div> : null}
    {destructiveAction ? <div className="event-registration-backdrop" role="presentation"><section className="event-registration-modal compact" role="dialog" aria-modal="true" aria-labelledby="event-destructive-title"><button className="event-registration-close" type="button" aria-label="Fechar confirmação" disabled={actionId === destructiveAction.event.id} onClick={() => setDestructiveAction(null)}>×</button><div className="event-registration-content"><span>CONFIRMAÇÃO NECESSÁRIA</span><h2 id="event-destructive-title">{destructiveAction.kind === "cancel-registration" ? "Cancelar sua inscrição?" : `Remover ${destructiveAction.guest.name}?`}</h2><p>{destructiveAction.kind === "cancel-registration" ? `Você e seus convidados serão retirados da lista de ${destructiveAction.event.title}.` : `O convidado será removido da lista de ${destructiveAction.event.title}.`}</p>{actionError ? <div className="real-inline-error" role="alert">{actionError}</div> : null}<div><button type="button" className="secondary" disabled={actionId === destructiveAction.event.id} onClick={() => setDestructiveAction(null)}>Manter como está</button><button type="button" className="primary" disabled={actionId === destructiveAction.event.id} onClick={() => void (async () => { const succeeded = destructiveAction.kind === "cancel-registration" ? await updateRegistration(destructiveAction.event, "cancel") : await updateGuest(destructiveAction.event, "remove-guest", destructiveAction.guest.id); if (succeeded) setDestructiveAction(null); })()}>{actionId === destructiveAction.event.id ? "Atualizando…" : destructiveAction.kind === "cancel-registration" ? "Sim, cancelar inscrição" : "Sim, remover convidado"}</button></div></div></section></div> : null}
  </>;
}

function AchievementsSection({ courses }: { courses: Course[] }) {
  const completed = courses.reduce((total, course) => total + course.completedLessons, 0);
  const completedCourse = courses.some((course) => course.lessonCount > 0 && course.progressPercent === 100);
  const xp = completed * 100;
  const badges = [
    ["▶", "Primeiro movimento", "Concluir a primeira aula", completed >= 1],
    ["✓", "Ritmo de execução", "Concluir 5 aulas", completed >= 5],
    ["◇", "Jornada completa", "Concluir um curso", completedCourse],
  ] as const;
  return <><PageHeading kicker="GAMIFICAÇÃO TRANSPARENTE" title="Conquistas" description="Regras simples, baseadas apenas em progresso real." aside={<div className="xp-summary"><div><strong>{xp} XP</strong><span>100 XP por aula concluída</span></div><small>{completed} {completed === 1 ? "aula registrada" : "aulas registradas"}</small></div>} /><section className="real-gamification-rules"><span>REGRA ATUAL</span><p>O sistema concede 100 XP por aula concluída. Não há bônus ocultos, ranking fictício ou metas inventadas.</p></section><div className="badge-grid real-badge-grid">{badges.map(([icon, title, text, unlocked]) => <article className={unlocked ? "unlocked" : "locked"} key={title}><span>{unlocked ? "DESBLOQUEADA" : "EM PROGRESSO"}</span><b>{icon}</b><h3>{title}</h3><p>{text}</p></article>)}</div></>;
}

function autoplayEmbedUrl(value: string) {
  const embed = getEmbedVideoUrl(value);
  if (!embed) return "";
  const url = new URL(embed);
  url.searchParams.set("autoplay", "1");
  return url.toString();
}

function CourseModal({ course, onClose, onRefresh }: { course: Course; onClose: () => void; onRefresh: () => Promise<void> }) {
  const initialLesson = [...course.lessons]
    .filter((item) => !item.progress?.completed)
    .sort((left, right) => Date.parse(right.progress?.updatedAt ?? "") - Date.parse(left.progress?.updatedAt ?? ""))[0]
    ?? course.lessons[0]
    ?? null;
  const [lessonId, setLessonId] = useState(initialLesson?.id ?? null);
  const watchSecondsRef = useRef(initialLesson?.progress?.watchSeconds ?? 0);
  const [playerStarted, setPlayerStarted] = useState(Boolean(initialLesson?.progress?.startedAt || initialLesson?.progress?.completed || initialLesson?.progress?.watchSeconds));
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [activeTab, setActiveTab] = useState<"lesson" | "materials" | "notes" | "comments">("lesson");
  const [theaterMode, setTheaterMode] = useState(false);
  const [note, setNote] = useState("");
  const [noteNotice, setNoteNotice] = useState("");
  const [noteError, setNoteError] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const [noteLoadedFor, setNoteLoadedFor] = useState<number | null>(null);
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [reviews, setReviews] = useState<LessonReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const lesson = course.lessons.find((item) => item.id === lessonId) ?? null;
  const currentLessonIndex = lesson ? course.lessons.findIndex((item) => item.id === lesson.id) : -1;
  const previousLesson = currentLessonIndex > 0 ? course.lessons[currentLessonIndex - 1] ?? null : null;
  const nextLesson = currentLessonIndex >= 0 ? course.lessons[currentLessonIndex + 1] ?? null : null;
  const modules = useMemo(() => {
    if (course.modules?.length) return course.modules;
    return course.lessons.reduce<CourseModule[]>((groups, item) => {
      const title = item.moduleTitle || "Conteúdo principal";
      const group = groups.find((current) => current.title === title);
      if (group) group.lessons.push(item);
      else groups.push({ id: `legacy-${title}`, title, description: "", position: groups.length, lessons: [item] });
      return groups;
    }, []);
  }, [course.lessons, course.modules]);

  const loadExperience = useCallback(async (targetLessonId: number) => {
    setReviewsLoading(true);
    setReviewError("");
    try {
      const response = await fetch(`/api/lesson-experience?lessonId=${targetLessonId}`, { cache: "no-store" });
      const payload = (await response.json()) as { materials?: LessonMaterial[]; reviews?: LessonReview[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os recursos da aula.");
      const loaded = payload.reviews ?? [];
      setMaterials(payload.materials ?? []);
      setReviews(loaded);
      const own = loaded.find((review) => review.own);
      setRating(own?.rating ?? 0);
      setComment(own?.comment ?? "");
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Não foi possível carregar os recursos da aula.");
    } finally {
      setReviewsLoading(false);
    }
  }, [setComment, setMaterials, setRating, setReviewError, setReviews, setReviewsLoading]);

  useEffect(() => {
    if (!lessonId) return;
    const timer = window.setTimeout(() => { void loadExperience(lessonId); }, 0);
    return () => window.clearTimeout(timer);
  }, [lessonId, loadExperience]);

  useEffect(() => {
    if (!lessonId) return;
    let active = true;
    void fetch(`/api/lesson-notes?lessonId=${lessonId}`, { cache: "no-store" }).then(async (response) => {
      const payload = (await response.json()) as { note?: { content?: string }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar sua anotação.");
      if (active) {
        const content = payload.note?.content ?? "";
        setNote(content);
        setSavedNote(content);
        setNoteLoadedFor(lessonId);
      }
    }).catch((error) => { if (active) setNoteError(error instanceof Error ? error.message : "Não foi possível carregar sua anotação."); });
    return () => { active = false; };
  }, [lessonId]);

  async function saveProgress(completed: boolean, started = false) {
    if (!lesson) return;
    setSavingProgress(true);
    setProgressError("");
    try {
      const response = await fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId: lesson.id, watchSeconds: watchSecondsRef.current, completed, started }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar o progresso.");
      await onRefresh();
    } catch (requestError) {
      setProgressError(requestError instanceof Error ? requestError.message : "Não foi possível salvar o progresso.");
    } finally {
      setSavingProgress(false);
    }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingReview(true);
    setReviewError("");
    setReviewNotice("");
    try {
      if (!lesson) throw new Error("Selecione uma aula para avaliar.");
      const response = await fetch("/api/lesson-experience", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId: lesson.id, rating, comment }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível avaliar.");
      setReviewNotice("Avaliação registrada.");
      await loadExperience(lesson.id);
      await onRefresh();
    } catch (requestError) {
      setReviewError(requestError instanceof Error ? requestError.message : "Não foi possível avaliar.");
    } finally {
      setSavingReview(false);
    }
  }

  const persistNote = useCallback(async (targetLessonId: number, content: string, quiet = false) => {
    setSavingNote(true);
    setNoteError("");
    setNoteNotice("");
    try {
      const response = await fetch("/api/lesson-notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId: targetLessonId, content }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar sua anotação.");
      setSavedNote(content);
      setNoteNotice(quiet ? "Salvo automaticamente." : "Anotação salva na sua conta.");
      return true;
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Não foi possível salvar sua anotação.");
      return false;
    } finally {
      setSavingNote(false);
    }
  }, [setNoteError, setNoteNotice, setSavedNote, setSavingNote]);

  useEffect(() => {
    if (!lessonId || noteLoadedFor !== lessonId || note === savedNote) return;
    const timer = window.setTimeout(() => { void persistNote(lessonId, note, true); }, 1_200);
    return () => window.clearTimeout(timer);
  }, [lessonId, note, noteLoadedFor, persistNote, savedNote]);

  async function selectLesson(target: Lesson) {
    if (lesson && noteLoadedFor === lesson.id && note !== savedNote) {
      const saved = await persistNote(lesson.id, note, true);
      if (!saved) return;
    }
    setNoteLoadedFor(null);
    setNoteError("");
    setNoteNotice("");
    setMaterials([]);
    setReviews([]);
    setReviewsLoading(true);
    setLessonId(target.id);
    watchSecondsRef.current = target.progress?.watchSeconds ?? 0;
    setPlayerStarted(Boolean(target.progress?.startedAt || target.progress?.completed || target.progress?.watchSeconds));
    setActiveTab("lesson");
  }

  async function closeCourse() {
    if (lesson && noteLoadedFor === lesson.id && note !== savedNote) {
      const saved = await persistNote(lesson.id, note);
      if (!saved) return;
    }
    onClose();
  }

  function startPlayer() {
    setPlayerStarted(true);
    void saveProgress(false, true);
  }

  return (
    <div className="lesson-modal real-course-modal course-player-modal" role="dialog" aria-modal="true" aria-label={course.title}>
      <button className="lesson-modal-backdrop" aria-label="Fechar curso" onClick={() => void closeCourse()} />
      <div className="lesson-player course-player-shell">
        <header className="course-player-header"><div><span>CURSOS / {course.category || "CURSO TIME"}</span><strong>{course.title}</strong></div><button aria-label="Voltar para a biblioteca" onClick={() => void closeCourse()}>×</button></header>
        <div className={`real-course-viewer${theaterMode ? " theater-mode" : ""}`}>
          <aside className="course-player-outline"><header className="course-outline-heading"><div><span>CONTEÚDO DO CURSO</span><strong>{course.progressPercent}% concluído</strong></div><i style={{ "--lesson-progress": `${course.progressPercent}%` } as React.CSSProperties} /></header>{modules.length ? modules.map((module, moduleIndex) => <section className="course-module-group" key={module.id}><header><b>{String(moduleIndex + 1).padStart(2, "0")}</b><div><strong>{module.title}</strong><small>{module.lessons.length} {module.lessons.length === 1 ? "aula" : "aulas"}</small></div></header>{module.description ? <p>{module.description}</p> : null}{module.lessons.length ? module.lessons.map((item, lessonIndex) => <button className={item.id === lessonId ? "active" : ""} aria-current={item.id === lessonId ? "step" : undefined} key={item.id} onClick={() => void selectLesson(item)}><b>{item.progress?.completed ? "✓" : item.progress?.startedAt ? "▶" : `${moduleIndex + 1}.${lessonIndex + 1}`}</b><div><strong>{item.title}</strong><small>{formatDuration(item.durationSeconds)}{item.videoUrl ? item.progress?.startedAt ? " · Em andamento" : " · Vídeo" : " · Em breve"}</small></div></button>) : <p className="course-module-empty">A equipe TIME adicionará as aulas deste módulo.</p>}</section>) : <p>Nenhum módulo publicado neste curso.</p>}</aside>
          <main className="course-player-stage">
            <section className="course-learning-overview"><span>AGORA ASSISTINDO</span><p>{modules.length} {modules.length === 1 ? "módulo" : "módulos"} · {course.lessonCount} {course.lessonCount === 1 ? "aula" : "aulas"} · {course.progressPercent}% concluído</p><button className="course-theater-toggle" type="button" aria-pressed={theaterMode} onClick={() => setTheaterMode((current) => !current)}>{theaterMode ? "Sair do modo teatro" : "Modo teatro"}</button></section>
            <nav className="reference-lesson-tabs" aria-label="Áreas da aula"><button className={activeTab === "lesson" ? "active" : ""} onClick={() => setActiveTab("lesson")}>▶ Aula</button><button className={activeTab === "materials" ? "active" : ""} disabled={!lesson} onClick={() => setActiveTab("materials")}>↧ Materiais <span>{materials.length}</span></button><button className={activeTab === "notes" ? "active" : ""} disabled={!lesson} onClick={() => setActiveTab("notes")}>▧ Anotações</button><button className={activeTab === "comments" ? "active" : ""} disabled={!lesson} onClick={() => setActiveTab("comments")}>◯ Avaliações <span>{reviews.length}</span></button></nav>
            {lesson ? <div className="video-frame real-video-frame">{lesson.videoUrl ? getExternalVideoProvider(lesson.videoUrl) ? playerStarted ? <iframe src={autoplayEmbedUrl(lesson.videoUrl)} title={`Aula: ${lesson.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /> : <button type="button" className="lesson-start-cover" onClick={startPlayer}>{course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" /> : null}<span><b>▶</b><strong>{lesson.progress?.startedAt ? "Continuar aula" : "Iniciar aula"}</strong><small>Seu progresso começa somente após esta ação.</small></span></button> : <video controls preload="metadata" poster={course.thumbnailUrl || undefined} src={lesson.videoUrl} onPlay={() => { if (!playerStarted) startPlayer(); }} onLoadedMetadata={(event) => { if (watchSecondsRef.current > 0 && event.currentTarget.currentTime === 0) event.currentTarget.currentTime = Math.min(watchSecondsRef.current, Math.max(0, event.currentTarget.duration - 1)); }} onTimeUpdate={(event) => { watchSecondsRef.current = Math.floor(event.currentTarget.currentTime); }} onPause={() => { if (watchSecondsRef.current > (lesson.progress?.watchSeconds ?? 0)) void saveProgress(false, true); }} onEnded={() => void saveProgress(true, true)} /> : <div className="real-video-empty"><span>▶</span><strong>Vídeo ainda não adicionado</strong><p>A equipe TIME publicará o link da aula neste espaço.</p></div>}</div> : activeTab === "lesson" ? <EmptyState icon="▶" title="Curso sem aulas" text="O conteúdo será exibido assim que a equipe publicar a primeira aula." /> : null}
            {activeTab === "lesson" && lesson ? <section className="real-lesson-copy"><span>{lesson.moduleTitle}</span><h2>{lesson.title}</h2><p>{lesson.description || "A equipe TIME ainda não adicionou uma descrição para esta aula."}</p><div className="reference-lesson-actions"><button className="complete-lesson" disabled={savingProgress} onClick={() => void saveProgress(true, true)}>{savingProgress ? "Salvando…" : lesson.progress?.completed ? "Aula concluída ✓" : "Marcar como concluída"}</button>{previousLesson ? <button onClick={() => void selectLesson(previousLesson)}>← Anterior</button> : null}{nextLesson ? <button onClick={() => void selectLesson(nextLesson)}>Próxima aula →</button> : null}{progressError ? <small className="form-error">{progressError}</small> : null}</div></section> : null}
            {activeTab === "materials" && lesson ? <section className="lesson-materials"><header><div><span>MATERIAIS DA AULA</span><h2>{lesson.title}</h2></div></header>{reviewsLoading ? <p>Carregando materiais…</p> : materials.length ? <div>{materials.map((material) => <a key={material.id} href={material.url} target={material.kind === "link" ? "_blank" : undefined} rel={material.kind === "link" ? "noreferrer" : undefined}><span>{material.kind === "file" ? "↧" : "↗"}</span><div><strong>{material.title}</strong><small>{material.mimeType || (material.kind === "file" ? "Arquivo complementar" : "Link complementar")}</small></div><b>{material.kind === "file" ? "Baixar" : "Abrir"}</b></a>)}</div> : <EmptyState icon="↧" title="Nenhum material nesta aula" text="Quando a equipe adicionar arquivos ou links, eles aparecerão aqui." />}</section> : null}
            {activeTab === "notes" && lesson ? <section className="reference-lesson-notes"><header><div><span>ANOTAÇÃO PRIVADA</span><h2>{lesson.title}</h2></div><small>Salvamento automático</small></header><p>Registre decisões, ideias e próximos passos enquanto assiste. Somente você acessa este conteúdo.</p><textarea maxLength={8000} placeholder="O que você quer levar desta aula para a prática?" value={note} onChange={(event) => { setNote(event.target.value); setNoteNotice(""); }} onBlur={() => { if (noteLoadedFor === lesson.id && note !== savedNote) void persistNote(lesson.id, note, true); }} /><footer><span className={noteError ? "form-error" : ""}>{noteError || (savingNote ? "Salvando…" : noteNotice) || `${note.length}/8000`}</span><button disabled={savingNote || note === savedNote} onClick={() => void persistNote(lesson.id, note)}>{savingNote ? "Salvando…" : "Salvar agora"}</button></footer></section> : null}
            {activeTab === "comments" && lesson ? <section className="reference-course-comments"><form className="real-review-card" onSubmit={saveReview}><div><span>AVALIAÇÃO DA AULA</span><h3>Como foi esta experiência?</h3><p>A nota é simples e o comentário é opcional. Você pode atualizar depois.</p></div><div className="real-rating" aria-label="Nota de 1 a 5">{[1, 2, 3, 4, 5].map((value) => <button type="button" className={rating >= value ? "active" : ""} aria-label={`${value} estrelas`} key={value} onClick={() => setRating(value)}>★</button>)}</div><textarea maxLength={1200} placeholder="Compartilhe uma percepção útil sobre esta aula (opcional)" value={comment} onChange={(event) => setComment(event.target.value)} /><footer><span className={reviewError ? "form-error" : ""}>{reviewError || reviewNotice}</span><button disabled={!rating || savingReview}>{savingReview ? "Salvando…" : reviews.some((review) => review.own) ? "Atualizar avaliação" : "Publicar avaliação"}</button></footer></form><div className="reference-review-list">{reviewsLoading ? <p>Carregando avaliações…</p> : reviews.filter((review) => review.comment && !review.hidden).length ? reviews.filter((review) => review.comment && !review.hidden).map((review) => <article key={review.id}><div><strong>{review.authorName}</strong><span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div><p>{review.comment}</p><small>{timeAgo(review.updatedAt || review.createdAt)}</small></article>) : <EmptyState icon="◯" title="Nenhum comentário nesta aula" text="Você pode avaliar sem escrever comentário." />}</div></section> : null}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function MemberPlatform({ member, schoolStatus = "active", initialSection = "inicio", profileCompleteness = 100, profileReady = true, missingFields = [], homeConnections = [], homeConnectionsError = "", greeting = "Olá", todayLabel = "HOJE" }: { member: Member; schoolStatus?: SchoolStatus; initialSection?: Section; profileCompleteness?: number; profileReady?: boolean; missingFields?: string[]; homeConnections?: HomeConnection[]; homeConnectionsError?: string; greeting?: string; todayLabel?: string }) {
  const schoolComingSoon = schoolStatus === "coming_soon";
  const [section, setSection] = useState<Section>(initialSection);
  const [courses, setCourses] = useState<Course[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [events, setEvents] = useState<TimeEvent[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastEpisode[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(!schoolComingSoon);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [podcastsLoading, setPodcastsLoading] = useState(initialSection === "podcasts");
  const [coursesError, setCoursesError] = useState("");
  const [communityError, setCommunityError] = useState("");
  const [eventsError, setEventsError] = useState("");
  const [podcastsError, setPodcastsError] = useState("");
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [membershipPromptOpen, setMembershipPromptOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [themePreference, setThemePreference] = useState<"dark" | "light" | "system">(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("time-theme");
    return saved === "dark" || saved === "light" || saved === "system" ? saved : "light";
  });
  const [systemDark, setSystemDark] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const podcastsRequestStarted = useRef(false);

  useEffect(() => {
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const theme = themePreference === "system" ? (systemDark ? "dark" : "light") : themePreference;

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setThemePreference(next);
    window.localStorage.setItem("time-theme", next);
  }

  function useSystemTheme() {
    setThemePreference("system");
    window.localStorage.setItem("time-theme", "system");
  }

  async function installApp() {
    if (!installPrompt) {
      const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent);
      alert(isAppleMobile ? "No iPhone: abra esta página no Safari, toque em Compartilhar e escolha 'Adicionar à Tela de Início'." : "Quando o navegador permitir, use o menu dele para instalar a TIME como aplicativo.");
      return;
    }
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  const loadCourses = async () => {
    if (schoolComingSoon) {
      setCourses([]);
      setCoursesLoading(false);
      return;
    }
    setCoursesError("");
    const response = await fetch("/api/courses", { cache: "no-store" });
    const payload = (await response.json()) as { courses?: Course[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os cursos.");
    setCourses(payload.courses ?? []);
    if (activeCourse) setActiveCourse((payload.courses ?? []).find((course) => course.id === activeCourse.id) ?? null);
  };

  const loadCommunity = async () => {
    setCommunityError("");
    const response = await fetch("/api/community", { cache: "no-store" });
    const payload = (await response.json()) as { posts?: CommunityPost[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar a comunidade.");
    setPosts(payload.posts ?? []);
  };

  const loadEvents = async () => {
    setEventsError("");
    const response = await fetch("/api/events", { cache: "no-store" });
    const payload = (await response.json()) as { events?: TimeEvent[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os eventos.");
    setEvents(payload.events ?? []);
  };

  useEffect(() => {
    let active = true;
    const coursesRequest = schoolComingSoon ? Promise.resolve() : fetch("/api/courses", { cache: "no-store" }).then(async (response) => {
      const payload = (await response.json()) as { courses?: Course[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os cursos.");
      if (active) setCourses(payload.courses ?? []);
    });
    const communityRequest = !member.permissions.includes("community") ? Promise.resolve() : fetch("/api/community", { cache: "no-store" }).then(async (response) => {
      const payload = (await response.json()) as { posts?: CommunityPost[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar a comunidade.");
      if (active) setPosts(payload.posts ?? []);
    });
    const eventsRequest = !member.permissions.includes("events") ? Promise.resolve() : fetch("/api/events", { cache: "no-store" }).then(async (response) => {
      const payload = (await response.json()) as { events?: TimeEvent[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os eventos.");
      if (active) setEvents(payload.events ?? []);
    });
    void Promise.allSettled([coursesRequest, communityRequest, eventsRequest]).then((results) => {
      if (!active) return;
      if (results[0].status === "rejected") setCoursesError(results[0].reason instanceof Error ? results[0].reason.message : "Falha ao carregar cursos.");
      if (results[1].status === "rejected") setCommunityError(results[1].reason instanceof Error ? results[1].reason.message : "Falha ao carregar comunidade.");
      if (results[2].status === "rejected") setEventsError(results[2].reason instanceof Error ? results[2].reason.message : "Falha ao carregar eventos.");
      setCoursesLoading(false);
      setCommunityLoading(false);
      setEventsLoading(false);
    });
    return () => { active = false; };
  }, [member.permissions, schoolComingSoon]);

  useEffect(() => {
    if (section !== "podcasts" || podcasts.length || podcastsRequestStarted.current) return;
    let active = true;
    podcastsRequestStarted.current = true;
    void fetch("/api/podcasts", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { episodes?: PodcastEpisode[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os podcasts.");
        if (active) setPodcasts(payload.episodes ?? []);
      })
      .catch((requestError: unknown) => {
        if (active) setPodcastsError(requestError instanceof Error ? requestError.message : "Falha ao carregar podcasts.");
      })
      .finally(() => { if (active) setPodcastsLoading(false); });
    return () => { active = false; };
  }, [section, podcasts.length]);

  const sectionLabel = menu.find((item) => item.id === section)?.label ?? "Início";
  const memberInitials = useMemo(() => initials(member.name), [member.name]);
  // O bypass de demonstração/gestão depende exclusivamente do papel vindo do
  // banco. Um e-mail digitado no navegador nunca pode liberar estes recursos.
  const canUse = (resource: Member["permissions"][number]) => member.permissions.includes(resource);
  const hasRequiredProfile = member.isAdmin || profileReady;

  function openCourse(course: Course) {
    if (schoolComingSoon) return;
    if (!canUse("courses") || !hasRequiredProfile || course.locked) { setMembershipPromptOpen(true); return; }
    setActiveCourse(course);
  }

  function navigateTo(nextSection: Section) {
    if (nextSection === "podcasts" && !podcasts.length && !podcastsRequestStarted.current) setPodcastsLoading(true);
    setSection(nextSection);
    setMobileMenuOpen(false);
    if (nextSection !== "cursos") setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function manageSubscription() {
    setBillingLoading(true);
    setBillingError("");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Não foi possível abrir sua assinatura.");
      window.location.href = payload.url;
    } catch (requestError) {
      setBillingError(requestError instanceof Error ? requestError.message : "Não foi possível abrir sua assinatura.");
    } finally {
      setBillingLoading(false);
    }
  }

  return (
    <main className={`member-app real-member-app theme-${theme}`}>
      <aside className="member-sidebar">
        <a className="member-logo" href="/" aria-label="TIME Escola de Negócios"><TimeLogo variant={theme === "light" ? "blue" : "white"} priority /></a>
        <nav aria-label="Navegação da área de membros">{menu.slice(0, 2).map((item) => <button className={section === item.id ? "active" : ""} key={item.id} onClick={() => navigateTo(item.id)} aria-current={section === item.id ? "page" : undefined}><span>{item.icon}</span>{item.label}</button>)}<a className="member-sidebar-link" href="/app/conexoes"><span>⌘</span>Conexões</a>{menu.slice(2).map((item) => <button className={section === item.id ? "active" : ""} key={item.id} onClick={() => navigateTo(item.id)} aria-current={section === item.id ? "page" : undefined}><span>{item.icon}</span>{item.label}</button>)}<a className="member-sidebar-link" href="/app/beneficios"><span>◇</span>Benefícios</a><a className="member-sidebar-link" href="/app/ouvidoria"><span>○</span>Ouvidoria</a></nav>
        <div className="member-sidebar-bottom">
          <button disabled={billingLoading} onClick={() => void manageSubscription()}><span>↻</span>{billingLoading ? "Abrindo…" : "Minha assinatura"}</button>
          <button onClick={toggleTheme}><span>{theme === "dark" ? "☼" : "◐"}</span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</button>
          <button onClick={() => void installApp()}><span>⌄</span>Baixar app</button>
          {member.isAdmin ? <a href="/admin"><span>⚙</span>Painel admin</a> : null}
          <a href="/auth/signout"><span>↗</span>Sair</a>
          {billingError ? <small className="member-billing-error">{billingError}</small> : null}
          <div className="member-profile"><span>{memberInitials}</span><div><strong>{member.name}</strong><small>{member.email}</small></div></div>
        </div>
      </aside>

      <section className="member-main">
        <header className="member-topbar">
          <div className="mobile-member-logo"><TimeLogo variant={theme === "light" ? "blue" : "white"} /></div>
          <div className="member-search"><span>⌕</span><input aria-label="Buscar cursos" placeholder="Buscar cursos..." value={search} onChange={(event) => { setSearch(event.target.value); if (event.target.value) setSection("cursos"); }} /><kbd>TIME</kbd></div>
          <div className="member-top-actions"><button className="theme-toggle" aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} onClick={toggleTheme}>{theme === "dark" ? "☼" : "◐"}</button><button className="notification-button" aria-label="Notificações" onClick={() => setNotificationsOpen((current) => !current)}>♢</button><span className="top-profile">{memberInitials}</span></div>
          {notificationsOpen ? <div className="notification-popover"><header><strong>Notificações</strong><button onClick={() => setNotificationsOpen(false)}>×</button></header><div className="real-notification-empty"><span>✓</span><p><strong>Tudo em dia</strong>Nenhuma notificação nova.</p></div></div> : null}
        </header>
        <div className="member-content" data-section={sectionLabel}>
          {section === "inicio" ? <HomeSection member={member} courses={courses} schoolComingSoon={schoolComingSoon} posts={posts} events={events} connections={homeConnections} profileCompleteness={profileCompleteness} profileReady={profileReady} missingFields={missingFields} greeting={greeting} todayLabel={todayLabel} loading={{ courses: coursesLoading, community: communityLoading, events: eventsLoading }} errors={{ courses: coursesError, community: communityError, events: eventsError, connections: homeConnectionsError }} onOpenCourse={openCourse} onNavigate={navigateTo} /> : null}
          {section === "cursos" ? !canUse("courses") ? <><PageHeading kicker="ESCOLA TIME" title="Conteúdo que transforma conhecimento em resultado." description="A Escola TIME é exclusiva para membros ativos e cortesias válidas." /><MembershipGate area="a Escola TIME" /></> : schoolComingSoon ? <SchoolComingSoon /> : <><CoursesSection courses={courses} loading={coursesLoading} error={coursesError} search={search} onOpen={openCourse} />{!hasRequiredProfile ? <ProfileGate completeness={profileCompleteness} missingFields={missingFields} area="os cursos" /> : null}</> : null}
          {section === "podcasts" ? <PodcastsSection episodes={podcasts} loading={podcastsLoading} error={podcastsError} canListen={canUse("podcasts")} /> : null}
          {section === "tutor" ? !canUse("courses") ? <><PageHeading kicker="TUTOR TIME IA" title="Conhecimento com fonte, não improviso." description="O Tutor TIME é exclusivo para membros ativos." /><MembershipGate area="o Tutor TIME" /></> : <TutorSection courses={courses} member={member} /> : null}
          {section === "comunidade" ? !canUse("community") ? <><PageHeading kicker="TIME COMMUNITY" title="Comunidade TIME" description="Conheça o ambiente e torne-se membro para participar." /><MembershipGate area="a comunidade" /></> : !hasRequiredProfile ? <><PageHeading kicker="TIME COMMUNITY" title="Comunidade TIME" description="Complete os campos essenciais do perfil para participar." /><ProfileGate completeness={profileCompleteness} missingFields={missingFields} area="a comunidade" /></> : <CommunitySection member={member} posts={posts} setPosts={setPosts} loading={communityLoading} error={communityError} reload={async () => { setCommunityLoading(true); try { await loadCommunity(); } catch (requestError) { setCommunityError(requestError instanceof Error ? requestError.message : "Falha ao carregar."); } finally { setCommunityLoading(false); } }} /> : null}
          {section === "agenda" ? !canUse("events") ? <><PageHeading kicker="EVENTOS TIME" title="Presença que vira conexão." description="A agenda completa e as inscrições são exclusivas para membros." /><MembershipGate area="os eventos e inscrições" /></> : <AgendaSection member={member} events={events} loading={eventsLoading} error={eventsError} onCommunity={() => navigateTo("comunidade")} reload={async () => { setEventsLoading(true); try { await loadEvents(); } catch (requestError) { setEventsError(requestError instanceof Error ? requestError.message : "Falha ao carregar eventos."); } finally { setEventsLoading(false); } }} /> : null}
          {section === "conquistas" ? <AchievementsSection courses={courses} /> : null}
        </div>
      </section>

      {mobileMenuOpen ? <div className="mobile-more-menu" role="dialog" aria-modal="true" aria-label="Mais opções"><button className="mobile-more-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} /><section><header><div><span>{memberInitials}</span><div><strong>{member.name}</strong><small>{member.email}</small></div></div><button aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)}>×</button></header><nav aria-label="Mais áreas da plataforma">{menu.slice(2).filter((item) => item.id !== "comunidade" && item.id !== "agenda").map((item) => <button className={section === item.id ? "active" : ""} key={item.id} onClick={() => navigateTo(item.id)}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.id === "conquistas" ? "Seu progresso e conquistas" : "Ajuda baseada no conteúdo publicado"}</small></div><b>→</b></button>)}<a href="/app/beneficios"><span>◇</span><div><strong>Clube de Benefícios</strong><small>Vantagens do ecossistema TIME</small></div><b>→</b></a><a href="/app/ouvidoria"><span>○</span><div><strong>Ouvidoria</strong><small>Canal privado com a equipe TIME</small></div><b>→</b></a><button onClick={toggleTheme}><span>{theme === "dark" ? "☼" : "◐"}</span><div><strong>{theme === "dark" ? "Modo claro" : "Modo escuro"}</strong><small>Preferência salva neste aparelho</small></div><b>→</b></button><button onClick={useSystemTheme}><span>◌</span><div><strong>Usar tema do sistema</strong><small>{themePreference === "system" ? "Ativado neste aparelho" : "Acompanhar a aparência do dispositivo"}</small></div><b>→</b></button><button onClick={() => void installApp()}><span>⌄</span><div><strong>Baixar app</strong><small>Adicionar à tela inicial</small></div><b>→</b></button><button disabled={billingLoading} onClick={() => void manageSubscription()}><span>↻</span><div><strong>{billingLoading ? "Abrindo…" : "Minha assinatura"}</strong><small>Plano, pagamento e recorrência</small></div><b>→</b></button>{member.isAdmin ? <a href="/admin"><span>⚙</span><div><strong>Painel administrativo</strong><small>Gerenciar a plataforma</small></div><b>→</b></a> : null}<a href="/auth/signout"><span>↗</span><div><strong>Sair da conta</strong><small>Encerrar sessão com segurança</small></div><b>→</b></a></nav>{billingError ? <small className="member-billing-error">{billingError}</small> : null}</section></div> : null}

      <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
        {mobileMenu.map((item) => <button className={section === item.id ? "active" : ""} key={item.id} onClick={() => navigateTo(item.id)} aria-current={section === item.id ? "page" : undefined}><span>{item.icon}</span>{item.id === "cursos" ? "Cursos" : item.label}</button>)}
        <a className="mobile-bottom-nav-link" href="/app/conexoes" aria-label="Abrir conexões"><span>⌘</span>Conexões</a>
        <button className={section === "comunidade" ? "active" : ""} onClick={() => navigateTo("comunidade")} aria-current={section === "comunidade" ? "page" : undefined}><span>◉</span>Comunidade</button>
        <button className={section === "agenda" ? "active" : ""} onClick={() => navigateTo("agenda")} aria-current={section === "agenda" ? "page" : undefined}><span>□</span>Eventos</button>
        <button className={section === "conquistas" || mobileMenuOpen ? "active" : ""} onClick={() => setMobileMenuOpen(true)} aria-expanded={mobileMenuOpen}><span>•••</span>Mais</button>
      </nav>

      {activeCourse && !schoolComingSoon ? <CourseModal course={activeCourse} onClose={() => setActiveCourse(null)} onRefresh={async () => { try { await loadCourses(); } catch (requestError) { setCoursesError(requestError instanceof Error ? requestError.message : "Não foi possível atualizar."); } }} /> : null}
      {membershipPromptOpen ? <div className="membership-prompt" role="dialog" aria-modal="true" aria-label="Acesso exclusivo"><button className="lesson-modal-backdrop" aria-label="Fechar" onClick={() => setMembershipPromptOpen(false)} /><section><button aria-label="Fechar" onClick={() => setMembershipPromptOpen(false)}>×</button><span>EXCLUSIVO PARA MEMBROS</span><h2>Ative sua participação na TIME</h2><p>Seu cadastro está pronto. Ao tornar-se membro, você libera cursos, networking, comunidade e eventos empresariais.</p><a href="/checkout">Ver formas de participação →</a></section></div> : null}
    </main>
  );
}
