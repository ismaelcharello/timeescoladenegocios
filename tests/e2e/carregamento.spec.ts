import { expect, test } from "@playwright/test";

/**
 * A primeira visita não pode carregar a página duas vezes.
 *
 * `controllerchange` do service worker dispara em dois casos: quando um shell
 * novo substitui um antigo — e aí recarregar é como o usuário recebe a versão
 * nova — e quando o service worker assume pela primeira vez numa aba sem
 * controlador, quando não há nada a atualizar. `app/pwa-register.tsx`
 * recarregava nos dois, então toda primeira visita custava o dobro: medido em
 * 6 execuções, dev e produção, 2 documentos com 213 a 459 ms de intervalo.
 *
 * Contar isso exige um marcador que SOBREVIVA à recarga. Duas tentativas
 * anteriores falharam exatamente por não sobreviver: uma variável em `window`
 * é reiniciada pelo `addInitScript` a cada documento, e
 * `performance.getEntriesByType("navigation").length` vale 1 em qualquer
 * documento, recarregado ou não. `sessionStorage` sobrevive à recarga na
 * mesma aba, e por isso é o instrumento certo aqui.
 */
test("a primeira visita carrega o documento uma vez só", async ({ page, context }) => {
  await context.addInitScript(() => {
    try {
      const n = Number.parseInt(sessionStorage.getItem("__cargas") ?? "0", 10) + 1;
      sessionStorage.setItem("__cargas", String(n));
    } catch {
      // Sem sessionStorage a contagem fica em 0 e a asserção abaixo acusa.
    }
  });

  await page.goto("/", { waitUntil: "load" });

  // O service worker assume alguns centenas de ms depois do load; a recarga
  // indevida acontecia nessa janela.
  await page.waitForTimeout(3000);

  const estado = await page.evaluate(() => ({
    cargas: Number.parseInt(sessionStorage.getItem("__cargas") ?? "0", 10),
    serviceWorkerAtivo: Boolean(navigator.serviceWorker?.controller),
  }));

  expect(
    estado.cargas,
    `a landing carregou ${estado.cargas} vezes numa visita só — o visitante paga o dobro na primeira abertura`
  ).toBe(1);

  // A guarda não pode ter desligado o service worker: ele é o shell offline.
  expect(estado.serviceWorkerAtivo, "o service worker não assumiu o controle").toBe(true);
});
