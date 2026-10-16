import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const titles = [
  "Vendas e Persuasão de Alta Performance",
  "Comunicação, Palco & Mídia",
  "Vendas Automotivas de Alta Performance",
  "Liderança e Gestão de Equipes",
  "Finanças para Empresários",
  "Patrimônio Inteligente",
  "Bitcoin para Empresários",
  "Posicionamento e Crescimento",
  "Conexões que Geram Negócios",
];

test("landing usa um único carrossel institucional com nove cursos", async () => {
  const [page, carousel] = await Promise.all([
    read("app/page.tsx"),
    read("app/course-carousel.tsx"),
  ]);

  assert.match(page, /<CourseCarousel\s+schoolStatus=\{schoolStatus\}\s*\/>/);
  assert.doesNotMatch(page, /landing-course-list|landing-course-card/);
  assert.doesNotMatch(page, /Mamá Brito|Deivison Ferreira/i);
  for (const title of titles) assert.match(carousel, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(carousel, /Mamá Brito|Deivison Ferreira/i);

  const images = [...carousel.matchAll(/image:\s*"(\/course-carousel\/[^\"]+\.webp)"/g)].map((match) => match[1]);
  assert.equal(images.length, 9);
  assert.equal(new Set(images).size, 9);
});

test("landing identifica as formações como futuras quando a Escola está em breve", async () => {
  const carousel = await read("app/course-carousel.tsx");

  assert.match(carousel, /schoolStatus === "coming_soon"/);
  assert.match(carousel, /PRÓXIMAS FORMAÇÕES/);
  assert.match(carousel, /course-carousel-status/);
  assert.match(carousel, /EM BREVE/);
  assert.match(carousel, /Ver próximas formações/);
});

test("carrossel possui controles reais por setas, dots, teclado e swipe nativo", async () => {
  const carousel = await read("app/course-carousel.tsx");

  assert.match(carousel, /onClick=\{\(\) => goTo\(activeIndex - 1\)\}/);
  assert.match(carousel, /onClick=\{\(\) => goTo\(activeIndex \+ 1\)\}/);
  assert.match(carousel, /onClick=\{\(\) => goTo\(index\)\}/);
  assert.match(carousel, /ArrowLeft/);
  assert.match(carousel, /ArrowRight/);
  assert.match(carousel, /onScroll=\{updateFromScroll\}/);
  assert.match(carousel, /scrollTo\(/);
  assert.match(carousel, /aria-live="polite"/);
});

test("contrato responsivo remove preview lateral no tablet e mobile", async () => {
  const css = await read("app/globals.css");

  assert.match(css, /\.course-carousel-slide\s*\{[\s\S]*?flex:\s*0 0 calc\(100% - 198px\)/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.course-carousel-slide\s*\{[\s\S]*?flex-basis:\s*100%/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.course-carousel-card\s*\{[\s\S]*?flex-direction:\s*column/);
  assert.match(css, /scroll-snap-type:\s*x mandatory/);
  assert.match(css, /overflow-x:\s*auto/);
});
