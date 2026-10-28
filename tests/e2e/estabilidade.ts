import type { Page } from "@playwright/test";

/**
 * Esperar a página estar de fato pronta antes de medir ou interagir.
 *
 * O que foi medido, e o que a medição desmentiu:
 *
 * 1. `networkidle` dispara cedo demais — entre 35 e 104 ms em 9 execuções
 *    sobre `/`, `/entrar` e `/termos`. Depois dele ainda chegam 6 eventos
 *    `framenavigated`, o último por volta de 320-720 ms.
 *
 * 2. Esses eventos NÃO são recargas, ao contrário do que esta nota dizia
 *    antes. Verificado com um marcador de `addInitScript` e
 *    `performance.getEntriesByType("navigation")`: em dev e em produção,
 *    3 execuções cada, sempre 1 documento só e o mesmo documento vivo os
 *    4,5 s inteiros. São navegações no mesmo documento — o router
 *    hidratando. Coerente com o experimento de neutralizar o cliente de HMR,
 *    que fez os eventos sumirem E a página nunca hidratar (4/4 sem fibra do
 *    React): sem cliente, o app não hidrata, então o router nunca roda.
 *
 * 3. Esperar silêncio de navegação não prova hidratação. Sob a suíte completa
 *    o servidor fica mais lento e o bundle termina de executar depois da
 *    janela de silêncio: o clique cai num botão sem `onClick` e some sem erro
 *    — 1 falha a cada 5 execuções, verde em isolamento.
 *
 * Daí o sinal usado aqui ser causal e não cronométrico: a fibra do React no
 * próprio nó, que só existe depois que o React anexou àquele elemento.
 *
 * As falhas "Execution context was destroyed" eram reais mas raras, e a causa
 * exata continua em aberto (não há recarga que as explique). Como medir é
 * barato e repetir é seguro, medir virou operação com retentativa — que
 * também cobre o resultado vazio, porque zero controles numa rota pública é
 * página que ainda não estava lá, não reprovação do app.
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
