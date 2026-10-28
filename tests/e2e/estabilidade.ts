import type { Page } from "@playwright/test";

/**
 * Esperar a página estar de fato pronta antes de medir ou interagir.
 *
 * A história completa, porque duas conclusões minhas pelo caminho estavam
 * erradas e o erro é instrutivo:
 *
 * 1. `networkidle` dispara cedo demais — entre 35 e 104 ms em 9 execuções
 *    sobre `/`, `/entrar` e `/termos`. Depois dele ainda chegavam eventos
 *    `framenavigated`, o último por volta de 320-720 ms.
 *
 * 2. Primeiro escrevi que o dev server recarregava a página cinco vezes.
 *    Errado: eram 6 eventos, não 6 recargas.
 *
 * 3. Depois escrevi que NENHUM deles era recarga. Também errado — e pior,
 *    porque eu disse ter medido. Os dois instrumentos que usei eram incapazes
 *    de ver uma recarga precoce: uma variável em `window` é reiniciada pelo
 *    `addInitScript` a cada documento, e
 *    `performance.getEntriesByType("navigation").length` vale 1 em qualquer
 *    documento, recarregado ou não. Ambos devolviam "1 documento" tanto se
 *    houvesse recarga quanto se não houvesse.
 *
 * Com `sessionStorage`, que sobrevive à recarga na mesma aba, o fenômeno
 * apareceu de primeira: eram **2 documentos**, e o segundo vinha de
 * `app/pwa-register.tsx` recarregando no `controllerchange` do service worker
 * mesmo na primeira instalação. Essa era a recarga que destruía o contexto de
 * execução no meio das medições — e, muito mais importante que o teste, fazia
 * todo primeiro visitante baixar a landing duas vezes. Corrigido lá.
 *
 * Hoje: 3 eventos `framenavigated`, 1 documento, 2 navegações no mesmo
 * documento (o router hidratando). Medido 3/3.
 *
 * O que fica como prática, independente daquele bug:
 *
 * - O sinal de prontidão é causal, não cronométrico: a fibra do React no
 *   próprio nó, que só existe depois que o React anexou àquele elemento.
 *   Silêncio de rede ou de navegação não prova hidratação — sob a suíte
 *   completa o bundle terminava de executar depois da janela de silêncio e o
 *   clique sumia (1 falha a cada 5, verde em isolamento).
 * - Medir é operação com retentativa, inclusive quando o resultado volta
 *   vazio: zero controles numa rota pública é página que ainda não estava
 *   lá, não defeito do app.
 * - E a lição mais cara: antes de afirmar que mediu, conferir se o
 *   instrumento conseguiria ver o fenômeno caso ele existisse.
 */

/** Espera a página ficar interativa: React anexado e nada mais navegando. */
export async function aguardarPaginaEstavel(page: Page, silencioMs = 600, limiteMs = 20_000) {
  let ultimaNavegacao = Date.now();
  const marcar = (frame: unknown) => {
    if (frame === page.mainFrame()) ultimaNavegacao = Date.now();
  };

  page.on("framenavigated", marcar);
  try {
    await page.waitForLoadState("networkidle");
    await aguardarReactAnexado(page, limiteMs);

    const limite = Date.now() + limiteMs;
    while (Date.now() - ultimaNavegacao < silencioMs) {
      if (Date.now() > limite) throw new Error(`a página seguiu navegando por mais de ${limiteMs} ms`);
      await page.waitForTimeout(100);
    }

    // Tamanho de alvo depende da fonte carregada: medir antes mede o fallback.
    await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  } finally {
    page.off("framenavigated", marcar);
  }
}

async function aguardarReactAnexado(page: Page, limiteMs: number) {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("button,a[href],input,form,main")]
        .slice(0, 200)
        .some((el) => Object.keys(el).some((chave) => chave.startsWith("__react"))),
    undefined,
    { timeout: limiteMs }
  );
}

/** Prova que o React assumiu um controle específico, antes de clicar nele. */
export async function aguardarControleHidratado(page: Page, seletor: string, limiteMs = 20_000) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return !!el && Object.keys(el).some((chave) => chave.startsWith("__react"));
    },
    seletor,
    { timeout: limiteMs }
  );
}

/**
 * Executa uma medição no navegador, refazendo-a se ela não vier estável.
 * Sem isto, o resultado depende de a medição caber entre duas recargas.
 */
export async function medirComRetentativa<T, A = undefined>(
  page: Page,
  fn: (arg: A) => T | Promise<T>,
  arg?: A,
  opcoes: { tentativas?: number; valido?: (resultado: T) => boolean } = {}
): Promise<T> {
  const { tentativas = 4, valido } = opcoes;
  let ultimoProblema = "nenhum";

  for (let i = 0; i < tentativas; i += 1) {
    try {
      await aguardarPaginaEstavel(page);
      // O tipo de `evaluate` não aceita a função genérica diretamente.
      const resultado = (await page.evaluate(fn as never, arg as never)) as T;

      // Um resultado pode ser sintaticamente válido e ainda assim ser medição
      // de uma página que não estava lá — zero controles numa rota pública, por
      // exemplo. Isso é motivo para medir de novo, não para reprovar o app.
      if (!valido || valido(resultado)) return resultado;
      ultimoProblema = "a medição voltou vazia";
      await page.waitForTimeout(400);
    } catch (erro) {
      const texto = erro instanceof Error ? erro.message : String(erro);
      if (!/Execution context was destroyed|Target closed|navigation/i.test(texto)) throw erro;
      ultimoProblema = texto;
    }
  }

  throw new Error(`medição não estabilizou em ${tentativas} tentativas (${ultimoProblema})`);
}
