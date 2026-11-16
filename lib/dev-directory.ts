import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import type { MemberProfile } from "@/lib/member-profile";
import type { DirectoryMember } from "@/lib/member-directory";

/**
 * Substituto LOCAL do Supabase para perfil e diretório de membros.
 *
 * Em produção, perfil (`member_profiles`) e diretório (RPCs) moram no Supabase
 * remoto e dependem do JWT real. Com a identidade de teste (lib/dev-identity.ts)
 * não há JWT, então até aqui era impossível exercitar match, diretório e perfil
 * no ambiente local — e nenhuma dessas telas tinha sido testada logada.
 *
 * O servidor roda dentro do workerd, que NÃO tem acesso a arquivos; por isso o
 * armazém é uma tabela no D1 LOCAL, `dev_member_profiles`, criada aqui sob
 * demanda. Este módulo só é importado atrás de `import.meta.env.DEV` e com a
 * identidade de teste ativa; o build de produção o elimina — e há um teste que
 * procura `dev_member_profiles` no bundle publicado para provar isso.
 */
export const DEV_DIRECTORY_MARKER = "__TIME_DEV_DIRECTORY__";

const TABLE = "dev_member_profiles";
let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await getDb().run(sql.raw(`CREATE TABLE IF NOT EXISTS ${TABLE} (user_id TEXT PRIMARY KEY, data TEXT NOT NULL)`));
  tableReady = true;
  // Semeia os membros de demonstração na primeira passagem; é idempotente.
  await seedDevDirectory();
}

function emptyProfile(userId: string): MemberProfile {
  const now = new Date().toISOString();
  return {
    user_id: userId, full_name: null, avatar_path: null, whatsapp: null, city: null, state: null, job_title: null,
    company_name: null, segment: null, website_url: null, instagram_url: null, linkedin_url: null,
    company_description: null, products: null, services: null, target_audience: null, service_area: null,
    differentiators: null, regions_served: null, offers: null, how_can_help: null, looking_for: null,
    desired_professionals: null, desired_referrals: null, company_problems: null, desired_partnerships: null,
    onboarding_step: 1, profile_completeness: 0, completed_at: null, directory_visible: true, is_active: true,
    created_at: now, updated_at: now,
  };
}

async function readAll(): Promise<MemberProfile[]> {
  await ensureTable();
  const rows = await getDb().all<{ data: string }>(sql.raw(`SELECT data FROM ${TABLE}`));
  return rows.map((row) => JSON.parse(row.data) as MemberProfile);
}

export async function getDevProfile(userId: string): Promise<MemberProfile | null> {
  await ensureTable();
  const rows = await getDb().all<{ data: string }>(sql`SELECT data FROM ${sql.raw(TABLE)} WHERE user_id = ${userId}`);
  return rows[0] ? (JSON.parse(rows[0].data) as MemberProfile) : null;
}

/** Mesma semântica do upsert do Supabase: mescla sobre o que já existe. */
export async function saveDevProfile(userId: string, patch: Partial<MemberProfile>): Promise<void> {
  await ensureTable();
  const current = (await getDevProfile(userId)) ?? emptyProfile(userId);
  const next: MemberProfile = { ...current, ...patch, user_id: userId, updated_at: new Date().toISOString() };
  const data = JSON.stringify(next);
  await getDb().run(
    sql`INSERT INTO ${sql.raw(TABLE)} (user_id, data) VALUES (${userId}, ${data}) ON CONFLICT(user_id) DO UPDATE SET data = ${data}`,
  );
}

function toDirectoryMember(p: MemberProfile): DirectoryMember {
  return {
    user_id: p.user_id, full_name: p.full_name, avatar_path: p.avatar_path, avatar_url: null, job_title: p.job_title,
    company_name: p.company_name, segment: p.segment, city: p.city, state: p.state,
    company_description: p.company_description, services: p.services, offers: p.offers, service_area: p.service_area,
  };
}

const norm = (v: string | null | undefined) => (v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Espelha o RPC `search_member_directory`: só perfis concluídos, ativos e visíveis. */
export async function searchDevDirectory(filters: { search?: string; segment?: string; city?: string; service?: string }): Promise<DirectoryMember[]> {
  const all = await readAll();
  const s = norm(filters.search), seg = norm(filters.segment), city = norm(filters.city), serv = norm(filters.service);
  return all
    .filter((p) => p.completed_at && p.is_active && p.directory_visible)
    .filter((p) => !seg || norm(p.segment).includes(seg))
    .filter((p) => !city || norm(p.city).includes(city))
    .filter((p) => !serv || norm(`${p.services} ${p.offers}`).includes(serv))
    .filter((p) => !s || norm([p.full_name, p.company_name, p.segment, p.job_title, p.services, p.offers, p.company_description].join(" ")).includes(s))
    .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""))
    .map(toDirectoryMember);
}

export async function getDevDirectoryProfile(userId: string) {
  const p = await getDevProfile(userId);
  if (!p || !p.completed_at || !p.is_active || !p.directory_visible) return null;
  // O RPC de perfil expõe mais campos que a busca, mas nunca o WhatsApp.
  const { whatsapp: _omitted, ...publico } = p;
  void _omitted;
  return { ...publico, avatar_url: null as string | null };
}

export async function getDevWhatsapp(userId: string): Promise<string | null> {
  const p = await getDevProfile(userId);
  return p?.completed_at ? p.whatsapp : null;
}

/**
 * Oito membros de demonstração, todos "[DEMO]" e com perfil completo, para o
 * diretório e o match terem com o que trabalhar. Só insere se a tabela está
 * vazia: rodar de novo não duplica nem sobrescreve o que o membro de teste
 * preencheu pelo cadastro.
 */
export async function seedDevDirectory(): Promise<number> {
  const existing = await readAll();
  if (existing.some((p) => p.user_id.startsWith("00000000-0000-4000-8000-0000000000d"))) return 0;
  const base = (id: string, campos: Partial<MemberProfile>): MemberProfile => ({
    // 36 caracteres, como um UUID: a rota de perfil valida o comprimento.
    ...emptyProfile(`00000000-0000-4000-8000-0000000000d${id}`),
    ...campos,
    onboarding_step: 5, profile_completeness: 100, completed_at: new Date().toISOString(), directory_visible: true, is_active: true,
  });
  const demo: MemberProfile[] = [
    base("1", { full_name: "Ana Contábil [DEMO]", whatsapp: "41999990001", city: "Curitiba", state: "PR", job_title: "Contadora", company_name: "Ana Contabilidade", segment: "Contabilidade", company_description: "Escritório contábil para pequenas e médias empresas.", services: "Contabilidade, planejamento tributário, abertura de empresa", offers: "Diagnóstico tributário gratuito", target_audience: "Empresas de serviço e comércio", service_area: "Curitiba e região", looking_for: "Clientes de serviço que faturam acima de 50 mil por mês", desired_referrals: "Clínicas, agências e consultorias" }),
    base("2", { full_name: "Bruno Tráfego [DEMO]", whatsapp: "41999990002", city: "Curitiba", state: "PR", job_title: "Gestor de tráfego", company_name: "Bruno Ads", segment: "Marketing digital", company_description: "Tráfego pago para clínicas e negócios locais.", services: "Tráfego pago, Google Ads, Meta Ads", offers: "Auditoria de campanhas", target_audience: "Clínicas, dentistas e negócios locais", service_area: "Brasil", looking_for: "Designer para criativos e um contador", desired_referrals: "Clínicas odontológicas" }),
    base("3", { full_name: "Carla Design [DEMO]", whatsapp: "41999990003", city: "São Paulo", state: "SP", job_title: "Designer", company_name: "Carla Studio", segment: "Design", company_description: "Identidade visual e criativos para anúncios.", services: "Identidade visual, design de marca, criativos", offers: "Pacote de criativos mensais", target_audience: "Agências e gestores de tráfego", service_area: "Brasil", looking_for: "Gestores de tráfego e agências que precisem de criativos", desired_referrals: "Agências de marketing" }),
    base("4", { full_name: "Diego Advogado [DEMO]", whatsapp: "41999990004", city: "Curitiba", state: "PR", job_title: "Advogado empresarial", company_name: "Diego Advocacia", segment: "Jurídico", company_description: "Direito empresarial, contratos e societário.", services: "Contratos, societário, consultoria jurídica", offers: "Revisão de contrato social", target_audience: "Empresários e startups", service_area: "Paraná", looking_for: "Contador parceiro para abertura de empresas", desired_referrals: "Startups em constituição" }),
    base("5", { full_name: "Elisa Odonto [DEMO]", whatsapp: "41999990005", city: "Curitiba", state: "PR", job_title: "Dentista", company_name: "Clínica Elisa", segment: "Saúde", company_description: "Clínica odontológica com foco em estética.", services: "Odontologia estética, implantes, clareamento", offers: "Avaliação gratuita", target_audience: "Pessoas físicas", service_area: "Curitiba", looking_for: "Tráfego pago e identidade visual para a clínica", desired_referrals: "Pacientes de estética" }),
    base("6", { full_name: "Fábio Software [DEMO]", whatsapp: "41999990006", city: "Florianópolis", state: "SC", job_title: "Desenvolvedor", company_name: "Fábio Sistemas", segment: "Tecnologia", company_description: "Sistemas sob medida e automação com IA.", services: "Desenvolvimento de software, automação, integrações", offers: "Diagnóstico de automação", target_audience: "Empresas com processo manual", service_area: "Brasil", looking_for: "Empresas com processos manuais para automatizar", desired_referrals: "Indústrias e distribuidoras" }),
    base("7", { full_name: "Gabi Eventos [DEMO]", whatsapp: "41999990007", city: "Curitiba", state: "PR", job_title: "Produtora de eventos", company_name: "Gabi Produções", segment: "Eventos", company_description: "Produção de eventos corporativos.", services: "Produção de eventos, cerimonial, palestras", offers: "Orçamento sem compromisso", target_audience: "Empresas e associações", service_area: "Paraná e Santa Catarina", looking_for: "Fornecedores de buffet e audiovisual", desired_referrals: "Empresas que fazem convenções" }),
    base("8", { full_name: "Hugo Finanças [DEMO]", whatsapp: "41999990008", city: "Londrina", state: "PR", job_title: "Consultor financeiro", company_name: "Hugo Consultoria", segment: "Finanças", company_description: "Consultoria financeira e planejamento para empresários.", services: "Consultoria financeira, fluxo de caixa, planejamento", offers: "Diagnóstico financeiro", target_audience: "Empresários com faturamento acima de 1 milhão", service_area: "Brasil", looking_for: "Contador e advogado para parcerias", desired_referrals: "Empresas familiares" }),
  ];
  for (const p of demo) await saveDevProfile(p.user_id, p);
  return demo.length;
}
