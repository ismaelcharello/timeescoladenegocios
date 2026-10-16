import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const {
  buildHomeConnectionQuery,
  getHomeGreeting,
  selectHomeCourse,
  selectHomePosts,
  selectNextEvent,
} = await import(new URL("../lib/member-home.ts", import.meta.url).href);

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Home escolhe continuidade antes do primeiro curso disponível", () => {
  const courses = [
    { id: 1, progressPercent: 0, startedLessons: 0 },
    { id: 2, progressPercent: 40, startedLessons: 2 },
  ];
  assert.equal(selectHomeCourse(courses)?.id, 2);
  assert.equal(selectHomeCourse([]), null);
});

test("próximo evento considera somente publicação futura real", () => {
  const now = Date.parse("2030-01-10T12:00:00.000Z");
  const events = [
    { id: 1, startsAt: "2030-01-09T12:00:00.000Z", status: "published" },
    { id: 2, startsAt: "2030-01-11T12:00:00.000Z", status: "draft" },
    { id: 3, startsAt: "2030-01-12T12:00:00.000Z", status: "published" },
  ];
  assert.equal(selectNextEvent(events, now)?.id, 3);
});

test("atividade da Home prioriza oportunidades, ofertas e novidades", () => {
  const posts = [
    { id: 1, category: "general", createdAt: "2030-01-05T00:00:00.000Z" },
    { id: 2, category: "offer", createdAt: "2030-01-02T00:00:00.000Z" },
    { id: 3, category: "opportunity", createdAt: "2030-01-04T00:00:00.000Z" },
    { id: 4, category: "news", createdAt: "2030-01-03T00:00:00.000Z" },
  ];
  assert.deepEqual(selectHomePosts(posts).map((post: { id: number }) => post.id), [3, 4, 2]);
});

test("consulta de conexões deriva somente necessidades reais do perfil", () => {
  const query = buildHomeConnectionQuery({
    full_name: "", avatar_path: "", whatsapp: "", city: "", state: "", job_title: "", company_name: "", segment: "", website_url: "", instagram_url: "", linkedin_url: "", company_description: "", products: "", services: "", target_audience: "", service_area: "", differentiators: "", regions_served: "", offers: "", how_can_help: "",
    looking_for: "designer para site",
    desired_professionals: "especialista em marca",
    desired_referrals: "",
    company_problems: "melhorar conversão",
    desired_partnerships: "agência de tecnologia",
  });
  assert.match(query, /designer para site/);
  assert.match(query, /melhorar conversão/);
  assert.ok(query.length <= 180);
});

test("saudação respeita o horário empresarial de São Paulo", () => {
  assert.equal(getHomeGreeting(new Date("2030-01-10T12:00:00.000Z")), "Bom dia");
  assert.equal(getHomeGreeting(new Date("2030-01-10T20:00:00.000Z")), "Boa tarde");
});

test("Home usa dados protegidos somente após política central", () => {
  const page = source("../app/app/page.tsx");
  assert.match(page, /requireMemberAccess\("\/app"\)/);
  assert.match(page, /access\.permissions\.includes\("networking"\)/);
  assert.match(page, /findConnections\(connectionQuery\)/);
  assert.match(page, /match\.user_id !== user\.id/);
});

test("Home possui estados reais e hierarquia dos três pilares", () => {
  const home = source("../app/app/member-platform.tsx");
  assert.match(home, />APRENDER</);
  assert.match(home, />CONECTAR</);
  assert.match(home, />FAZER NEGÓCIOS</);
  assert.match(home, /Nenhum curso disponível agora/);
  assert.match(home, /Nenhum próximo evento publicado/);
  assert.match(home, /Ainda não encontramos uma conexão compatível/);
  assert.doesNotMatch(home, /personalizada por IA|IA avançada/);
});

test("Home tem contratos responsivos para 360, 390, 768, 1024 e 1440", () => {
  const css = source("../app/platform.css");
  assert.match(css, /\.member-home \{/);
  assert.match(css, /@media \(max-width: 1024px\)/);
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /min-height: 44px/);
  assert.ok(css.lastIndexOf("Bloco 7B — cascade final") > css.lastIndexOf("Bloco 7 — Home"));
});
