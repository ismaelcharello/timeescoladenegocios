# HANDOFF – TIME Escola de Negócios (atualizado 2026-10-28)

Dono: Ismael (português; iniciante em Git/Terminal; TDAH: passos curtos e objetivos). Autorizou seguir sem perguntar nas etapas abaixo. Continua proibido: digitar senhas/chaves, criar contas, mexer em DNS/nameservers sem o login dele, pagamentos.

## Estado atual (no ar)
- Worker Cloudflare `timeescoladenegocios` em https://timeescoladenegocios.icschool-contato.workers.dev (deploy automático a cada push na `main`; leva ~100 s).
- `main` = `7dae148` (ou mais novo). Push funciona do Mac com o token pessoal salvo no Keychain.
- D1 completo (benefits e ombudsman_messages criadas só com schema; NÃO rodar migrações 0014/0015/0016 inteiras: têm seed de staging). Secret `SUPABASE_SERVICE_ROLE_KEY` regravado; diretório de conexões OK.
- `SCHOOL_STATUS=coming_soon` em `wrangler.jsonc` (cursos ainda não prontos).
- Design system: `docs/DESIGN-SYSTEM.md` (contrato), `app/design-tokens.css`, tema Automático/Claro/Escuro (`data-resolved`), shell único `app/app/member-frame.tsx`, ícones SVG `app/app/icons.tsx`, camadas de override `app/member-refine.css` e `app/landing-refine.css`.
- Feito: landing (hero sóbrio, demo de busca em loop, revelação por IntersectionObserver), login/cadastro, área interna (Início, Cursos, Conexões, Empresários, Comunidade, Eventos, Benefícios, Ouvidoria), ícones SVG em todo o app.

## FILA DE ETAPAS (fazer na ordem; marcar [x] e commitar a cada etapa)
- [x] 1. (FEITO em 2026-10-24, main 8afd624; shell único em modo escuro travado; NÃO conferido ao vivo: sessão do navegador expirou, o dono precisa logar no painel para eu ver `/admin`. Opcional futuro: tema claro no admin exigiria reescrever ~680 regras `.admin-*`) **Admin** (`app/admin/*`, `admin-platform.tsx`, CSS `.admin-*` em platform.css): redesign sobre tokens, mesmo shell/tema da área interna (barra lateral + barra inferior no celular, claro/escuro/automático), sem gradientes. Manter funções e rotas. Testes: `npm run test:critical` + `tests/event-checkin.test.mjs` etc.
- [x] 2. (FEITO em 2026-10-24) **Onboarding/cadastro de perfil** (`app/app/cadastro/*`, `onboarding.css`): tokens, tema, ícones; revisar fluxo de campos.
- [x] 3. (FEITO em 2026-10-24; checkout travado em escuro por causa do Stripe night; legais seguem o tema) **Checkout e páginas legais** (`app/checkout/*`, `app/legal-page.tsx`, `app/legal.css`): tokens e tema. NÃO mexer na lógica do Stripe.
- [x] 4. (FEITO em 2026-10-24) **Landing**: seções ocultas (ecossistema, plataforma, clube, admin, fundadores) permanecem `display:none` DE PROPÓSITO: têm painéis de demonstração com dados de exemplo; só reativar com conteúdo real. Rodapé: links quebrados corrigidos, compacto no celular.
- [x] 5. (FEITO em 2026-10-24: contraste dos tokens medido nos dois temas e `--border-strong` corrigido para 3:1; Playwright não sobe neste Mac, então viewports só foram checados na landing publicada e por renderização estática; alvos de 44px nos shells novos) **Acessibilidade e responsivo**: rodar `npm run test:viewports` se o Playwright subir; contraste, foco, alvos de 44px; `prefers-reduced-motion`.
- [x] 6. (FEITO em 2026-10-24: 519 regras mortas removidas, ~62 KB; critério: classe que não aparece em nenhum arquivo de código nem como prefixo dinâmico) **Limpeza de CSS legado** em `platform.css`/`globals.css`: remover regras mortas, sem mudar o visual; manter testes verdes.
- [x] 7. (FEITO em 2026-10-27) **Suíte de viewports confiável**: `tests/e2e/viewports.spec.ts`
      dava confiança falsa. Interagia logo após `domcontentloaded`, ou seja antes da hidratação —
      o clique no "Mostrar" era engolido (medido: 3/3 rodadas sem efeito sem esperar, 3/3
      funcionando com `networkidle`). Passava contra o staging por sorte de cronometragem.
      Também afirmava o rótulo exato do CTA, que quebra no celular quando a nav colapsa e o hero
      usa outra redação. Agora espera hidratação e afirma intenção, não redação. 15/15 nos cinco
      viewports contra o local.
- [ ] 8. **Varredura visual das rotas internas**: as 8 rotas de membro + admin nunca foram vistas
      renderizadas (todas as etapas 1–6 foram validadas por renderização estática). Precisa de
      sessão: o login do dono funciona no navegador dele.
      SUSPEITA A CONFERIR NESSA VARREDURA (achada em 2026-10-28, NÃO verificada por falta de
      sessão): `globals.css` tem `body { background: var(--ink) }` fixo, azul-escuro, e nada
      retema o body. Em tema claro a área interna provavelmente mostra faixa escura ao puxar a
      rolagem além do fim — o navegador propaga o fundo do body para o overscroll, e no app iOS
      isso acontece a cada rebote. Medido e corrigido na página legal, que é pública
      (`body:has(.legal-page) { background: var(--bg) }` em legal.css). Se a área interna tiver o
      mesmo defeito, a correção é a mesma com `.member-app` / `.admin-app`.
- [~] 9. **Estados e acessibilidade** (FEITO para as rotas públicas em 2026-10-28, commit 301dbc0;
      falta a parte que exige sessão). Virou suíte: `tests/e2e/acessibilidade.spec.ts` mede alvo de
      toque, nome acessível, movimento reduzido, foco por teclado e o estado de erro do login, nos
      cinco viewports. Achados corrigidos: pontos do carrossel tinham 8x8 de alvo (o breakpoint de
      celular os deixava MENORES que no desktop) e um `<button>` decorativo sem nome acessível
      ficava no caminho do teclado. FALTA: estados vazio/carregando/erro/offline das 8 rotas
      internas — precisa de sessão, junto com a etapa 8.
- [x] 10. **Intenção duplicada de CTA** (FEITO em 2026-10-28, commit 301dbc0). Era problema de
      funil, não de redação: a barra do clube e o CTA final — os dois CTAs mais fortes da página —
      apontavam para `/checkout`, que chama `requireUser` e manda quem não está logado para
      `/entrar?mensagem=sessao_necessaria`. O visitante novo clicava em "Quero fazer parte" e caía
      num login de conta que não tem. O `/checkout` ser logado é proposital; a landing é que pulava
      a porta de entrada. Agora: "Criar conta" (4 lugares) -> `/criar-conta`, "Entrar" (2 lugares)
      -> `/entrar`. Também corrigidos dois ícones que mentiam (glifo de "nova aba" em link interno;
      play em círculo num link de login).
- [~] 12. **Performance** (medida em 2026-10-28, commit 28156d1; sobrou trabalho). Medir contra o
      build de produção servido pelo workerd, nunca contra o dev server:
      `npx wrangler dev --config dist/server/wrangler.json --port 8788 --local --compatibility-date 2026-05-22`.
      (`vinext start` não serve: roda bundle de Workers no Node e morre em `cloudflare:`.)
      FEITO: (a) as 5 seções em `display:none` baixavam suas imagens — marcadas como lazy,
      825 KB -> 250 KB no celular; (b) toda PRIMEIRA visita carregava o documento duas vezes porque
      `pwa-register.tsx` recarregava no `controllerchange` do service worker mesmo na primeira
      instalação, quando não há nada a atualizar (medido 6/6, dev e produção, 2º documento 213-459 ms
      depois do 1º) — guarda `jaTinhaControlador` adicionada, agora 1 carga, SW segue ativo.
      CLS 0,000. FALTA, por ordem de valor:
      a) as imagens vêm do WordPress externo (`timeescoladenegocios.com.br`), sem otimização
         (PNG de 182 KB, JPG de 172 KB) — é dependência de disponibilidade de outro site;
      b) imagens superdimensionadas: 1080x1436 exibidas a 337x446;
      c) a mesma URL é baixada duas vezes em alguns casos — não investigado;
      d) CSS de 388 KB crus (65 KB gzip) para uma landing;
      e) LCP real: o ~80 ms medido é de localhost e não vale como número de campo.
- [ ] 11. **Pendências do dono (só lembrar, não fazer)**: Stripe (3 chaves: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET; ele cola), domínio `app.timeescoladenegocios.com.br` (precisa login na Cloudflare e troca de nameservers na HostGator; app antigo é só teste, sem dados reais), teste em celular real.

## Como validar cada etapa (sempre)
1. `npx tsc --noEmit`
2. `npm run test:critical` e `node --test tests/event-checkin.test.mjs tests/rendered-html.test.mjs tests/course-experience.test.mjs tests/school-coming-soon.test.mjs tests/landing-course-carousel.test.mjs`
3. `SITES_ENV_READY=1 npx vinext build` (o `npm run build` exige `timeout` GNU, ausente no macOS)
4. Commit na branch `design/<etapa>`, merge `--ff-only` na `main`, `git push origin main`, esperar o CSS novo no ar (`curl` do hash do CSS) e conferir ao vivo (navegador do app já está logado como o dono).
5. Atualizar esta fila, o cofre (`~/Documents/Segundo Cerebro`, nota do projeto) e `node ~/.segundo-cerebro/cerebro.js log ... && reindexar`.

## Regras de trabalho
- **O servidor local SOBE** (corrigido em 2026-10-26/27). `npm run dev` → http://localhost:5173.
  Duas causas estavam no repositório e foram corrigidas em `vite.config.ts`: `nodejs_compat`
  declarado em dobro, e `compatibility_date` de outubro à frente do workerd de maio fixado pelo
  lockfile. ATENÇÃO: a primeira versão dessa correção dizia que "o deploy segue lendo o
  `wrangler.jsonc`" — era falso e ninguém tinha medido. O override entrava também no
  `dist/server/wrangler.json` e publicaria com a data de maio. Corrigido em 2026-10-28 (commit
  28156d1): o override só vale quando `command === "serve"`. Ao mexer nisso, conferir os dois
  lados — reconstruir e ler a data do artefato, e subir o dev.
  Para o login funcionar em dev é preciso um `.env.local` com as duas públicas do Supabase
  (o Vite não lê `.env.production` em modo dev), e o D1 local precisa das migrações:
  `npx wrangler d1 migrations apply time-escola-db --local`.
- **O Playwright RODA** (corrigido em 2026-10-27). Nunca foi limitação do Mac: faltava
  `npx playwright install chromium`. Os cinco viewports rodam contra o local com
  `PLAYWRIGHT_BASE_URL=http://localhost:5173 npx playwright test`.
- Validação por renderização estática não é mais necessária — e não substitui o navegador:
  a suíte de viewports passava contra o staging e escondia um defeito próprio (ver abaixo).
- Painel do navegador do app fica oculto: transições e `visibilityState` congelam.
- Patch em arquivo grande: use marcadores a partir de índice já achado; em caso de erro, `git checkout <arquivo>`.
- Retomada automática: ao voltar de um limite de uso, abrir esta fila e continuar do primeiro item `[ ]`.
