import Link from "next/link";
import TimeLogo from "./time-logo";
type Section = { title: string; paragraphs?: string[]; items?: string[] };

export default function LegalPage({
  kicker, title, introduction, sections,
}: { kicker: string; title: string; introduction: string; sections: Section[] }) {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/" aria-label="TIME Escola de Negócios"><TimeLogo variant="blue" className="legal-logo-light" priority /><TimeLogo variant="white" className="legal-logo-dark" /></Link>
        <Link href="/">Voltar ao início</Link>
      </header>
      <div className="legal-layout">
        <aside>
          <span>{kicker}</span><h1>{title}</h1>
          <p>Última atualização: 31 de julho de 2026</p>
          <Link href="/checkout">Ir para a inscrição</Link>
        </aside>
        <article>
          <p className="legal-intro">{introduction}</p>
          {sections.map((section, index) => (
            <section key={section.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{section.title}</h2>
                {section.paragraphs?.map((text) => <p key={text}>{text}</p>)}
                {section.items ? <ul>{section.items.map((text) => <li key={text}>{text}</li>)}</ul> : null}
              </div>
            </section>
          ))}
        </article>
      </div>
      <footer className="legal-footer">
        <span>© 2026 TIME Escola de Negócios</span>
        <div><Link href="/termos">Termos de Uso</Link><Link href="/privacidade">Privacidade</Link></div>
      </footer>
    </main>
  );
}
