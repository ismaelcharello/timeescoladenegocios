import type { Page } from "@playwright/test";

/**
 * Esperar a página estar de fato pronta antes de medir ou interagir.
 *
 * Três coisas foram medidas contra o dev server, e cada uma derrubou uma
 * suposição confortável:
 *
 * 1. `networkidle` dispara cedo demais. Em 9 execuções sobre `/`, `/entrar` e
 *    `/termos` ele veio entre 35 e 104 ms, mas o cliente do Vite ainda
 *    recarregava a página mais cinco vezes, a última entre 316 e 718 ms.
 * 2. Esperar silêncio de navegação também não basta. Sob a suíte completa o
 *    servidor fica mais lento e o bundle termina de executar depois da janela
 *    de silêncio: o clique cai num botão sem `onClick` e some sem erro — 1
 *    falha a cada 5 execuções, verde em isolamento.
 * 3. As recargas não são ruído descartável: neutralizar o cliente de HMR
 *    elimina as recargas e a página **nunca hidrata** (4 de 4 execuções sem
 *    fibra do React, clique perdido). Elas fazem parte de como o dev server
 *    chega à página viva.
 *
 * Daí o sinal usado aqui ser causal e não cronométrico: a fibra do React no
 * próprio nó, que só existe depois que o React anexou. E, como a página pode
 * recarregar de novo no meio de uma medição, medir é uma operação com
 * retentativa — contexto destruído significa "recarregou, meça outra vez".
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
      if (Date.now() > limite) throw new Error(`a página seguiu recarregando por mais de ${limiteMs} ms`);
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
 * Executa uma medição no navegador, refazendo-a se a página recarregar no meio.
 * Sem isto, o resultado depende de a medição caber entre duas recargas.
 */
export async function medirComRetentativa<T, A = undefined>(
  page: Page,
  fn: (arg: A) => T | Promise<T>,
  arg?: A,
  tentativas = 4
): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i += 1) {
    try {
      await aguardarPaginaEstavel(page);
      // O tipo de `evaluate` não aceita a função genérica diretamente.
      return (await page.evaluate(fn as never, arg as never)) as T;
    } catch (erro) {
      ultimoErro = erro;
      const texto = erro instanceof Error ? erro.message : String(erro);
      if (!/Execution context was destroyed|Target closed|navigation/i.test(texto)) throw erro;
    }
  }
  throw new Error(`a página recarregou em todas as ${tentativas} tentativas de medição: ${String(ultimoErro)}`);
}
