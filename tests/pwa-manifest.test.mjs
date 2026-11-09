import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

/**
 * Critérios de instalabilidade do PWA que dá para verificar sem navegador:
 * campos obrigatórios do manifest e ícones que EXISTEM no disco com as
 * dimensões que o manifest declara. Um ícone declarado e ausente, ou com o
 * tamanho errado, faz o Chrome simplesmente não oferecer a instalação, sem erro.
 */
const manifest = (await import(new URL("../app/manifest.ts", import.meta.url).href)).default();

function dimensoesPng(caminho) {
  const b = readFileSync(caminho);
  assert.equal(b.subarray(1, 4).toString(), "PNG", `${caminho} não é PNG`);
  return { largura: b.readUInt32BE(16), altura: b.readUInt32BE(20) };
}

test("o manifest tem o que o navegador exige para oferecer a instalação", () => {
  assert.ok(manifest.name && manifest.short_name);
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.start_url.startsWith("/"));
  assert.equal(manifest.id, "/app", "sem id, mudar o start_url instalaria uma segunda cópia");
  assert.equal(manifest.lang, "pt-BR");
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
});

test("todo ícone declarado existe no disco e tem exatamente o tamanho declarado", () => {
  assert.ok(manifest.icons.length >= 3);
  for (const icone of manifest.icons) {
    const arquivo = new URL(`../public${icone.src}`, import.meta.url);
    assert.ok(existsSync(arquivo), `ícone ausente: ${icone.src}`);
    const [w, h] = icone.sizes.split("x").map(Number);
    assert.deepEqual(dimensoesPng(arquivo), { largura: w, altura: h }, `${icone.src} não tem ${icone.sizes}`);
  }
});

test("há ícone 192 e 512 comuns, e um adaptável (maskable) que NÃO é o mesmo arquivo do comum", () => {
  const por = (tamanho, uso) => manifest.icons.find((i) => i.sizes === tamanho && (i.purpose ?? "any") === uso);
  assert.ok(por("192x192", "any"));
  assert.ok(por("512x512", "any"));
  const adaptavel = por("512x512", "maskable");
  assert.ok(adaptavel, "falta o ícone adaptável");
  assert.notEqual(adaptavel.src, por("512x512", "any").src, "o mesmo arquivo serve aos dois e o Android corta o logo");
});

test("atalhos apontam para rotas que existem", () => {
  assert.ok(manifest.shortcuts.length >= 2);
  for (const atalho of manifest.shortcuts) {
    const rota = atalho.url.replace(/^\//, "");
    assert.ok(existsSync(new URL(`../app/${rota}/page.tsx`, import.meta.url)), `atalho para rota inexistente: ${atalho.url}`);
  }
});

test("o service worker existe, tem manipulador de fetch e a página offline que ele serve", () => {
  const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(sw, /addEventListener\("fetch"/, "sem fetch handler o Chrome não considera o app instalável");
  assert.ok(existsSync(new URL("../app/offline/page.tsx", import.meta.url)));
});
