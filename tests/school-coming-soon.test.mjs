import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("status da Escola é centralizado e seguro por ambiente", async () => {
  const config = await read("lib/school-status.ts");

  assert.match(config, /import "server-only"/);
  assert.match(config, /process\.env\.SCHOOL_STATUS/);
  assert.match(config, /"coming_soon"/);
  assert.match(config, /: "active"/);
});

test("área do membro exibe Em breve sem carregar conteúdo educacional", async () => {
  const platform = await read("app/app/member-platform.tsx");

  assert.match(platform, /function SchoolComingSoon\(\)/);
  assert.match(platform, /Conteúdo que transforma conhecimento em resultado\./);
  assert.match(platform, /Estamos preparando os primeiros cursos e trilhas/);
  assert.match(platform, /schoolComingSoon \? Promise\.resolve\(\) : fetch\("\/api\/courses"/);
  assert.match(platform, /section === "cursos"[\s\S]*?!canUse\("courses"\)[\s\S]*?schoolComingSoon \? <SchoolComingSoon \/>/);
  assert.match(platform, /activeCourse && !schoolComingSoon/);
});

test("prévia contém exatamente as nove trilhas futuras definidas", async () => {
  const platform = await read("app/app/member-platform.tsx");
  const areas = ["Vendas", "Comunicação", "Automotivo", "Gestão", "Finanças", "Patrimônio", "Bitcoin", "Marketing", "Networking"];

  for (const area of areas) assert.match(platform, new RegExp(`area: "${area}"`));
  const images = [...platform.matchAll(/area: "[^"]+", image: "(\/course-carousel\/[^"]+\.webp)"/g)].map((match) => match[1]);
  assert.equal(images.length, 9);
  assert.equal(new Set(images).size, 9);
});

test("todas as entradas da plataforma recebem o status sem alterar o Admin", async () => {
  const paths = ["app/app/page.tsx", "app/app/cursos/page.tsx", "app/app/comunidade/page.tsx", "app/app/eventos/page.tsx"];
  const pages = await Promise.all(paths.map(read));

  for (const page of pages) {
    assert.match(page, /getSchoolStatus/);
    assert.match(page, /schoolStatus=\{getSchoolStatus\(\)\}/);
  }
});

test("APIs educacionais do membro respeitam a mesma flag sem remover o CRUD Admin", async () => {
  const memberApiPaths = [
    "app/api/courses/route.ts",
    "app/api/lesson-experience/route.ts",
    "app/api/progress/route.ts",
    "app/api/lesson-notes/route.ts",
    "app/api/reviews/route.ts",
  ];
  const apis = await Promise.all(memberApiPaths.map(read));

  for (const api of apis) assert.match(api, /isSchoolComingSoon/);
  assert.match(apis[0], /!admin && isSchoolComingSoon\(\)/);
  assert.match(apis[0], /status: "coming_soon"/);
  assert.match(apis[0], /export async function POST/);
});

test("layout Em breve possui adaptação mobile sem overflow da página", async () => {
  const css = await read("app/platform.css");

  assert.match(css, /\.school-coming-soon\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?overflow:\s*hidden;/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.school-coming-soon\s*\{/);
  assert.match(css, /\.school-coming-soon \.upcoming-course-rail\s*\{[\s\S]*?grid-auto-columns:/);
});

test("carrossel das trilhas avança automaticamente em loop e respeita acessibilidade", async () => {
  const [platform, css] = await Promise.all([
    read("app/app/member-platform.tsx"),
    read("app/platform.css"),
  ]);

  assert.match(platform, /window\.setInterval/);
  assert.match(platform, /4800/);
  assert.match(platform, /rail\.scrollWidth \/ 2/);
  assert.match(platform, /rail\.scrollTo\(\{ left:[\s\S]*?behavior: "auto" \}\)/);
  assert.match(platform, /rail\.scrollTo\(\{ left: normalizedLeft \+ step, behavior: "smooth" \}\)/);
  assert.match(platform, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(platform, /onMouseEnter=\{\(\) => setCarouselPaused\(true\)\}/);
  assert.match(platform, /onPointerDown=\{\(\) => setCarouselPaused\(true\)\}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
