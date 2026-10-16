"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type UIEvent } from "react";

type FeaturedCourse = {
  category: string;
  title: string;
  description: string;
  tags: string[];
  image: string;
  imagePosition: string;
};

const courses: FeaturedCourse[] = [
  {
    category: "Vendas",
    title: "Vendas e Persuasão de Alta Performance",
    description: "Venda com método, conduza negociações e transforme objeções em decisões.",
    tags: ["Método prático", "Negociação", "Alta performance"],
    image: "/course-carousel/vendas.webp",
    imagePosition: "center 48%",
  },
  {
    category: "Comunicação",
    title: "Comunicação, Palco & Mídia",
    description: "Comunique suas ideias com clareza, presença e autoridade diante de qualquer público.",
    tags: ["Oratória", "Presença", "Mídia"],
    image: "/course-carousel/comunicacao.webp",
    imagePosition: "center 36%",
  },
  {
    category: "Automotivo",
    title: "Vendas Automotivas de Alta Performance",
    description: "Aprimore a experiência comercial e transforme atendimento em vendas no setor automotivo.",
    tags: ["Atendimento", "Conversão", "Automotivo"],
    image: "/course-carousel/automotivo.webp",
    imagePosition: "center 52%",
  },
  {
    category: "Gestão",
    title: "Liderança e Gestão de Equipes",
    description: "Desenvolva times mais produtivos, alinhados e preparados para crescer com consistência.",
    tags: ["Liderança", "Gestão", "Performance"],
    image: "/course-carousel/gestao.webp",
    imagePosition: "center 42%",
  },
  {
    category: "Finanças",
    title: "Finanças para Empresários",
    description: "Leia os números do negócio, tome decisões melhores e construa uma operação financeiramente saudável.",
    tags: ["Gestão financeira", "Indicadores", "Decisão"],
    image: "/course-carousel/financas.webp",
    imagePosition: "center 48%",
  },
  {
    category: "Patrimônio",
    title: "Patrimônio Inteligente",
    description: "Organize decisões patrimoniais com visão de longo prazo, estratégia e proteção.",
    tags: ["Planejamento", "Investimentos", "Proteção"],
    image: "/course-carousel/patrimonio.webp",
    imagePosition: "center 46%",
  },
  {
    category: "Bitcoin",
    title: "Bitcoin para Empresários",
    description: "Entenda os fundamentos do Bitcoin e avalie oportunidades com clareza e responsabilidade.",
    tags: ["Bitcoin", "Mercado cripto", "Estratégia"],
    image: "/course-carousel/bitcoin.webp",
    imagePosition: "center 48%",
  },
  {
    category: "Marketing",
    title: "Posicionamento e Crescimento",
    description: "Fortaleça sua marca e transforme estratégia de marketing em crescimento sustentável.",
    tags: ["Posicionamento", "Marca", "Crescimento"],
    image: "/course-carousel/marketing.webp",
    imagePosition: "center 50%",
  },
  {
    category: "Networking",
    title: "Conexões que Geram Negócios",
    description: "Construa relações mais inteligentes e transforme boas conexões em oportunidades reais.",
    tags: ["Conexões", "Comunidade", "Oportunidades"],
    image: "/course-carousel/networking.webp",
    imagePosition: "center 44%",
  },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function CourseCarousel({ schoolStatus = "active" }: { schoolStatus?: "active" | "coming_soon" }) {
  const isComingSoon = schoolStatus === "coming_soon";
  const [activeIndex, setActiveIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const goTo = useCallback((requestedIndex: number) => {
    const nextIndex = (requestedIndex + courses.length) % courses.length;
    const viewport = viewportRef.current;
    const track = viewport?.querySelector<HTMLElement>(".course-carousel-track");
    const slide = track?.querySelector<HTMLElement>(`[data-course-index="${nextIndex}"]`);

    setActiveIndex(nextIndex);
    if (viewport && track && slide) {
      viewport.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: "smooth" });
    }
  }, []);

  const updateFromScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    const viewport = event.currentTarget;
    animationFrameRef.current = requestAnimationFrame(() => {
      const slides = Array.from(viewport.querySelectorAll<HTMLElement>("[data-course-index]"));
      const nearest = slides.reduce(
        (best, slide, index) => {
          const distance = Math.abs(viewport.scrollLeft - slide.offsetLeft);
          return distance < best.distance ? { index, distance } : best;
        },
        { index: 0, distance: Number.POSITIVE_INFINITY },
      );
      setActiveIndex(nearest.index);
    });
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(activeIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(activeIndex + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(courses.length - 1);
    }
  };

  return (
    <div
      className="course-carousel"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Cursos em destaque da TIME Escola de Negócios"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <header className="course-carousel-heading reveal-on-scroll" data-motion-item="heading">
        <div>
          <span className="section-tag">{isComingSoon ? "PRÓXIMAS FORMAÇÕES" : "CURSOS EM DESTAQUE"}</span>
          <h2>
            Conhecimento prático para
            <br />
            você ir mais longe nos negócios
          </h2>
        </div>
        <div className="course-carousel-actions">
          <span>FORMAÇÃO QUE<br />GERA RESULTADOS</span>
          <div>
            <button type="button" onClick={() => goTo(activeIndex - 1)} aria-label="Curso anterior">←</button>
            <button type="button" onClick={() => goTo(activeIndex + 1)} aria-label="Próximo curso">→</button>
          </div>
        </div>
      </header>

      <div
        className="course-carousel-viewport reveal-on-scroll"
        data-motion-item="carousel"
        ref={viewportRef}
        onScroll={updateFromScroll}
      >
        <ul className="course-carousel-track">
          {courses.map((course, index) => (
            <li
              className="course-carousel-slide"
              data-course-index={index}
              key={course.title}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} de ${courses.length}`}
            >
              <article className="course-carousel-card">
                <div className="course-carousel-image">
                  <img
                    src={course.image}
                    alt={`${course.category}: ${course.title}`}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    style={{ objectPosition: course.imagePosition }}
                  />
                  <div aria-hidden="true" />
                  <span>{course.category}</span>
                </div>
                <div className="course-carousel-copy">
                  <small>CURSO TIME • ESCOLA DE NEGÓCIOS</small>
                  {isComingSoon ? <span className="course-carousel-status">EM BREVE</span> : null}
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <div className="course-carousel-tags" aria-label="Temas do curso">
                    {course.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <a href="/entrar?retorno=/app/cursos">
                    {isComingSoon ? "Ver próximas formações" : "Conhecer o curso"}
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>

      <footer className="course-carousel-footer">
        <span className="course-carousel-counter" aria-live="polite">
          <strong>{pad(activeIndex + 1)}</strong> / {pad(courses.length)}
        </span>
        <div className="course-carousel-dots" aria-label="Selecionar curso">
          {courses.map((course, index) => (
            <button
              type="button"
              className={index === activeIndex ? "active" : ""}
              aria-label={`Mostrar ${course.title}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => goTo(index)}
              key={course.title}
            />
          ))}
        </div>
        <span className="course-carousel-footnote">CURSOS QUE IMPULSIONAM PESSOAS E NEGÓCIOS</span>
      </footer>
    </div>
  );
}
