import Link from "next/link";
import type { ReactNode } from "react";
import TimeLogo from "../time-logo";

export default function MemberShell({
  children,
  active,
  memberName,
}: {
  children: ReactNode;
  active: "inicio" | "conexoes" | "membros" | "perfil" | "beneficios" | "ouvidoria";
  memberName: string;
}) {
  return (
    <div className="time-app">
      <header className="time-app-header">
        <Link className="time-app-brand" href="/app" aria-label="TIME Escola de Negócios">
          <TimeLogo variant="blue" priority />
        </Link>
        <nav aria-label="Navegação principal">
          <Link className={active === "inicio" ? "active" : ""} href="/app">Início</Link>
          <Link href="/app/cursos">Cursos</Link>
          <Link className={active === "conexoes" ? "active" : ""} href="/app/conexoes">Conexões</Link>
          <Link href="/app/comunidade">Comunidade</Link>
          <Link href="/app/eventos">Eventos</Link>
          <Link className={active === "beneficios" ? "active" : ""} href="/app/beneficios">Benefícios</Link>
          <Link className={active === "ouvidoria" ? "active" : ""} href="/app/ouvidoria">Ouvidoria</Link>
          <Link className={active === "membros" ? "active" : ""} href="/app/membros">Empresários</Link>
        </nav>
        <div className="time-app-account">
          <span>{memberName}</span>
          <form action="/auth/signout" method="post"><button type="submit">Sair</button></form>
        </div>
      </header>
      <main>{children}</main>
      <nav className="time-app-mobile-nav" aria-label="Navegação no celular">
        <Link className={active === "inicio" ? "active" : ""} href="/app"><b>⌂</b><span>Início</span></Link>
        <Link href="/app/cursos"><b>▶</b><span>Cursos</span></Link>
        <Link className={active === "conexoes" ? "active" : ""} href="/app/conexoes"><b>⌕</b><span>Conexões</span></Link>
        <Link href="/app/comunidade"><b>◉</b><span>Comunidade</span></Link>
        <Link href="/app/eventos"><b>□</b><span>Eventos</span></Link>
        <Link className={["membros", "perfil", "beneficios", "ouvidoria"].includes(active) ? "active" : ""} href="/app/membros"><b>•••</b><span>Mais</span></Link>
      </nav>
    </div>
  );
}
