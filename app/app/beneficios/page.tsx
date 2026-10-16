import { asc, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { benefits } from "@/db/schema";
import { requireMemberAccess } from "@/lib/access";
import MemberShell from "../member-shell";
import BenefitsCatalog from "./benefits-catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clube de Benefícios | TIME Escola de Negócios" };

export default async function BenefitsPage() {
  const access = await requireMemberAccess("/app/beneficios", "benefits");
  const items = await getDb().select().from(benefits)
    .where(or(eq(benefits.status, "active"), eq(benefits.status, "coming_soon")))
    .orderBy(asc(benefits.category), asc(benefits.title));

  return <MemberShell active="beneficios" memberName={access.identity.fullName || access.identity.email.split("@")[0]}>
    <section className="simple-member-page">
      <header><span>CLUBE DE BENEFÍCIOS TIME</span><h1>Vantagens para quem cresce com a TIME.</h1><p>Catálogo exclusivo do ecossistema TIME. Os itens de homologação não representam parceiros ou condições comerciais reais.</p></header>
      <BenefitsCatalog items={items.filter((item) => item.status === "active" || item.status === "coming_soon")} />
    </section>
  </MemberShell>;
}
