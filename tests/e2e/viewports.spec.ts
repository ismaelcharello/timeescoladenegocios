import { expect, test } from "@playwright/test";

for (const route of ["/", "/entrar", "/criar-conta"] as const) {
  test(`${route} renderiza sem overflow e mantém ações essenciais`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });

    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);

    if (route === "/") {
      await expect(page.getByRole("link", { name: /Criar conta/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /Entrar/i })).toBeVisible();
      return;
    }

    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    const passwordToggle = page.getByRole("button", { name: "Mostrar" });
    await expect(passwordToggle).toBeVisible();
    await passwordToggle.click();
    await expect(page.locator('input[type="text"][name="password"]')).toBeVisible();

    const submitName = route === "/entrar" ? "Entrar na TIME" : "Criar minha conta";
    await expect(page.getByRole("button", { name: submitName })).toBeVisible();
  });
}
