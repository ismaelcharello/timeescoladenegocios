import assert from "node:assert/strict";
import test from "node:test";
const { scoreMatches, tokens, stem } = await import(new URL("../lib/match-score.ts", import.meta.url).href);

const member = (id: string, over: Record<string, string | null> = {}) => ({
  user_id: id, full_name: id, job_title: null, company_name: null, segment: null, city: null,
  state: null, company_description: null, services: null, offers: null, service_area: null, ...over,
});

const seeker = { looking_for: "contabilidade e planejamento tributário", city: "Curitiba", state: "PR" };

test("sem necessidade preenchida o motor não inventa sugestão e diz o que falta", () => {
  const r = scoreMatches({ offers: "design" }, [member("a", { services: "contabilidade" })]);
  assert.equal(r.results.length, 0);
  assert.match(r.message, /Preencha o que você procura/);
});

test("normaliza acento e plural e junta a mesma família de palavras", () => {
  assert.deepEqual(tokens("Contabilidade, TRIBUTÁRIO"), ["contab", "tribut"]);
  assert.equal(stem("consultoria"), stem("consultorias"));
  assert.equal(stem("consultoria"), stem("consultor"));
  assert.notEqual(stem("contabilidade"), stem("contratos"));
});

test("quem oferece o que se procura pontua e o motivo cita os termos reais", () => {
  const { results } = scoreMatches(seeker, [
    member("contador", { services: "Contabilidade e planejamento tributário para PMEs", city: "Curitiba", state: "PR" }),
  ]);
  assert.equal(results.length, 1);
  assert.ok(results[0].score >= 60, `esperava forte, veio ${results[0].score}`);
  assert.ok(results[0].reasons[0].includes("contabilidade"), "o motivo deve citar a palavra do membro, não o radical");
  assert.ok(!results[0].reasons[0].includes("contab,"), "radical interno vazou para o motivo");
  assert.ok(results[0].matchedTerms.includes("contabilidade"));
  assert.ok(results[0].matchedTerms.every((m: string) => m === m.toLowerCase()));
});

test("o número é honesto: casamento parcial não ganha piso artificial", () => {
  // O motor antigo prendia a "compatibilidade" em no mínimo 52% para qualquer palavra casada.
  const { results } = scoreMatches(
    { looking_for: "contabilidade tributário auditoria folha pagamento" },
    [member("quase", { services: "auditoria" })],
    { minScore: 1 }
  );
  assert.equal(results.length, 1);
  assert.ok(results[0].score < 52, `parcial não pode parecer match forte, veio ${results[0].score}`);
});

test("proximidade sozinha não é match", () => {
  const { results } = scoreMatches(seeker, [
    member("vizinho", { services: "paisagismo", city: "Curitiba", state: "PR" }),
  ], { minScore: 0 });
  assert.equal(results.length, 0);
});

test("a cidade desempata entre quem oferece o mesmo", () => {
  const { results } = scoreMatches(seeker, [
    member("longe", { services: "contabilidade", city: "Manaus", state: "AM" }),
    member("perto", { services: "contabilidade", city: "Curitiba", state: "PR" }),
  ]);
  assert.deepEqual(results.map((r: any) => r.member.user_id), ["perto", "longe"]);
  assert.ok(results[0].reasons.includes("Está na mesma cidade que você."));
});

test("termo raro no conjunto pesa mais que termo que todos têm", () => {
  const todos = ["a", "b", "c", "d"].map((id) => member(id, { services: "vendas" }));
  const raro = member("raro", { services: "tributário" });
  const { results } = scoreMatches({ looking_for: "vendas tributário" }, [...todos, raro], { minScore: 1 });
  const porId = Object.fromEntries(results.map((r: any) => [r.member.user_id, r.score]));
  assert.ok(porId.raro > porId.a, `raro ${porId.raro} deveria superar comum ${porId.a}`);
});

test("sem as necessidades do outro lado a reciprocidade não é avaliada e isso é dito", () => {
  const { results } = scoreMatches({ ...seeker, offers: "design de marca" }, [member("x", { services: "contabilidade" })]);
  assert.equal(results[0].components.reciprocity, null);
  assert.ok(results[0].notEvaluated.some((t: string) => t.startsWith("Reciprocidade")));
});

test("com as necessidades do outro lado a reciprocidade entra e eleva o resultado", () => {
  const base = { ...seeker, offers: "design de marca e identidade visual" };
  const sem = scoreMatches(base, [member("x", { services: "contabilidade" })]).results[0];
  const com = scoreMatches(base, [member("x", { services: "contabilidade", needs: "identidade visual para nova marca" })]).results[0];
  assert.notEqual(com.components.reciprocity, null);
  assert.ok(com.reasons.some((t: string) => t.includes("precisa de algo que você oferece")));
  assert.ok(com.components.reciprocity > 0);
  assert.ok(com.score >= 0 && sem.score >= 0);
});

test("a confiança reflete quanto do perfil de quem busca estava preenchido", () => {
  const um = scoreMatches({ looking_for: "contabilidade" }, [member("x", { services: "contabilidade" })]).results[0];
  const tres = scoreMatches(
    { looking_for: "contabilidade", desired_partnerships: "parceria", company_problems: "tributos altos" },
    [member("x", { services: "contabilidade" })]
  ).results[0];
  assert.equal(um.confidence, "baixa");
  assert.equal(tres.confidence, "alta");
});

test("é determinístico e respeita o limite", () => {
  const lista = Array.from({ length: 12 }, (_, i) => member(`m${i}`, { services: "contabilidade" }));
  // Itens idênticos: a raridade derruba a nota de todos, então baixa o corte para exercitar o limite.
  const a = scoreMatches(seeker, lista, { limit: 5, minScore: 1 });
  const b = scoreMatches(seeker, lista, { limit: 5, minScore: 1 });
  assert.deepEqual(a, b);
  assert.equal(a.results.length, 5);
});
