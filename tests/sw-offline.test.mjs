import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Executa public/sw.js num ambiente simulado e dispara os eventos de verdade.
 * Não é um teste de texto do código: o que se afirma é o COMPORTAMENTO — o que
 * o worker pré-carrega e o que ele devolve quando a rede cai.
 */
function carregarWorker() {
  const codigo = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  const escutas = {};
  const armazenados = new Map(); // nome do cache -> Map(caminho -> resposta)
  const respostaDe = (corpo) => ({ corpo });

  const caches = {
    open: async (nome) => {
      if (!armazenados.has(nome)) armazenados.set(nome, new Map());
      const mapa = armazenados.get(nome);
      return {
        addAll: async (urls) => { for (const u of urls) mapa.set(u, respostaDe("pré-carregado:" + u)); },
        put: async (req, res) => mapa.set(new URL(req.url).pathname, res),
        match: async (req) => mapa.get(typeof req === "string" ? req : new URL(req.url).pathname),
      };
    },
    keys: async () => [...armazenados.keys()],
    delete: async (nome) => armazenados.delete(nome),
    match: async (req) => {
      const chave = typeof req === "string" ? req : new URL(req.url).pathname;
      for (const mapa of armazenados.values()) if (mapa.has(chave)) return mapa.get(chave);
      return undefined;
    },
  };

  const self = {
    location: { origin: "https://time.test" },
    addEventListener: (tipo, fn) => { escutas[tipo] = fn; },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };
  const Response = { error: () => ({ corpo: "erro-de-rede" }) };
  new Function("self", "caches", "Response", "URL", codigo)(self, caches, Response, URL);

  const disparar = async (tipo, evento) => {
    let promessa;
    escutas[tipo]({ ...evento, waitUntil: (p) => { promessa = p; }, respondWith: (p) => { promessa = p; } });
    return promessa;
  };
  return { disparar, armazenados };
}

const navegacao = (caminho) => ({ request: { method: "GET", url: "https://time.test" + caminho, mode: "navigate" } });

test("a instalação pré-carrega a página offline e os ícones, inclusive o maskable", async () => {
  const sw = carregarWorker();
  await sw.disparar("install", {});
  const [cache] = [...sw.armazenados.values()];
  for (const item of ["/offline", "/", "/icons/time-maskable-512.png"]) {
    assert.ok(cache.has(item), `${item} deveria estar pré-carregado`);
  }
});

test("sem rede, uma navegação mostra a página 'você está offline', não a landing de vendas", async () => {
  const sw = carregarWorker();
  await sw.disparar("install", {});
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  const resposta = await sw.disparar("fetch", navegacao("/app/cursos"));
  assert.equal(resposta.corpo, "pré-carregado:/offline");
  assert.notEqual(resposta.corpo, "pré-carregado:/", "caiu na landing: o membro logado acharia que o app quebrou");
});

test("com rede, a navegação passa direto, sem servir cache velho", async () => {
  const sw = carregarWorker();
  await sw.disparar("install", {});
  globalThis.fetch = async () => ({ corpo: "do-servidor" });
  const resposta = await sw.disparar("fetch", navegacao("/app"));
  assert.equal(resposta.corpo, "do-servidor");
});

test("chamadas de API nunca são interceptadas nem guardadas (dado de membro não pode vazar em aparelho compartilhado)", async () => {
  const sw = carregarWorker();
  await sw.disparar("install", {});
  let interceptou = false;
  const escutaOriginal = { respondWith: () => { interceptou = true; } };
  const evento = { request: { method: "GET", url: "https://time.test/api/community", mode: "cors" }, ...escutaOriginal };
  await sw.disparar("fetch", evento);
  assert.equal(interceptou, false);
});

test("ao ativar, caches de versões antigas são removidos", async () => {
  const sw = carregarWorker();
  await sw.disparar("install", {});
  sw.armazenados.set("time-shell-v1", new Map());
  await sw.disparar("activate", {});
  assert.ok(![...sw.armazenados.keys()].includes("time-shell-v1"));
  assert.ok([...sw.armazenados.keys()].some((n) => /^time-shell-v\d+$/.test(n)));
});
