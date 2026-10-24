import type { IconName } from "./icons";

export type NavId =
  | "inicio"
  | "cursos"
  | "conexoes"
  | "comunidade"
  | "agenda"
  | "membros"
  | "beneficios"
  | "ouvidoria"
  | "podcasts"
  | "tutor"
  | "conquistas"
  | "perfil";

export type NavItem = { id: string; label: string; hint: string; href: string; icon: IconName; badge?: string | number };

/** Seções que a plataforma (member-platform) troca sem recarregar a página. */
export const SPA_SECTIONS: ReadonlySet<string> = new Set(["inicio", "cursos", "comunidade", "agenda", "podcasts", "tutor", "conquistas"]);

/** Navegação principal: igual no desktop (barra lateral) e no celular (barra inferior). */
export const PRIMARY_NAV: NavItem[] = [
  { id: "inicio", label: "Início", hint: "Seu próximo passo", href: "/app", icon: "home" },
  { id: "cursos", label: "Cursos", hint: "Escola TIME", href: "/app/cursos", icon: "courses" },
  { id: "conexoes", label: "Conexões", hint: "Encontre quem pode ajudar", href: "/app/conexoes", icon: "connections" },
  { id: "comunidade", label: "Comunidade", hint: "Conversas entre membros", href: "/app/comunidade", icon: "community" },
  { id: "agenda", label: "Eventos", hint: "Agenda e inscrições", href: "/app/eventos", icon: "events" },
];

/** Demais áreas: grupo "Mais" na barra lateral e folha "Mais" no celular. */
export const MORE_NAV: NavItem[] = [
  { id: "membros", label: "Empresários", hint: "Diretório de membros e empresas", href: "/app/membros", icon: "directory" },
  { id: "beneficios", label: "Clube de Benefícios", hint: "Vantagens do ecossistema TIME", href: "/app/beneficios", icon: "benefits" },
  { id: "podcasts", label: "Podcasts", hint: "Episódios da TIME", href: "/app?secao=podcasts", icon: "podcasts" },
  { id: "tutor", label: "Tutor TIME IA", hint: "Ajuda baseada no conteúdo publicado", href: "/app?secao=tutor", icon: "tutor" },
  { id: "conquistas", label: "Conquistas", hint: "Seu progresso", href: "/app?secao=conquistas", icon: "achievements" },
  { id: "ouvidoria", label: "Ouvidoria", hint: "Canal privado com a equipe TIME", href: "/app/ouvidoria", icon: "ombudsman" },
  { id: "perfil", label: "Meu perfil", hint: "Dados e perfil empresarial", href: "/app/cadastro", icon: "profile" },
];

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...MORE_NAV];

export function isNavId(value: unknown): value is NavId {
  return typeof value === "string" && ALL_NAV.some((item) => item.id === value);
}
