import Link from "next/link";
import TimeLogo from "../time-logo";

type AuthShellProps = {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export default function AuthShell({
  children,
  eyebrow,
  title,
  description,
}: AuthShellProps) {
  return (
    <main className="auth-page">
      <section className="auth-brand" aria-label="TIME Escola de Negócios">
        <div className="auth-brand-grid" aria-hidden="true" />
        <Link href="/" className="auth-logo" aria-label="Voltar para o início">
          <TimeLogo variant="white" priority />
        </Link>
        <div className="auth-brand-copy">
          <span>ECOSSISTEMA TIME</span>
          <h1>
            Conhecimento que gera conexões. <em>Conexões que geram negócios.</em>
          </h1>
          <p>
            Entre para acessar empresários, oportunidades, conteúdos e eventos
            da comunidade TIME.
          </p>
        </div>
        <div className="auth-brand-points" aria-label="O que você encontra na TIME">
          <div><b>01</b><span>Empresários e empresas da comunidade</span></div>
          <div><b>02</b><span>Conexões profissionais mais relevantes</span></div>
          <div><b>03</b><span>Conhecimento para decisões de negócio</span></div>
        </div>
        <small>TIME Escola de Negócios</small>
      </section>

      <section className="auth-content">
        <Link href="/" className="auth-mobile-brand" aria-label="TIME Escola de Negócios">
          <TimeLogo variant="blue" />
        </Link>
        <div className="auth-card">
          <header>
            <span>{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </header>
          {children}
        </div>
        <p className="auth-privacy">
          Ao continuar, você concorda com os <Link href="/termos">Termos de Uso</Link>{" "}
          e a <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
      </section>
    </main>
  );
}
