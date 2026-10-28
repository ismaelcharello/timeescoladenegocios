# HANDOFF – TIME Escola de Negócios (atualizado 2026-10-24)

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
- [ ] 9. **Estados**: vazio, carregando, erro e offline por rota; teclado ponta a ponta;
      `prefers-reduced-motion`; alvos de 44px medidos no DOM renderizado (hoje só conferidos por
      token e estático).
- [ ] 10. **Intenção duplicada de CTA**: a landing tem três rótulos para cadastro ("Criar conta",
      "Criar minha conta na TIME", "Criar minha conta") e dois para entrada ("Entrar", "Já sou
      membro"). Escolher um rótulo por intenção.
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
  lockfile (data sobrescrita só no runtime local; o deploy segue lendo o `wrangler.jsonc`).
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
