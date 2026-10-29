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
  // O dev server às vezes derruba uma conexão sob carga (ECONNRESET). Isso não
  // diz nada sobre a existência da rota, então a sonda tenta de novo.
  let status = 0;
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    try {
      status = (await page.request.get("/dev/login", { maxRedirects: 0 })).status();
      break;
    } catch {
      await page.waitForTimeout(500);
    }
  }
  test.skip(status === 404, "identidade de teste indisponível: só existe no dev local");
  expect(status, "o servidor não respondeu à sonda de /dev/login").toBeGreaterThan(0);
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
  // O rótulo depende de o membro já ter começado o curso: "Começar agora" ou "Continuar curso".
  await page.getByRole("button", { name: /Começar agora|Continuar curso/ }).click();

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

test("a busca de cursos só aparece onde busca cursos", async ({ page }) => {
  // O campo dizia "Buscar cursos…" em TODAS as telas internas, embora só filtre o catálogo.
  await entrar(page, "membro", "/app/comunidade");
  await aguardarPaginaEstavel(page);
  await expect(page.locator(".member-search")).toHaveCount(0);

  await entrar(page, "membro", "/app/cursos");
  await aguardarPaginaEstavel(page);
  await expect(page.locator(".member-search")).toBeVisible();
});

test("evento: inscrição pelo fluxo real aparece como 'Você está na lista', legível", async ({ page }) => {
  await entrar(page, "membro", "/app/eventos");
  await aguardarPaginaEstavel(page);
  const base = new URL(page.url()).origin;

  // IDEMPOTENTE: usa sempre o mesmo evento. A versão anterior criava um evento
  // novo por execução e por viewport; depois de poucas rodadas o banco local
  // tinha 39 eventos e a própria página de eventos ficava lenta e instável.
  const TITULO = "Encontro de teste fixo [DEMO]";
  const cookieAdmin = (await (await page.request.fetch(`${base}/dev/login?como=admin`, { maxRedirects: 0 })).headersArray())
    .find((h) => h.name.toLowerCase() === "set-cookie")!.value.split(";")[0];
  const comoAdmin = { Cookie: cookieAdmin, Origin: base };

  const existentes = await page.request.get(`${base}/api/events`, { headers: { Cookie: cookieAdmin } });
  let eventoId = ((await existentes.json()).events as Array<{ id: number; title: string }>).find((e) => e.title === TITULO)?.id;
  if (!eventoId) {
    const criado = await page.request.post(`${base}/api/admin/events`, {
      headers: comoAdmin,
      data: { title: TITULO, startsAt: new Date(Date.now() + 30 * 864e5).toISOString(), city: "Curitiba", status: "published" },
    });
    expect(criado.status()).toBe(201);
    eventoId = (await criado.json()).event.id as number;
  }

  const inscricao = await page.request.post(`${base}/api/events`, {
    headers: { Origin: base },
    data: { eventId: eventoId, action: "register", registration: { phone: "41999990000", confirmed: true } },
  });
  expect(inscricao.status()).toBe(200);

  await page.reload();
  await aguardarPaginaEstavel(page);
  const selo = page.locator(".reference-event-body > div > b", { hasText: "Você está na lista" }).first();
  await expect(selo).toBeVisible();

  const medidas = await selo.evaluate((el) => {
    const cs = getComputedStyle(el);
    const lum = (c: string) => {
      const [r, g, b] = (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map((v) => {
        const n = v / 255;
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const a = lum(cs.color), c = lum(cs.backgroundColor);
    return { contraste: (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05), px: parseFloat(cs.fontSize) };
  });
  expect(medidas.contraste, "selo ilegível").toBeGreaterThanOrEqual(4.5);
  expect(medidas.px, "selo pequeno demais").toBeGreaterThanOrEqual(11);
});

test("vídeo da aula: o admin salva um link do Vimeo não listado e o player o carrega com o hash", async ({ page }) => {
  // Dois defeitos reais que este teste cobre: o embed descartava o hash de
  // privacidade do Vimeo (vídeo não listado ficava em branco), e a capa clicável
  // virava um círculo de 68px por causa de `.video-frame button`.
  await page.route("**/player.vimeo.com/**", (rota) => rota.abort()); // determinístico: sem internet
  await entrar(page, "admin", "/app/cursos");
  await aguardarPaginaEstavel(page);
  const base = new URL(page.url()).origin;

  const cursos = await (await page.request.get(`${base}/api/courses`)).json();
  const curso = cursos.courses.find((c: { slug: string }) => c.slug === "demo-vendas");
  const aula = curso.lessons[0];
  const salvo = await page.request.post(`${base}/api/admin/course-content`, {
    headers: { Origin: base },
    data: {
      action: "lesson.upsert", id: aula.id, courseId: curso.id, moduleId: aula.moduleId ?? null, title: aula.title,
      description: "Aula de demonstração.", videoUrl: "https://vimeo.com/76979871/8272103f6e", durationSeconds: 480, status: "published",
    },
  });
  expect(salvo.status()).toBe(200);

  const recusado = await page.request.post(`${base}/api/admin/course-content`, {
    headers: { Origin: base },
    data: { action: "lesson.upsert", id: aula.id, courseId: curso.id, moduleId: aula.moduleId ?? null, title: aula.title, videoUrl: "https://example.com/video.mp4", status: "published" },
  });
  expect(recusado.status(), "link de outro domínio deveria ser recusado").toBe(400);

  await page.reload();
  await aguardarPaginaEstavel(page);
  await page.getByRole("button", { name: /Começar agora|Continuar curso/ }).click();
  const capa = page.locator(".lesson-start-cover");
  await expect(capa).toBeVisible();

  const geometria = await page.evaluate(() => {
    const c = document.querySelector(".lesson-start-cover")!.getBoundingClientRect();
    const q = document.querySelector(".lesson-start-cover")!.parentElement!.getBoundingClientRect();
    return { dw: q.width - c.width, dh: q.height - c.height, largura: c.width };
  });
  expect(geometria.largura, "a capa virou um botão pequeno").toBeGreaterThan(300);
  expect(Math.max(geometria.dw, geometria.dh), "a capa não preenche o quadro do vídeo").toBeLessThanOrEqual(4);

  await capa.click();
  await expect(page.locator("iframe")).toHaveAttribute("src", /^https:\/\/player\.vimeo\.com\/video\/76979871\?h=8272103f6e/);
});
