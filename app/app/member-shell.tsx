import type { ReactNode } from "react";
import MemberFrame from "./member-frame";
import type { NavId } from "./member-nav";

/**
 * Casca das páginas de rota própria (conexões, empresários, benefícios, ouvidoria…).
 * Usa a mesma estrutura única da plataforma (MemberFrame): mesma navegação, tema e menu de conta.
 */
export default function MemberShell({
  children,
  active,
  memberName,
  memberEmail = "",
  isAdmin = false,
}: {
  children: ReactNode;
  active: NavId;
  memberName: string;
  memberEmail?: string;
  isAdmin?: boolean;
}) {
  return (
    <MemberFrame active={active} member={{ name: memberName, email: memberEmail, isAdmin }}>
      <div className="mf-page">{children}</div>
    </MemberFrame>
  );
}
