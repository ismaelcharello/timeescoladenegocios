import { expect, test, type Page } from "@playwright/test";
import { aguardarControleHidratado, aguardarPaginaEstavel, medirComRetentativa } from "./estabilidade";

/**
 * Invariantes de acessibilidade medidas no DOM renderizado, nos cinco viewports.
 *
 * Por que existe: as etapas de design 1 a 6 foram validadas por renderização
 * estática e por token, o que não pega nada do que está aqui. Medindo no
 * navegador apareceram os pontos do carrossel com 8x8 de alvo e um botão
 * decorativo sem rótulo no caminho do teclado. Tamanho de alvo e foco só
 * existem depois do layout: têm de ser medidos, nunca lidos do CSS.
 *
 * Toda medição passa por `medirComRetentativa` porque o dev server recarrega a
 * página sozinho depois do `networkidle` (ver `estabilidade.ts`).
 */

const ROTAS_PUBLICAS = ["/", "/entrar", "/criar-conta", "/recuperar-senha", "/termos"] as const;

/** 24x24 é o nível AA do WCAG 2.5.8; a TIME adota 44px de altura onde cabe. */
const MIN_LARGURA = 24;
const MIN_ALTURA = 24;

const SELETOR_INTERATIVO =
  'a[href],button,input:not([type="hidden"]),select,textarea,summary,[tabindex]:not([tabindex="-1"]),[role="button"],[role="link"]';

type Alvo = { nome: string; classe: string; largura: number; altura: number };

/** Mede todo controle visível, isentando links inline em texto corrido (WCAG 2.5.8). */
function medirAlvos(page: Page, seletor: string): Promise<Alvo[]> {
  return medirComRetentativa(
    page,
    (sel: string) => {
      const nome = (el: Element) =>
        (
          el.getAttribute("aria-label") ||
          (el as HTMLElement).innerText ||
          (el as HTMLInputElement).value ||
          el.getAttribute("placeholder") ||
          ""
        )
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 48) || `<${el.tagName.toLowerCase()}>`;

      const inline = (el: Element) =>
        el.tagName === "A" && !!el.closest("p,li,small,label") && getComputedStyle(el).display.startsWith("inline");

      return [...document.querySelectorAll(sel)]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.opacity !== "0" && !inline(el);
        })
        .map((el) => {
          // O alvo real pode ser maior que o elemento em dois casos: um
          // pseudo-elemento sobreposto que amplia a área clicável, e um input
          // envolvido por <label> (clicar no rótulo aciona o controle). Medir
          // só o rect reprova um checkbox de 16x18 cujo rótulo tem 126x44.
          const base = el.closest("label") ?? el;
          const r = base.getBoundingClientRect();
          const depois = getComputedStyle(el, "::after");
          const sobreposto = depois.content !== "none" && depois.position === "absolute";
          return {
            nome: nome(el),
            classe: (el.className || "").toString().slice(0, 40),
            largura: Math.round(Math.max(r.width, sobreposto ? parseFloat(depois.width) || 0 : 0)),
            altura: Math.round(Math.max(r.height, sobreposto ? parseFloat(depois.height) || 0 : 0)),
          };
        });
    },
    seletor
  );
}

for (const rota of ROTAS_PUBLICAS) {
  test(`${rota}: todo alvo de toque cabe no mínimo e todo controle tem nome`, async ({ page }) => {
    await page.goto(rota, { waitUntil: "domcontentloaded" });

    const alvos = await medirAlvos(page, SELETOR_INTERATIVO);
    expect(alvos.length, `nenhum controle encontrado em ${rota}`).toBeGreaterThan(0);

    const pequenos = alvos.filter((a) => a.largura < MIN_LARGURA || a.altura < MIN_ALTURA);
    expect(
      pequenos,
      `alvos abaixo de ${MIN_LARGURA}x${MIN_ALTURA} em ${rota}:\n` +
        pequenos.map((a) => `  ${a.largura}x${a.altura} — "${a.nome}" (.${a.classe})`).join("\n")
    ).toEqual([]);

    const semNome = alvos.filter((a) => a.nome.startsWith("<"));
    expect(
      semNome,
      `controles sem nome acessível em ${rota}: ${semNome.map((a) => `.${a.classe}`).join(", ")}`
    ).toEqual([]);
  });
}

test("com movimento reduzido nada fica invisível nem segue animando", async ({ page }) => {
  // `test.use({ reducedMotion })` não chegou à página em sessões anteriores;
  // `emulateMedia` chega, e isso é conferido antes de medir qualquer coisa.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const estado = await medirComRetentativa(
    page,
    () => ({
      emulacaoChegou: matchMedia("(prefers-reduced-motion: reduce)").matches,
      // O conteúdo não pode depender de animação para aparecer.
      transparentes: [...document.querySelectorAll<HTMLElement>("[data-motion-item], .reveal-on-scroll")]
        .filter((el) => el.getBoundingClientRect().height > 0 && parseFloat(getComputedStyle(el).opacity) < 0.95)
        .map((el) => el.className.toString().slice(0, 40)),
      animando: [...document.querySelectorAll("*")]
        .filter((el) => {
          const cs = getComputedStyle(el);
          return cs.animationName !== "none" && parseFloat(cs.animationDuration) > 0.1;
        })
        .map((el) => `${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 30)}`),
    }),
    undefined
  );

  expect(estado.emulacaoChegou, "a emulação de movimento reduzido não chegou à página").toBe(true);
  expect(
    estado.transparentes,
    "blocos continuam transparentes com movimento reduzido — o conteúdo some para quem pede menos movimento"
  ).toEqual([]);
  expect(estado.animando, "animações longas continuam rodando com movimento reduzido").toEqual([]);
});

test("o teclado alcança as ações principais da landing e o foco fica visível", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await aguardarPaginaEstavel(page);

  const alcancados: string[] = [];
  const semIndicacao: string[] = [];

  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press("Tab");
    const info = await medirComRetentativa(
      page,
      () => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const anel = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
        return { texto: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40), anel };
      },
      undefined
    );
    if (!info) continue;
    alcancados.push(info.texto);
    if (!info.anel) semIndicacao.push(info.texto);
  }

  expect(semIndicacao, `elementos focados sem indicação visível: ${semIndicacao.join(" | ")}`).toEqual([]);
  expect(
    alcancados.some((t) => /criar conta/i.test(t)),
    `o teclado não alcançou "Criar conta" nos 12 primeiros passos: ${alcancados.join(" | ")}`
  ).toBe(true);
});

test("/entrar mostra erro acessível quando o e-mail é inválido", async ({ page }) => {
  await page.goto("/entrar", { waitUntil: "domcontentloaded" });
  await aguardarPaginaEstavel(page);
  await aguardarControleHidratado(page, "button.auth-submit");

  await page.getByLabel("E-mail").fill("nao-e-um-email");
  await page.locator('input[name="password"]').fill("12345678");
  await page.getByRole("button", { name: "Entrar na TIME" }).click();

  const erro = page.locator('[role="alert"]');
  await expect(erro, "o erro de validação não foi anunciado por role=alert").toBeVisible();
  await expect(erro).toContainText(/e-mail/i);
});
