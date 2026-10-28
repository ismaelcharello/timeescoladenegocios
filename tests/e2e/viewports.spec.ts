import { expect, test } from "@playwright/test";

/**
 * Contrato responsivo das telas públicas, nos cinco viewports de
 * playwright.config.ts.
 *
 * Duas lições que custaram caro e estão codificadas aqui:
 *
 * 1. `domcontentloaded` devolve o HTML do servidor, não a página hidratada.
 *    Clicar nesse instante é engolido: o botão existe, o onClick ainda não
 *    está ligado. Medido contra o dev server — 3 de 3 rodadas com o clique
 *    sem efeito sem a espera, 3 de 3 funcionando com ela. Contra o staging
 *    publicado passava por sorte de cronometragem, o que dava confiança
 *    falsa. Interação só depois de `aguardarHidratacao`.
 *
 * 2. Afirmar o rótulo exato de um CTA acopla o teste à redação. No celular a
 *    nav colapsa e esconde "Criar conta" enquanto o hero mostra "Criar minha
 *    conta na TIME" — mesma intenção, rótulo diferente, teste quebrado sem
 *    nada de errado na página. Aqui se afirma que existe um caminho visível
 *    para cada intenção, não a palavra usada.
 */

/** O clique precisa de JS ligado; sem isto o teste mede o HTML inerte. */
async function aguardarHidratacao(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
}

/** Primeiro elemento de fato visível entre os que casam com o padrão. */
function visivel(page: import("@playwright/test").Page, padrao: RegExp) {
  return page.getByRole("link", { name: padrao }).filter({ visible: true }).first();
}

for (const route of ["/", "/entrar", "/criar-conta"] as const) {
  test(`${route} renderiza sem overflow e mantém ações essenciais`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await aguardarHidratacao(page);

    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(
      overflow.documentWidth,
      `overflow horizontal em ${route}`
    ).toBeLessThanOrEqual(overflow.viewportWidth + 1);

    if (route === "/") {
      // Intenção, não redação: cadastro e entrada precisam ter um caminho
      // visível em qualquer largura, com o rótulo que a composição escolher.
      await expect(
        visivel(page, /criar (conta|minha conta)/i),
        "nenhum caminho visível para criar conta"
      ).toBeVisible();
      await expect(
        visivel(page, /entrar|já sou membro/i),
        "nenhum caminho visível para entrar"
      ).toBeVisible();
      return;
    }

    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "password");

    const passwordToggle = page.getByRole("button", { name: "Mostrar" });
    await expect(passwordToggle).toBeVisible();
    await passwordToggle.click();
    await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "text");

    const submitName = route === "/entrar" ? "Entrar na TIME" : "Criar minha conta";
    await expect(page.getByRole("button", { name: submitName })).toBeVisible();
  });
}
