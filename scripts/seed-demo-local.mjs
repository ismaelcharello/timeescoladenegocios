#!/usr/bin/env node
/**
 * Conteúdo de DEMONSTRAÇÃO para o D1 LOCAL. Nunca vai para produção:
 * - só escreve com `--local` (o wrangler recusa remoto sem `--remote`);
 * - todo curso tem slug `demo-*` e professor "[DEMO]";
 * - não está em drizzle/ (migrações vão para produção), de propósito.
 * Uso: node scripts/seed-demo-local.mjs
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";

const cursos = [
  ["demo-vendas", "Vendas e Persuasão de Alta Performance", "vendas", "#7c2cff", "#ff2bd6"],
  ["demo-comunicacao", "Comunicação, Palco & Mídia", "comunicacao", "#2563eb", "#22d3ee"],
  ["demo-lideranca", "Liderança e Gestão de Equipes", "lideranca", "#0f766e", "#84cc16"],
  ["demo-financas", "Finanças para Empresários", "financas", "#b45309", "#facc15"],
  ["demo-patrimonio", "Patrimônio Inteligente", "financas", "#9f1239", "#fb7185"],
  ["demo-bitcoin", "Bitcoin para Empresários", "financas", "#c2410c", "#fdba74"],
];
const modulos = ["Fundamentos", "Método na prática", "Casos e aplicação"];
const aulas = ["Visão geral", "O problema real", "Estrutura do método", "Exercício guiado"];

const esc = (s) => s.replace(/'/g, "''");
const capa = (t, a, b) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='640' height='360' fill='url(#g)'/></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
};

let sql = "";
cursos.forEach(([slug, titulo, cat, a, b], i) => {
  sql += `INSERT OR IGNORE INTO courses (slug,title,description,teacher,category,thumbnail_url,position,status) VALUES ('${slug}','${esc(titulo)}','Curso de demonstração para validar o catálogo.','Professor [DEMO]','${cat}','${esc(capa(titulo, a, b))}',${i},'published');\n`;
  modulos.forEach((m, mi) => {
    sql += `INSERT OR IGNORE INTO course_modules (course_id,title,description,position,status) SELECT id,'${m}','',${mi},'published' FROM courses WHERE slug='${slug}' AND NOT EXISTS (SELECT 1 FROM course_modules cm WHERE cm.course_id=courses.id AND cm.title='${m}');\n`;
    aulas.forEach((a2, ai) => {
      sql += `INSERT INTO lessons (course_id,module_id,module_title,title,description,video_key,duration_seconds,position,status,is_preview) SELECT c.id,(SELECT id FROM course_modules WHERE course_id=c.id AND title='${m}'),'${m}','${a2}','Aula de demonstração.','',${480 + ai * 120},${mi * 10 + ai},'published',${mi === 0 && ai === 0 ? 1 : 0} FROM courses c WHERE c.slug='${slug}' AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.course_id=c.id AND l.module_title='${m}' AND l.title='${a2}');\n`;
    });
  });
});

const arq = "/tmp/seed-demo-local.sql";
writeFileSync(arq, sql);
try {
  execFileSync("npx", ["wrangler", "d1", "execute", "time-escola-db", "--local", "--file", arq], { stdio: "inherit" });
} finally {
  unlinkSync(arq);
}
console.log(`\nSemeados ${cursos.length} cursos [DEMO] no D1 LOCAL.`);
