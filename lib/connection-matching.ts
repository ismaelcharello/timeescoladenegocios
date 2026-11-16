import { getDirectoryProfile, searchDirectory, type DirectoryMember } from "@/lib/member-directory";
import { scoreMatches, type MatchComponent, type MatchSeeker } from "@/lib/match-score";

/**
 * Conexões sugeridas para um membro, sobre o motor de lib/match-score.ts.
 *
 * O motor anterior contava palavras da busca em três campos e prendia a nota
 * entre 52% e 96%: qualquer palavra casada parecia match forte. Este usa o
 * perfil inteiro de quem busca (necessidade, oferta, público, cidade) e
 * explica cada ponto.
 *
 * Reciprocidade: a busca do diretório não traz o que os outros membros
 * PROCURAM, mas o perfil público de cada membro traz (`looking_for`,
 * `desired_partnerships`…) — o mesmo dado que qualquer membro logado já vê
 * na página de perfil. Por isso o match roda em duas passadas: a primeira
 * sobre a lista, a segunda só sobre os finalistas, com as necessidades deles
 * carregadas. Não expõe nada novo e não precisa de migração.
 */
export type ConnectionMatch = DirectoryMember & {
  /** 0 a 100, sem piso nem teto artificial. */
  compatibility: number;
  /** O motivo principal, para listas compactas. */
  reason: string;
  reasons: string[];
  matchedTerms: string[];
  confidence: "alta" | "media" | "baixa";
  notEvaluated: string[];
  components: Record<MatchComponent, number | null>;
};

const FINALISTAS = 12;

function needsOf(profile: { looking_for?: string | null; desired_professionals?: string | null; desired_partnerships?: string | null; desired_referrals?: string | null } | null) {
  if (!profile) return "";
  return [profile.looking_for, profile.desired_professionals, profile.desired_partnerships, profile.desired_referrals].filter(Boolean).join(" ");
}

export async function findConnections(
  query: string,
  seeker?: MatchSeeker | null,
  options: { excludeUserId?: string; limit?: number } = {},
): Promise<{ matches: ConnectionMatch[]; error: string; hint: string }> {
  const cleanQuery = query.trim().slice(0, 180);
  const { excludeUserId, limit = 6 } = options;

  // A busca digitada é a necessidade do momento; o resto do perfil (oferta,
  // público, cidade) continua valendo para reciprocidade e alcance.
  const quemBusca: MatchSeeker = { ...(seeker ?? {}), ...(cleanQuery ? { looking_for: cleanQuery, desired_professionals: "", desired_partnerships: "", company_problems: "", desired_referrals: "" } : {}) };

  const { members, error } = await searchDirectory({});
  if (error) return { matches: [], error, hint: "" };
  const candidatos = members.filter((m) => m.user_id !== excludeUserId);

  const primeira = scoreMatches(quemBusca, candidatos, { limit: FINALISTAS, minScore: 1 });
  if (primeira.message) return { matches: [], error: "", hint: primeira.message };

  // Segunda passada: só os finalistas ganham as necessidades carregadas.
  const enriquecidos = await Promise.all(
    primeira.results.map(async ({ member }) => ({ ...member, needs: needsOf(await getDirectoryProfile(member.user_id)) })),
  );
  const segunda = scoreMatches(quemBusca, enriquecidos, { limit });

  return {
    error: "",
    hint: "",
    matches: segunda.results.map((r) => ({
      ...r.member,
      compatibility: r.score,
      reason: r.reasons[0] ?? "Perfil relacionado ao que você procura.",
      reasons: r.reasons,
      matchedTerms: r.matchedTerms,
      confidence: r.confidence,
      notEvaluated: r.notEvaluated,
      components: r.components,
    })),
  };
}
