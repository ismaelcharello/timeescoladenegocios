/**
 * Motor de match entre membros: pontuação explicável, determinística e pura.
 *
 * Princípios (decididos com o dono em 2026-10-28):
 * - Regras transparentes. Cada ponto vem de um componente nomeado e cada motivo
 *   cita os termos que de fato casaram. Sem modelo, sem custo por uso e sem
 *   dado de membro saindo para terceiros.
 * - Honestidade do número. Não há piso nem teto artificial. O motor anterior
 *   prendia a "compatibilidade" entre 52% e 96%, então qualquer palavra casada
 *   parecia um match forte. Aqui 0 é 0.
 * - Só entra no cálculo o que existe. O diretório não expõe as necessidades dos
 *   OUTROS membros (privacidade por desenho), então a reciprocidade só entra
 *   quando `needs` vem preenchido. Quando falta, o peso é redistribuído e o
 *   resultado diz que a reciprocidade não foi avaliada, em vez de fingir.
 *
 * Esta função é pura: nada de rede, relógio ou aleatoriedade. Mesma entrada,
 * mesma saída — o que a torna testável.
 */

/** O que o membro que pede o match diz que precisa e oferece (perfil próprio). */
export type MatchSeeker = {
  looking_for?: string | null;
  desired_professionals?: string | null;
  desired_partnerships?: string | null;
  company_problems?: string | null;
  desired_referrals?: string | null;
  offers?: string | null;
  services?: string | null;
  products?: string | null;
  target_audience?: string | null;
  segment?: string | null;
  city?: string | null;
  state?: string | null;
  regions_served?: string | null;
};

/** O que o diretório expõe de cada candidato (ver DirectoryMember). */
export type MatchCandidate = {
  user_id: string;
  full_name?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  segment?: string | null;
  city?: string | null;
  state?: string | null;
  company_description?: string | null;
  services?: string | null;
  offers?: string | null;
  service_area?: string | null;
  /** Só preenchido se o diretório passar a expor as necessidades do candidato. */
  needs?: string | null;
};

export type MatchComponent = "need_fit" | "reach" | "audience_fit" | "reciprocity";

export type MatchResult<T extends MatchCandidate = MatchCandidate> = {
  member: T;
  /** 0 a 100, sem piso nem teto artificial. */
  score: number;
  components: Record<MatchComponent, number | null>;
  matchedTerms: string[];
  reasons: string[];
  /** Quanto do perfil de quem busca estava preenchido para sustentar o resultado. */
  confidence: "alta" | "media" | "baixa";
  /** Componentes que não puderam ser avaliados e por quê — mostrado, nunca escondido. */
  notEvaluated: string[];
};

const WEIGHTS: Record<MatchComponent, number> = {
  need_fit: 0.55,
  reciprocity: 0.3,
  audience_fit: 0.15,
  reach: 0.15,
};

const STOP_WORDS = new Set([
  "para", "com", "que", "uma", "uns", "umas", "dos", "das", "nos", "nas", "por", "pelo", "pela",
  "mais", "muito", "muita", "como", "sobre", "entre", "ser", "ter", "tem", "sua", "seu", "suas",
  "seus", "meu", "minha", "nosso", "nossa", "esta", "este", "isso", "essa", "esse", "quando",
  "onde", "aqui", "tudo", "todos", "todas", "cada", "fazer", "preciso", "procuro", "quero",
  "busco", "alguem", "pessoa", "pessoas", "empresa", "empresas", "profissional", "profissionais",
  "servico", "servicos", "area", "areas", "negocio", "negocios", "cliente", "clientes",
]);

export function normalize(value: string | null | undefined): string {
  return (value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Radical leve para português: tira o plural e agrupa palavras da mesma família
 * pelas primeiras 6 letras ("consultoria" e "consultor" -> "consul"). É
 * propositalmente simples: um stemmer agressivo junta palavras que não têm
 * relação e produz motivo falso, que é pior que perder um casamento.
 */
export function stem(word: string): string {
  const base = word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word;
  return base.length >= 7 ? base.slice(0, 6) : base;
}

export function tokens(text: string | null | undefined): string[] {
  const seen = new Set<string>();
  for (const raw of normalize(text).split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOP_WORDS.has(raw) || /^\d+$/.test(raw)) continue;
    seen.add(stem(raw));
  }
  return [...seen];
}

/**
 * Radical -> palavra como o membro escreveu (minúscula, com acento). Os motivos
 * mostram palavras do membro, não o radical interno: "tribut" não diz nada a
 * quem lê, "tributário" diz.
 */
function displayWords(...texts: Array<string | null | undefined>): Map<string, string> {
  const map = new Map<string, string>();
  for (const text of texts) {
    for (const raw of (text ?? "").toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (!raw) continue;
      const key = stem(normalize(raw));
      if (key.length >= 3 && !map.has(key)) map.set(key, raw);
    }
  }
  return map;
}

function join(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Raridade do termo no conjunto de candidatos: termo que todo mundo tem pesa pouco. */
function buildIdf(corpus: string[][]): (term: string) => number {
  const df = new Map<string, number>();
  for (const doc of corpus) for (const term of new Set(doc)) df.set(term, (df.get(term) ?? 0) + 1);
  const n = Math.max(corpus.length, 1);
  return (term) => Math.log(1 + n / (1 + (df.get(term) ?? 0)));
}

type Covered = { score: number; matched: string[] };

/**
 * Fração do peso das necessidades coberta por um conjunto de campos do outro lado.
 * `fields` vem do mais para o menos relevante; um termo conta pelo melhor campo.
 */
function coverage(
  wanted: string[],
  fields: Array<{ tokens: Set<string>; weight: number }>,
  idf: (t: string) => number
): Covered {
  let total = 0;
  let got = 0;
  const matched: string[] = [];
  for (const term of wanted) {
    const w = idf(term);
    total += w;
    const best = Math.max(0, ...fields.map((f) => (f.tokens.has(term) ? f.weight : 0)));
    if (best > 0) {
      got += w * best;
      matched.push(term);
    }
  }
  return { score: total > 0 ? got / total : 0, matched };
}

function reachScore(seeker: MatchSeeker, c: MatchCandidate): number {
  const myCity = normalize(seeker.city);
  const myState = normalize(seeker.state);
  const theirCity = normalize(c.city);
  const theirState = normalize(c.state);
  if (myCity && theirCity && myCity === theirCity) return 1;
  const served = normalize(seeker.regions_served);
  if (served && ((theirCity && served.includes(theirCity)) || (theirState && served.includes(theirState)))) return 0.8;
  const theirArea = normalize(c.service_area);
  if (theirArea && ((myCity && theirArea.includes(myCity)) || (myState && theirArea.includes(myState)))) return 0.6;
  if (myState && theirState && myState === theirState) return 0.5;
  return 0;
}

/** Quantos campos de NECESSIDADE de quem busca estão preenchidos. */
function needFieldCount(s: MatchSeeker): number {
  return [s.looking_for, s.desired_professionals, s.desired_partnerships, s.company_problems, s.desired_referrals].filter(
    (v) => tokens(v).length > 0
  ).length;
}

export function scoreMatches<T extends MatchCandidate>(
  seeker: MatchSeeker,
  candidates: T[],
  options: { minScore?: number; limit?: number } = {}
): { results: MatchResult<T>[]; message: string } {
  const { minScore = 12, limit = 6 } = options;

  const myNeeds = tokens(
    join(seeker.looking_for, seeker.desired_professionals, seeker.desired_partnerships, seeker.company_problems, seeker.desired_referrals)
  );
  const myOffers = tokens(join(seeker.offers, seeker.services, seeker.products));
  const myAudience = tokens(seeker.target_audience);

  if (!myNeeds.length) {
    return {
      results: [],
      message: "Preencha o que você procura no seu perfil para receber conexões sugeridas.",
    };
  }

  const docs = candidates.map((c) => ({
    offer: new Set(tokens(join(c.offers, c.services))),
    segment: new Set(tokens(c.segment)),
    context: new Set(tokens(join(c.company_description, c.job_title, c.company_name))),
    needs: new Set(tokens(c.needs)),
  }));
  const idf = buildIdf(docs.map((d) => [...d.offer, ...d.segment, ...d.context]));

  const show = displayWords(
    seeker.looking_for, seeker.desired_professionals, seeker.desired_partnerships,
    seeker.company_problems, seeker.desired_referrals, seeker.target_audience,
    ...candidates.map((c) => c.needs)
  );
  const label = (terms: string[]) => terms.map((t) => show.get(t) ?? t);

  const filled = needFieldCount(seeker);
  const confidence: MatchResult["confidence"] = filled >= 3 ? "alta" : filled === 2 ? "media" : "baixa";

  const results: MatchResult<T>[] = [];

  candidates.forEach((member, i) => {
    const d = docs[i];

    const need = coverage(
      myNeeds,
      [
        { tokens: d.offer, weight: 1 },
        { tokens: d.segment, weight: 0.8 },
        { tokens: d.context, weight: 0.5 },
      ],
      idf
    );

    const audience = myAudience.length
      ? coverage(myAudience, [{ tokens: d.segment, weight: 1 }, { tokens: d.context, weight: 0.6 }], idf)
      : null;

    const reciprocity =
      d.needs.size && myOffers.length ? coverage([...d.needs], [{ tokens: new Set(myOffers), weight: 1 }], idf) : null;

    const reach = reachScore(seeker, member);

    const components: Record<MatchComponent, number | null> = {
      need_fit: need.score,
      reach,
      audience_fit: audience ? audience.score : null,
      reciprocity: reciprocity ? reciprocity.score : null,
    };

    // Só entra na média o que pôde ser avaliado; o peso dos ausentes é redistribuído.
    let weighted = 0;
    let weightSum = 0;
    for (const key of Object.keys(components) as MatchComponent[]) {
      const value = components[key];
      if (value === null) continue;
      weighted += WEIGHTS[key] * value;
      weightSum += WEIGHTS[key];
    }
    const score = weightSum > 0 ? Math.round((weighted / weightSum) * 100) : 0;

    // Proximidade sozinha não é match: sem necessidade, público ou reciprocidade casando, descarta.
    const hasSubstance = need.score > 0 || (audience?.score ?? 0) > 0 || (reciprocity?.score ?? 0) > 0;
    if (!hasSubstance || score < minScore) return;

    const reasons: string[] = [];
    if (need.matched.length) {
      reasons.push(`O que ele(a) oferece ou atua cobre o que você procura: ${label(need.matched.slice(0, 4)).join(", ")}.`);
    }
    if (reciprocity && reciprocity.matched.length) {
      reasons.push(`Ele(a) precisa de algo que você oferece: ${label(reciprocity.matched.slice(0, 3)).join(", ")}.`);
    }
    if (audience && audience.matched.length) {
      reasons.push(`Atua no público que você atende: ${label(audience.matched.slice(0, 3)).join(", ")}.`);
    }
    if (reach >= 1) reasons.push("Está na mesma cidade que você.");
    else if (reach >= 0.5) reasons.push("Atende a sua região.");

    const notEvaluated: string[] = [];
    if (components.reciprocity === null) {
      notEvaluated.push(
        d.needs.size === 0
          ? "Reciprocidade: as necessidades dos outros membros não são expostas no diretório."
          : "Reciprocidade: você não preencheu o que oferece."
      );
    }
    if (components.audience_fit === null) notEvaluated.push("Público: você não preencheu o público que atende.");

    results.push({
      member,
      score,
      components,
      matchedTerms: label([...new Set([...need.matched, ...(reciprocity?.matched ?? []), ...(audience?.matched ?? [])])]),
      reasons,
      confidence,
      notEvaluated,
    });
  });

  results.sort((a, b) => b.score - a.score || (a.member.full_name ?? "").localeCompare(b.member.full_name ?? ""));
  return { results: results.slice(0, limit), message: "" };
}
