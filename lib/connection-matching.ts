import { searchDirectory, type DirectoryMember } from "@/lib/member-directory";

export type ConnectionMatch = DirectoryMember & {
  compatibility: number;
  reason: string;
  matchedTerms: string[];
};

const STOP_WORDS = new Set([
  "preciso", "procuro", "quero", "alguém", "alguem", "uma", "um", "para", "com",
  "que", "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos", "por",
  "meu", "minha", "me", "conhecer", "empresa", "profissional", "serviço", "servico",
]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function termsFrom(query: string) {
  return [...new Set(normalize(query).split(/[^a-z0-9]+/).filter((term) => term.length >= 4 && !STOP_WORDS.has(term)))].slice(0, 12);
}

function matchMember(member: DirectoryMember, terms: string[]): ConnectionMatch | null {
  const fields = {
    segment: normalize(member.segment ?? ""),
    service: normalize(`${member.services ?? ""} ${member.offers ?? ""}`),
    context: normalize(`${member.company_description ?? ""} ${member.company_name ?? ""} ${member.job_title ?? ""} ${member.service_area ?? ""}`),
  };
  const matchedTerms = terms.filter((term) => Object.values(fields).some((field) => field.includes(term)));
  if (!matchedTerms.length) return null;

  const weighted = terms.reduce((total, term) => total + (fields.service.includes(term) ? 4 : 0) + (fields.segment.includes(term) ? 3 : 0) + (fields.context.includes(term) ? 2 : 0), 0);
  const compatibility = Math.min(96, Math.max(52, Math.round(48 + (weighted / Math.max(terms.length * 4, 1)) * 48)));
  const matchedLabel = matchedTerms.slice(0, 3).join(", ");
  const reason = fields.service.includes(matchedTerms[0])
    ? `A oferta ou serviço cadastrado por este membro contém “${matchedLabel}”.`
    : fields.segment.includes(matchedTerms[0])
      ? `O segmento cadastrado é compatível com “${matchedLabel}”.`
      : `O perfil menciona “${matchedLabel}” na descrição profissional.`;

  return { ...member, compatibility, reason, matchedTerms };
}

export async function findConnections(query: string) {
  const cleanQuery = query.trim().slice(0, 180);
  if (!cleanQuery) return { matches: [] as ConnectionMatch[], error: "" };
  const terms = termsFrom(cleanQuery);
  if (!terms.length) return { matches: [] as ConnectionMatch[], error: "Descreva com um pouco mais de detalhe o que você precisa." };

  // Consulta somente perfis concluídos e visíveis; a ordenação acontece sobre os dados reais retornados pelo diretório.
  const { members, error } = await searchDirectory({});
  if (error) return { matches: [] as ConnectionMatch[], error };
  const matches = members
    .map((member) => matchMember(member, terms))
    .filter((member): member is ConnectionMatch => Boolean(member))
    .sort((a, b) => b.compatibility - a.compatibility || a.full_name?.localeCompare(b.full_name ?? "") || 0)
    .slice(0, 6);
  return { matches, error: "" };
}
