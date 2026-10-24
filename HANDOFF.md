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
- [ ] 4. **Landing**: decidir/reativar seções ocultas (ecossistema, plataforma, clube, admin = `display:none`); revisar mobile; manter motion.
- [ ] 5. **Acessibilidade e responsivo**: rodar `npm run test:viewports` se o Playwright subir; contraste, foco, alvos de 44px; `prefers-reduced-motion`.
- [ ] 6. **Limpeza de CSS legado** em `platform.css`/`globals.css`: remover regras mortas, sem mudar o visual; manter testes verdes.
- [ ] 7. **Pendências do dono (só lembrar, não fazer)**: Stripe (3 chaves: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET; ele cola), domínio `app.timeescoladenegocios.com.br` (precisa login na Cloudflare e troca de nameservers na HostGator; app antigo é só teste, sem dados reais), teste em celular real.

## Como validar cada etapa (sempre)
1. `npx tsc --noEmit`
2. `npm run test:critical` e `node --test tests/event-checkin.test.mjs tests/rendered-html.test.mjs tests/course-experience.test.mjs tests/school-coming-soon.test.mjs tests/landing-course-carousel.test.mjs`
3. `SITES_ENV_READY=1 npx vinext build` (o `npm run build` exige `timeout` GNU, ausente no macOS)
4. Commit na branch `design/<etapa>`, merge `--ff-only` na `main`, `git push origin main`, esperar o CSS novo no ar (`curl` do hash do CSS) e conferir ao vivo (navegador do app já está logado como o dono).
5. Atualizar esta fila, o cofre (`~/Documents/Segundo Cerebro`, nota do projeto) e `node ~/.segundo-cerebro/cerebro.js log ... && reindexar`.

## Regras de trabalho
- Servidor local não sobe (workerd): validar com renderização estática (esbuild + renderToStaticMarkup) e/ou a landing publicada.
- Painel do navegador do app fica oculto: transições e `visibilityState` congelam.
- Patch em arquivo grande: use marcadores a partir de índice já achado; em caso de erro, `git checkout <arquivo>`.
- Retomada automática: ao voltar de um limite de uso, abrir esta fila e continuar do primeiro item `[ ]`.
