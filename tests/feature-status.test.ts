import assert from "node:assert/strict";
import test from "node:test";
const { getFeatureStatus, getFeatureStatusMap, comingSoonResponse, GATED_FEATURES } = await import(new URL("../lib/feature-status.ts", import.meta.url).href);

test("sem variável, toda área controlada fica EM BREVE — o padrão seguro é não mostrar o que não existe", () => {
  const VARS: Record<string, string> = { podcasts: "PODCASTS_STATUS", tutor: "TUTOR_STATUS", conquistas: "ACHIEVEMENTS_STATUS" };
  for (const f of GATED_FEATURES as readonly string[]) delete process.env[VARS[f]];
  assert.deepEqual(getFeatureStatusMap(), { podcasts: "coming_soon", tutor: "coming_soon", conquistas: "coming_soon" });
});

test("só o valor exato 'active' libera; qualquer outra coisa continua em breve", () => {
  process.env.PODCASTS_STATUS = "active";
  process.env.TUTOR_STATUS = "ACTIVE";
  process.env.ACHIEVEMENTS_STATUS = "sim";
  assert.equal(getFeatureStatus("podcasts"), "active");
  assert.equal(getFeatureStatus("tutor"), "coming_soon");
  assert.equal(getFeatureStatus("conquistas"), "coming_soon");
  delete process.env.PODCASTS_STATUS; delete process.env.TUTOR_STATUS; delete process.env.ACHIEVEMENTS_STATUS;
});

test("a resposta de 'em breve' é 503 com Retry-After e mensagem em português", async () => {
  const r = comingSoonResponse("Podcasts");
  assert.equal(r.status, 503);
  assert.equal(r.headers.get("retry-after"), "86400");
  const body = await r.json();
  assert.equal(body.status, "coming_soon");
  assert.match(body.error, /Em breve/);
});
