import { expect, test, type Page } from "@playwright/test";
import { aguardarPaginaEstavel } from "./estabilidade";

/**
 * Fluxos da área interna, LOGADO, no navegador. É o critério de "pronto" do
 * plano de ação: um teste que executa o fluxo e confere o resultado, não um
 * `assert.match` no código-fonte.
 *
 * Só roda no dev local, onde /dev/login existe (lib/dev-identity.ts). Contra
 * produção a rota responde 404 e os testes são pulados, de propósito.
 * Precisa do conteúdo de demonstração: `node scripts/seed-demo-local.mjs`, e da
 * escola ativa: `SCHOOL_STATUS=active` em `.dev.vars`.
 */

async function entrar(page: Page, como: "membro" | "admin", retorno: string) {
  const resposta = await page.goto(`/dev/login?como=${como}&retorno=${encodeURIComponent(retorno)}`);
  return resposta;
}

test.beforeEach(async ({ page }) => {
  const sonda = await page.request.get("/dev/login", { maxRedirects: 0 });
  test.skip(sonda.status() === 404, "identidade de teste indisponível: só existe no dev local");
});

/** Contraste WCAG entre duas cores "rgb(...)". */
const CONTRASTE = `(a, b) => {
  const lum = (c) => { const [r,g,bl] = c.match(/[\\d.]+/g).slice(0,3).map(Number).map(v => { v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*r+.7152*g+.0722*bl; };
  const x = lum(a), y = lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}`;

const ROTAS_DO_MEMBRO = ["/app", "/app/cursos", "/app/comunidade", "/app/eventos", "/app/beneficios", "/app/ouvidoria"];

for (const rota of ROTAS_DO_MEMBRO) {
  test(`${rota} abre logado como membro, sem erro de JavaScript e sem rolagem lateral`, async ({ page }) => {
    const erros: string[] = [];
    page.on("pageerror", (e) => erros.push(e.message));

    await entrar(page, "membro", rota);
    await aguardarPaginaEstavel(page);

    expect(new URL(page.url()).pathname, "foi redirecionado para fora da rota").toBe(rota);
    const estado = await page.evaluate(() => ({
      h1: document.querySelector("h1")?.textContent?.trim() ?? "",
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    expect(estado.h1.length, "a rota abriu sem título").toBeGreaterThan(0);
    expect(estado.overflow, "rolagem lateral").toBe(false);
    expect(erros, `erros de JavaScript em ${rota}`).toEqual([]);
  });
}

test("catálogo de cursos: títulos legíveis e categorias sem slug cru", async ({ page }) => {
  await entrar(page, "membro", "/app/cursos");
  await aguardarPaginaEstavel(page);
  await page.waitForSelector(".course-streaming-hero h2");

  const r = await page.evaluate(`(() => {
    const contraste = ${CONTRASTE};
    const fundo = (el) => { let p = el; while (p) { const c = getComputedStyle(p).backgroundColor; if (c !== "rgba(0, 0, 0, 0)") return c; p = p.parentElement; } return "rgb(255,255,255)"; };
    const hero = document.querySelector(".course-streaming-hero h2");
    const card = document.querySelector(".member-course-card strong");
    return {
      heroContraste: contraste(getComputedStyle(hero).color, fundo(hero)),
      // O título do card fica sobre a CAPA (imagem com gradiente escuro), então o
      // ancestral com cor sólida é a seção clara atrás da imagem e não serve de
      // base. O que se afirma é que o texto é quase branco: contraste contra
      // preto puro acima de 12.
      cardContraste: card ? contraste(getComputedStyle(card).color, "rgb(0, 0, 0)") : null,
      chips: [...document.querySelectorAll('[aria-label="Filtrar por categoria"] button')].map(b => b.textContent.trim()),
    };
  })()`) as { heroContraste: number; cardContraste: number | null; chips: string[] };

  expect(r.heroContraste, "título do destaque ilegível sobre o fundo escuro").toBeGreaterThanOrEqual(4.5);
  if (r.cardContraste !== null) expect(r.cardContraste, "título do card não é claro o bastante para a capa escura").toBeGreaterThanOrEqual(12);
  for (const chip of r.chips) {
    expect(chip, `categoria "${chip}" aparece como slug cru`).not.toMatch(/^[a-z]+$/);
  }
});

test("membro com perfil incompleto vê o motivo certo ao abrir um curso", async ({ page }) => {
  await entrar(page, "membro", "/app/cursos");
  await aguardarPaginaEstavel(page);
  await page.getByRole("button", { name: "Começar agora" }).click();

  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  // Antes dizia "Ative sua participação" e mandava ao checkout quem já é membro.
  await expect(dialogo).toContainText(/Complete seu perfil/i);
  await expect(dialogo.getByRole("link", { name: "Completar perfil" })).toHaveAttribute("href", "/app/cadastro");
  await expect(dialogo).not.toContainText(/Ative sua participação/i);
});

test("player: lista de aulas alinhada e legível, com a aula atual destacada", async ({ page }) => {
  await entrar(page, "admin", "/app/cursos");
  await aguardarPaginaEstavel(page);
  await page.getByRole("button", { name: /Começar agora|Continuar curso/ }).click();
  await page.waitForSelector(".course-player-outline .course-module-group > button");

  const r = await page.evaluate(`(() => {
    const contraste = ${CONTRASTE};
    const botoes = [...document.querySelectorAll(".course-player-outline .course-module-group > button")];
    const ativo = botoes.find(b => b.classList.contains("active"));
    const fundo = getComputedStyle(ativo).backgroundColor;
    return {
      total: botoes.length,
      layout: getComputedStyle(botoes[1]).display,
      alinhamento: getComputedStyle(botoes[1]).textAlign,
      contraste: Math.min(...["b","strong","small"].map(s => contraste(getComputedStyle(ativo.querySelector(s)).color, fundo))),
    };
  })()`) as { total: number; layout: string; alinhamento: string; contraste: number };

  expect(r.total).toBeGreaterThan(0);
  expect(r.layout, "a linha da aula deveria ser uma grade número + título").toBe("grid");
  expect(r.alinhamento).toBe("left");
  expect(r.contraste, "texto da aula ativa ilegível sobre o roxo").toBeGreaterThanOrEqual(4.5);
});

test("a autorização separa membro de admin", async ({ page }) => {
  await entrar(page, "membro", "/admin");
  await aguardarPaginaEstavel(page);
  await expect(page.getByText("Permissão administrativa necessária").first()).toBeVisible();

  await entrar(page, "admin", "/admin");
  await aguardarPaginaEstavel(page);
  // "Visão geral" também é item do menu lateral, escondido no celular: o marcador
  // estável do painel é a raiz do admin, junto com a ausência da tela de bloqueio.
  await expect(page.locator(".admin-app").first()).toBeVisible();
  await expect(page.getByText("Permissão administrativa necessária")).toHaveCount(0);
});
