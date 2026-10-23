import { LandingMotion, LandingReveal } from "./landing-motion";
import { CourseCarousel } from "./course-carousel";
import { getSupportWhatsappHref } from "@/lib/support-contact";
import { getSchoolStatus } from "@/lib/school-status";
import TimeLogo from "./time-logo";
import { Icon } from "./app/icons";

const ORATORIA_URL =
  "https://timeescoladenegocios.com.br/wp-content/uploads/2026/05/oratoria.png";

const VENDAS_URL =
  "https://timeescoladenegocios.com.br/wp-content/uploads/2026/05/vendas.jpg";

const COMMUNITY_URL =
  "https://timeescoladenegocios.com.br/wp-content/uploads/2026/04/SnapInsta.to_655874172_17872999800568889_3563219721526697584_n.jpg";

const COMMUNITY_URL_TWO =
  "https://timeescoladenegocios.com.br/wp-content/uploads/2026/04/SnapInsta.to_655979596_17872999413568889_6321192985899315970_n.jpg";

const COMMUNITY_URL_THREE =
  "https://timeescoladenegocios.com.br/wp-content/uploads/2026/04/SnapInsta.to_656634291_17872999773568889_1029578916583654329_n.jpg";

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="arrow-icon"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" className="play-icon" viewBox="0 0 24 24">
      <path d="M9 7.5v9l7-4.5-7-4.5Z" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  const supportWhatsappHref = getSupportWhatsappHref("Gostaria de fazer parte da TIME");
  const schoolStatus = getSchoolStatus();
  return (
    <main className="time-landing">
      <LandingMotion />
      <LandingReveal />
      <section className="hero" id="inicio" data-motion-scene="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-glow hero-glow-one" aria-hidden="true" />
        <div className="hero-glow hero-glow-two" aria-hidden="true" />

        <header className="site-header" data-motion-item="nav">
          <a className="brand" href="#inicio" aria-label="TIME Escola de Negócios">
            <TimeLogo variant="white" priority />
          </a>

          <nav aria-label="Navegação principal">
            <a href="#experiencia">Como funciona</a>
            <a href="#cursos">Cursos</a>
            <a href="#comunidade">Networking</a>
          </nav>

          <a className="header-login" href="/entrar">
            Entrar
            <span aria-hidden="true"><Icon name="external" size={14} /></span>
          </a>
          <a className="header-signup" href="/criar-conta">
            Criar conta
          </a>
        </header>

        <div className="hero-content">
          <div className="hero-copy">
            <div className="eyebrow hero-enter hero-enter-one" data-motion-item="copy">
              <span className="eyebrow-dot" />
              TIME — ESCOLA DE NEGÓCIOS
            </div>

            <h1 className="hero-enter hero-enter-two" data-motion-item="copy">
              Conhecimento que gera conexões.
              <span>Conexões que geram negócios.</span>
            </h1>

            <p className="hero-description hero-enter hero-enter-three" data-motion-item="copy">
              A TIME é um ecossistema de empresários, conhecimento, experiências
              e oportunidades criado para quem quer crescer no mundo real.
            </p>

            <div className="hero-actions hero-enter hero-enter-four" data-motion-item="copy">
              <a className="button button-primary" href="/criar-conta">
                Criar minha conta na TIME
                <ArrowIcon />
              </a>
              <a className="button button-secondary" href="/entrar">
                <span className="button-play">
                  <PlayIcon />
                </span>
                Já sou membro
              </a>
              <a className="hero-text-link" href="#experiencia">Conhecer a TIME <span aria-hidden="true"><Icon name="down" size={16} /></span></a>
            </div>

            <div className="hero-pillars hero-enter hero-enter-five" aria-label="Pilares da TIME" data-motion-item="copy">
              <span>Conhecimento</span><i>·</i><span>Conexões</span><i>·</i><span>Eventos</span><i>·</i><span>Negócios</span>
            </div>
          </div>

          <div className="product-stage" aria-label="Prévia da plataforma TIME" data-motion-item="stage">
            <div className="orbit orbit-one" aria-hidden="true" />
            <div className="orbit orbit-two" aria-hidden="true" />
            <div className="dashboard-shell">
              <div className="dashboard-topbar">
                <div className="mini-brand">
                  <TimeLogo variant="white" alt="" />
                </div>
                <div className="dashboard-search"><Icon name="search" size={14} /> Buscar na TIME</div>
                <div className="dashboard-user">
                  <span>•</span>
                  <b>IC</b>
                </div>
              </div>

              <div className="dashboard-body">
                <aside className="dashboard-sidebar" aria-hidden="true">
                  <span className="active"><Icon name="home" size={16} /></span>
                  <span><Icon name="courses" size={16} /></span>
                  <span><Icon name="community" size={16} /></span>
                  <span><Icon name="benefits" size={16} /></span>
                  <span><Icon name="sliders" size={16} /></span>
                </aside>

                <div className="dashboard-content">
                  <div className="welcome-row">
                    <div>
                      <small>TIME CONNECT</small>
                      <h2>Encontre uma conexão.</h2>
                      <p>Descreva de quem ou do que você precisa.</p>
                    </div>
                    <div className="level-pill">
                      <span>REDE</span>
                      <strong>MEMBROS REAIS</strong>
                    </div>
                  </div>

                  <div className="connection-search-preview motion-search-preview">
                    <span><Icon name="search" size={16} /></span>
                    <p><span className="motion-search-query">Preciso de uma empresa de marketing para clínicas odontológicas.</span></p>
                    <button aria-label="Buscar uma conexão">Buscar</button>
                  </div>

                  <div className="dashboard-section-title">
                    <h3>Compatibilidades encontradas na comunidade</h3>
                    <span>Como funciona?</span>
                  </div>

                  <div className="connection-result-preview motion-result-preview">
                    <article>
                      <div className="preview-avatar">01</div>
                      <div><span>PERFIL CADASTRADO</span><strong>Especialidade compatível</strong><small>O sistema explica por que essa conexão faz sentido.</small></div>
                      <b>Ver perfil</b>
                    </article>
                    <article>
                      <div className="preview-avatar">02</div>
                      <div><span>EMPRESA DA REDE</span><strong>Atuação relacionada</strong><small>Somente informações autorizadas pelo próprio membro.</small></div>
                      <b>WhatsApp</b>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-marquee" aria-label="Pilares da TIME">
          <div>
            <span>CURSOS PRÁTICOS</span>
            <i aria-hidden="true"></i>
            <span>COMUNIDADE PRÓPRIA</span>
            <i aria-hidden="true"></i>
            <span>NETWORKING</span>
            <i aria-hidden="true"></i>
            <span>EXPERIÊNCIAS PRESENCIAIS</span>
            <i aria-hidden="true"></i>
            <span>CURSOS PRÁTICOS</span>
            <i aria-hidden="true"></i>
            <span>COMUNIDADE PRÓPRIA</span>
            <i aria-hidden="true"></i>
            <span>NETWORKING</span>
            <i aria-hidden="true"></i>
            <span>EXPERIÊNCIAS PRESENCIAIS</span>
          </div>
        </div>
      </section>

      <section className="first-slice" id="experiencia" data-motion-scene="experience">
        <div className="section-kicker" data-motion-item="heading">A EXPERIÊNCIA TIME</div>
        <h2 data-motion-item="heading">
          Muito além de assistir aulas.
          <br />
          É aprender, conectar e <em>fazer negócios.</em>
        </h2>
        <p data-motion-item="heading">
          A plataforma organiza o conteúdo, aproxima os membros e mantém as
          conversas em movimento antes, durante e depois dos encontros da TIME.
        </p>

        <div className="experience-bento">
          <article className="bento-card bento-card-main reveal-on-scroll" data-motion-item="card">
            <div>
              <span>01 · APRENDA</span>
              <h3>Conteúdo que respeita o seu tempo.</h3>
              <p>
                Aulas objetivas, trilhas organizadas e conteúdos construídos por
                quem vive o mercado todos os dias.
              </p>
            </div>
            <div className="lesson-ui">
              <div className="lesson-ui-top">
                <span>AULA EM ANDAMENTO</span>
                <strong>PROGRESSO</strong>
              </div>
              <div className="lesson-ui-track">
                <i />
              </div>
              <div className="lesson-ui-bottom">
                <button><Icon name="play" size={14} /></button>
                <div>
                  <strong>Dominando objeções</strong>
                  <span>Vendas e Persuasão</span>
                </div>
              </div>
            </div>
          </article>

          <article className="bento-card bento-card-streak reveal-on-scroll" data-motion-item="card">
            <div className="bento-orbit">
              <span><Icon name="check" size={16} /></span>
              <i>ritmo</i>
            </div>
            <div>
              <span>02 · CONECTE</span>
              <h3>Networking dentro da plataforma.</h3>
              <p>Compartilhe experiências, converse com outros membros e participe da comunidade TIME.</p>
            </div>
          </article>

          <article className="bento-card bento-card-network reveal-on-scroll" data-motion-item="card">
            <div className="network-circles" aria-hidden="true">
              <span>IS</span>
              <span>SA</span>
              <span>MC</span>
              <span>TIME</span>
            </div>
            <div>
              <span>03 · FAÇA NEGÓCIOS</span>
              <h3>Boas relações abrem oportunidades.</h3>
              <p>
                O ambiente foi pensado para aproximar pessoas, estimular parcerias
                e gerar conversas que continuam fora da plataforma.
              </p>
            </div>
          </article>

          <article className="bento-card bento-card-result reveal-on-scroll" data-motion-item="card">
            <div>
              <span>04 · EVOLUA</span>
              <h3>Seu avanço, visível.</h3>
            </div>
            <div className="result-chart">
              {[28, 36, 31, 52, 48, 69, 76, 92].map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="result-number">
              <strong>JORNADA</strong>
              <span>aprendizado acompanhado</span>
            </div>
          </article>
        </div>
      </section>

      <section className="courses-showcase" id="cursos" data-motion-scene="courses">
        <div className="courses-showcase-glow" aria-hidden="true" />
        <CourseCarousel schoolStatus={schoolStatus} />
      </section>

      <section className="community-showcase" id="comunidade" data-motion-scene="community">
        <div className="community-intro reveal-on-scroll" data-motion-item="heading">
          <span className="section-tag section-tag-dark">NETWORKING TIME</span>
          <h2>
            Uma comunidade para conhecer pessoas,
            <br />
            trocar experiências e <em>criar oportunidades.</em>
          </h2>
          <p>
            O networking da TIME acontece dentro da plataforma e continua nos
            encontros presenciais. Você participa das conversas, acompanha avisos
            e mantém contato com pessoas que também estão construindo negócios.
          </p>
        </div>

        <div className="community-collage reveal-on-scroll" data-motion-item="collage">
          <div className="community-photo community-photo-main">
            <img src={COMMUNITY_URL} alt="Comunidade TIME reunida" loading="lazy" decoding="async" />
            <div />
            <span>ENCONTROS QUE CONTINUAM DEPOIS DO EVENTO</span>
          </div>
          <div className="community-photo">
            <img src={COMMUNITY_URL_TWO} alt="Membros da comunidade TIME" loading="lazy" decoding="async" />
          </div>
          <div className="community-photo">
            <img src={COMMUNITY_URL_THREE} alt="Networking na TIME" loading="lazy" decoding="async" />
          </div>
          <div className="community-stat community-stat-members">
            <strong>DIGITAL</strong>
            <span>comunidade dentro da plataforma</span>
          </div>
          <div className="community-stat community-stat-connections">
            <strong>PRESENCIAL</strong>
            <span>relações que continuam nos encontros</span>
          </div>
        </div>

        <div className="community-benefits">
          {[
            ["01", "Comunidade própria", "Publique, compartilhe experiências e acompanhe as conversas dos membros."],
            ["02", "Networking com contexto", "Converse com pessoas que vivem desafios reais de liderança e negócios."],
            ["03", "Avisos da TIME", "Acompanhe comunicados, encontros, aulas e novidades em um só lugar."],
            ["04", "Conexões presenciais", "Leve as conversas da plataforma para os encontros e experiências da TIME."],
          ].map((benefit) => (
            <article key={benefit[0]} className="reveal-on-scroll" data-motion-item="benefit">
              <span>{benefit[0]}</span>
              <h3>{benefit[1]}</h3>
              <p>{benefit[2]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ecosystem-showcase" id="ecossistema">
        <div className="ecosystem-head reveal-on-scroll">
          <span className="section-tag">UM ECOSSISTEMA. TODOS OS SEUS PRÓXIMOS PASSOS.</span>
          <h2>
            Tudo o que move um empresário,
            <br />
            <em>dentro da TIME.</em>
          </h2>
          <p>
            Conteúdo, comunidade, inteligência e oportunidades conectados em uma
            experiência única — sem depender de várias plataformas para evoluir.
          </p>
        </div>

        <div className="ecosystem-grid">
          <article className="ecosystem-card ecosystem-card-learning reveal-on-scroll">
            <div className="ecosystem-card-copy">
              <span>01 · ÁREA DE MEMBROS</span>
              <h3>Aprender parece simples. Evoluir fica inevitável.</h3>
              <p>
                Trilhas organizadas, progresso visível, recomendações e uma
                experiência de streaming feita para manter o ritmo.
              </p>
            </div>
            <div className="ecosystem-course-preview">
              <img src={VENDAS_URL} alt="Curso de vendas na plataforma TIME" />
              <div>
                <small>CONTINUE ASSISTINDO</small>
                <strong>Dominando objeções</strong>
                <span><i /> Progresso sincronizado</span>
              </div>
            </div>
          </article>

          <article className="ecosystem-card ecosystem-card-ai reveal-on-scroll">
            <div className="ecosystem-ai-badge"><i /> TUTOR DISPONÍVEL 24H</div>
            <span>02 · TUTOR TIME IA</span>
            <h3>Uma inteligência treinada para transformar conteúdo em ação.</h3>
            <div className="ecosystem-chat">
              <div className="ecosystem-chat-user">Como aplico isso na minha empresa esta semana?</div>
              <div className="ecosystem-chat-ai">
                <b><Icon name="tutor" size={16} /></b>
                <p>Vamos criar um plano prático em 3 movimentos, usando a aula que você acabou de assistir.</p>
              </div>
            </div>
          </article>

          <article className="ecosystem-card ecosystem-card-community reveal-on-scroll">
            <span>03 · COMUNIDADE PRÓPRIA</span>
            <h3>O ambiente certo acelera mais do que qualquer conteúdo.</h3>
            <p>Feed, canais por tema, avisos, eventos e networking dentro do próprio produto.</p>
            <div className="ecosystem-channels">
              <span># oportunidades</span>
              <span># vendas</span>
              <span># gestão</span>
              <span># conexões</span>
            </div>
            <div className="ecosystem-member-row">
              <span>MB</span><span>IC</span><span>RC</span><span>TIME</span>
            </div>
          </article>

          <article className="ecosystem-card ecosystem-card-small reveal-on-scroll">
            <b>04</b>
            <div>
              <h3>Gamificação</h3>
              <p>Pontos, progresso e conquistas com regras transparentes.</p>
            </div>
            <strong>XP <small>REAL</small></strong>
          </article>

          <article className="ecosystem-card ecosystem-card-small reveal-on-scroll">
            <b>05</b>
            <div>
              <h3>Aplicativo instalável</h3>
              <p>A TIME no celular, responsiva e pronta para acompanhar sua rotina.</p>
            </div>
            <strong>WEB APP <small>·</small> RESPONSIVO</strong>
          </article>

          <article className="ecosystem-card ecosystem-card-small reveal-on-scroll">
            <b>06</b>
            <div>
              <h3>Checkout próprio</h3>
              <p>Pagamento e recorrência pela Stripe, com liberação automática de acesso.</p>
            </div>
            <strong>STRIPE <small>·</small> RECORRÊNCIA</strong>
          </article>
        </div>
      </section>

      <section className="platform-features">
        <div className="phone-stage reveal-on-scroll">
          <div className="phone-orbit" aria-hidden="true" />
          <div className="phone-shell">
            <div className="phone-island" />
            <div className="phone-head">
              <TimeLogo variant="white" alt="" />
              <span>IC</span>
            </div>
            <div className="phone-greeting">
              <small>BOA NOITE, ISMAEL</small>
              <h3>Qual é o próximo movimento?</h3>
            </div>
            <div className="phone-course">
              <img src={VENDAS_URL} alt="" />
              <div />
              <span>CONTINUE ASSISTINDO</span>
              <strong>Dominando objeções</strong>
              <i />
            </div>
            <div className="phone-row-title">
              <strong>Para você</strong>
              <span>Ver tudo</span>
            </div>
            <div className="phone-mini-cards">
              <div>
                <img src={ORATORIA_URL} alt="" />
                <strong>Oratória</strong>
              </div>
              <div>
                <img src={COMMUNITY_URL} alt="" />
                <strong>Comunidade</strong>
              </div>
            </div>
            <nav>
              <span><Icon name="home" size={16} /></span>
              <span><Icon name="courses" size={16} /></span>
              <span><Icon name="community" size={16} /></span>
              <span><Icon name="benefits" size={16} /></span>
            </nav>
          </div>
          <div className="phone-floating phone-floating-xp">
            <span><Icon name="tutor" size={16} /></span>
            <div>
              <small>PROGRESSO</small>
              <strong>SALVO</strong>
            </div>
          </div>
          <div className="phone-floating phone-floating-live">
            <i />
            Comunidade ativa
          </div>
        </div>

        <div className="feature-copy reveal-on-scroll">
          <span className="section-tag">A TIME NA PALMA DA SUA MÃO</span>
          <h2>
            Sua evolução
            <br />
            acompanha você.
          </h2>
          <p>
            Uma experiência pensada primeiro para o celular. Aulas, comunidade,
            progresso e eventos em uma plataforma rápida, intuitiva e instalável.
          </p>
          <div className="feature-list">
            <article>
              <span>01</span>
              <div>
                <h3>Recomendações personalizadas</h3>
                <p>Conteúdos sugeridos de acordo com seu momento e progresso.</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Gamificação que faz sentido</h3>
                <p>Níveis, XP, sequência, ranking e conquistas que geram constância.</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Avaliações que orientam</h3>
                <p>Descubra os cursos mais relevantes pela experiência dos membros.</p>
              </div>
            </article>
          </div>
          <a className="button button-primary" href="/app">
            Conhecer a área de membros
            <ArrowIcon />
          </a>
        </div>
      </section>

      <section className="club-showcase">
        <div className="club-heading reveal-on-scroll">
          <div>
            <span className="section-tag">CLUBE DE NEGÓCIOS TIME</span>
            <h2>
              Conexões que abrem
              <br />
              <em>novas portas.</em>
            </h2>
          </div>
          <p>
            Mais do que consumir conteúdo: estar perto de empresários, criar
            relações de confiança e fazer parte de um ambiente onde oportunidades
            circulam.
          </p>
        </div>

        <div className="club-grid">
          {[
            ["01", "Jantares mensais", "Networking exclusivo em encontros pensados para gerar proximidade e novas oportunidades.", COMMUNITY_URL],
            ["02", "Indicações estruturadas", "Conexões entre membros, prioridade de consumo e um sistema que estimula negócios dentro do clube.", COMMUNITY_URL_TWO],
            ["03", "Crescimento contínuo", "Cursos, eventos, acompanhamento e benefícios para você e os colaboradores da sua empresa.", COMMUNITY_URL_THREE],
          ].map((item) => (
            <article className="club-card reveal-on-scroll" key={item[0]}>
              <img src={item[3]} alt="Experiência presencial da TIME Escola de Negócios" />
              <div className="club-card-overlay" />
              <span>{item[0]}</span>
              <div>
                <h3>{item[1]}</h3>
                <p>{item[2]}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="club-benefit-bar reveal-on-scroll">
          <div>
            <span>BENEFÍCIO PARA MEMBROS</span>
            <strong>Até 50% de desconto em cursos e eventos da TIME</strong>
            <p>Para você e para os funcionários da sua empresa.</p>
          </div>
          <a className="button button-primary" href="/checkout">
            Quero fazer parte
            <ArrowIcon />
          </a>
        </div>
      </section>

      <section className="admin-showcase" id="resultados">
        <div className="admin-showcase-copy reveal-on-scroll">
          <span className="section-tag section-tag-dark">GESTÃO COMPLETA</span>
          <h2>
            Conteúdo, membros e
            <br />
            resultados sob controle.
          </h2>
          <p>
            A equipe da TIME publica cursos, organiza aulas, envia vídeos,
            atualiza thumbnails, cria avisos e acompanha engajamento em um único
            painel.
          </p>
          <div className="admin-feature-chips">
            <span>Upload de vídeos</span>
            <span>Gestão de membros</span>
            <span>Tempo na plataforma</span>
            <span>Recorrência</span>
            <span>Moderação</span>
            <span>Relatórios</span>
          </div>
          <a href="/admin">
            Ver painel administrativo
            <ArrowIcon />
          </a>
        </div>

        <div className="admin-preview-card reveal-on-scroll">
          <header>
            <div className="admin-preview-brand">
              <TimeLogo variant="white" alt="" />
              <span>ADMIN</span>
            </div>
            <div className="admin-preview-search"><Icon name="search" size={14} /> Buscar na administração...</div>
            <b>IC</b>
          </header>
          <div className="admin-preview-body">
            <aside>
              <span className="active"><Icon name="admin" size={16} /></span>
              <span><Icon name="courses" size={16} /></span>
              <span><Icon name="connections" size={16} /></span>
              <span><Icon name="community" size={16} /></span>
              <span><Icon name="subscription" size={16} /></span>
            </aside>
            <div>
              <small>PAINEL ADMINISTRATIVO</small>
              <h3>Boa noite, Ismael.</h3>
              <div className="admin-preview-kpis">
                <article>
                  <span>MEMBROS</span>
                  <strong>DADOS REAIS</strong>
                  <i>acesso e atividade</i>
                </article>
                <article>
                  <span>ASSINATURAS</span>
                  <strong>STRIPE</strong>
                  <i>status sincronizado</i>
                </article>
                <article>
                  <span>PERMANÊNCIA</span>
                  <strong>REGISTRADA</strong>
                  <i>por progresso</i>
                </article>
              </div>
              <div className="admin-preview-chart">
                <div>
                  <span>VISÃO CONSOLIDADA</span>
                  <strong>DADOS DA PLATAFORMA</strong>
                </div>
                <div className="admin-chart-bars">
                  {[30, 42, 37, 56, 48, 68, 62, 82, 76, 94].map(
                    (height, index) => (
                      <i key={index} style={{ height: `${height}%` }} />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta-grid" aria-hidden="true" />
        <div className="final-cta-orb" aria-hidden="true" />
        <div className="reveal-on-scroll">
          <span>SEU PRÓXIMO NÍVEL COMEÇA AQUI</span>
          <h2>
            Conhecimento abre portas.
            <br />
            <em>Movimento muda destinos.</em>
          </h2>
          <p>
            Entre para uma escola feita para quem decidiu crescer de verdade.
          </p>
          <div>
            <a className="button button-primary" href="/checkout">
              Quero fazer parte da TIME
              <ArrowIcon />
            </a>
            <a className="button button-secondary" href="#faq">
              Tirar minhas dúvidas
            </a>
          </div>
          <small>CURSOS PRÁTICOS &nbsp; · &nbsp; NETWORKING &nbsp; · &nbsp; EXPERIÊNCIAS TIME</small>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="faq-intro">
          <span className="section-tag section-tag-dark">PERGUNTAS FREQUENTES</span>
          <h2>Antes de começar, saiba tudo.</h2>
          <p>
            Se ainda restar alguma dúvida, nossa equipe está pronta para conversar
            com você.
          </p>
          {supportWhatsappHref ? <a href={supportWhatsappHref} target="_blank" rel="noreferrer">Falar com a equipe</a> : <span>Canal de atendimento em configuração.</span>}
        </div>
        <div className="faq-list">
          {[
            [
              "A plataforma funciona no celular?",
              "Sim. A área de membros é responsiva e pode ser acessada pelo computador, tablet ou celular.",
            ],
            [
              "Como acesso os cursos?",
              "Após a confirmação da sua matrícula, o acesso é liberado automaticamente para a sua área de membros.",
            ],
            [
              "A comunidade está incluída?",
              "A plataforma possui uma comunidade própria para publicações e avisos. As experiências presenciais complementam as conexões construídas na TIME.",
            ],
            [
              "Consigo acompanhar meu progresso?",
              "Sim. A plataforma registra as aulas concluídas e o avanço nos cursos disponíveis para a sua conta.",
            ],
            [
              "Há novos conteúdos?",
              "A plataforma foi estruturada para receber novos cursos, aulas, encontros e materiais continuamente.",
            ],
          ].map((item, index) => (
            <details key={item[0]} open={index === 0}>
              <summary>
                <span>0{index + 1}</span>
                {item[0]}
                <i>+</i>
              </summary>
              <p>{item[1]}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-main">
          <div>
            <TimeLogo variant="white" />
            <p>Conhecimento que vira movimento.</p>
          </div>
          <nav>
            <div>
              <strong>PLATAFORMA</strong>
              <a href="#experiencia">Experiência</a>
              <a href="#cursos">Cursos</a>
              <a href="#comunidade">Comunidade</a>
              <a href="/app">Área de membros</a>
            </div>
            <div>
              <strong>TIME</strong>
              <a href="https://timeescoladenegocios.com.br/">Sobre nós</a>
              <a href="#resultados">Para empresas</a>
              <a href="#faq">Dúvidas</a>
              <a href="https://www.instagram.com/time.escola/">Instagram</a>
            </div>
            <div>
              <strong>LEGAL</strong>
              <a href="/termos">Termos de uso</a>
              <a href="/privacidade">Privacidade</a>
              <a href="#faq">Cookies</a>
              <a href="#faq">Suporte</a>
            </div>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© 2026 TIME Escola de Negócios. Todos os direitos reservados.</span>
          <a href="#inicio">Voltar ao topo <Icon name="up" size={14} /></a>
        </div>
      </footer>
    </main>
  );
}
