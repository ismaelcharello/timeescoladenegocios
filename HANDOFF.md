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
- [x] 14. **Plano de ação — Fase 0 e começo da Fase 1** (2026-10-29, commits d101a18 e ac837a7).
      Ver `docs/PLANO-DE-ACAO.md`. FEITO: identidade de teste só no dev local (`/dev/login?como=membro|admin`,
      `lib/dev-identity.ts`; segurança provada no build de produção, teste permanente olha o `dist`),
      conteúdo [DEMO] só no D1 local (`node scripts/seed-demo-local.mjs`; escola ativa via `.dev.vars`
      com `SCHOOL_STATUS=active`, no .gitignore), e `tests/e2e/area-interna.spec.ts` (logado, no navegador).
      PRIMEIRA VEZ que a área interna foi vista rodando. Resultado da varredura:
      * BACKEND FUNCIONA: comunidade (postar/curtir/comentar/denunciar/aviso oficial só admin), ouvidoria,
        eventos (criar como admin, inscrição com aceite, capacidade, convidados, limite por membro,
        relatório CSV, lista de check-in), progresso de aula, painel admin com números reais.
      * O que travava era a EXPERIÊNCIA: contraste ilegível (cursos, selo de evento), lista de aulas sem
        layout, motivo de bloqueio errado ("Ative sua participação" para quem só falta o perfil),
        busca "Buscar cursos" em toda tela, categorias com slug cru. Tudo corrigido e testado.
      * PAREDE DO PERFIL — RESOLVIDA (decisão do dono em 2026-10-29: "liberar aos poucos"). Cursos,
        Comunidade, Eventos, Home e Conexões ficavam trancados até 13 campos. Agora abrem com o
        ESSENCIAL (nome, WhatsApp com DDD, cidade, segmento): `isEssentialProfileReady` em
        `lib/member-profile.ts`. O perfil COMPLETO continua sendo pedido como lembrete e é ele que
        põe a pessoa no diretório que os outros veem (`completed_at` só é gravado na finalização
        completa) — conferido por teste que `isNetworkingProfileReady` NÃO foi afrouxado.
        Testes de comportamento em `tests/essential-profile.test.ts`, com checagem de mutação.
        DECISÕES DO DONO REGISTRADAS: escola segue em "Em breve" (falta conteúdo) e os vídeos serão
        Vimeo ou YouTube não listado — falta construir o player/admin para isso (ver Fase 1).
      * NÃO TESTÁVEL LOCALMENTE: diretório de membros, perfil (`member_profiles`) e match — moram no
        Supabase remoto e dependem do JWT real.
      * SEM VÍDEO: as aulas mostram "Vídeo ainda não adicionado". Falta escolher a hospedagem (dono).
- [~] 15. **PWA e eventos estilo Sympla** (2026-11-08, commits 10b0c05, 9ecfb78 e o do manifest). Estratégia
      passou a ser PWA primeiro (sem lojas). FEITO: guia de instalação (iPhone: Compartilhar > Adicionar
      à Tela de Início; Android: botão Instalar), página /offline servida pelo service worker v3, ícone
      adaptável com margem de segurança, manifest completo (id, lang, atalhos), e testes de
      instalabilidade. Eventos: ingresso com QR que abre offline, leitor de portaria, detecção de
      ingresso já usado. Ver `docs/PLANO-DE-ACAO.md` (seção Sympla).
      FALTA, e depende de terceiros ou do dono:
      a) `TICKET_SECRET` (>=16 chars) como secret do Worker; sem ele produção recusa emitir ingresso;
      b) iPhone na portaria: Safari não tem BarcodeDetector; precisa jsQR (~130 KB, npm) — decisão;
      c) teste do ciclo offline real e da instalação em aparelho (o navegador embutido não desliga rede);
      d) Lighthouse não rodado (exige baixar o pacote); os critérios de instalação foram verificados por
         teste próprio (`tests/pwa-manifest.test.mjs`);
      e) Apple Wallet (certificado Apple Developer), push, pagamento por ingresso (Stripe).
      NOTA DE TESTE: o Playwright agora BLOQUEIA o service worker (`serviceWorkers: "block"` na config) porque
      com ele ativo havia 4 falhas em 420 execuções no dev server, contra 0 em 390 sem ele; só
      `carregamento.spec.ts` o reativa. O Chromium do Playwright precisou ser baixado de novo
      (`npx playwright install chromium`) porque o cache do Mac foi zerado.
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
      d) CSS de 388 KB crus (65 KB gzip) para uma landing. Cobertura medida no dev: `platform.css`
         (273 KB), `member-refine`, `member-frame` e `admin-refine` somam 312 KB com 0,0% de uso na
         landing, no login e nas legais. Mover os imports para layouts de /app e /admin funciona no
         DEV (provado com rota-sonda), mas NÃO no build de produção: o vinext 0.0.50 emite um bundle
         único (`index-*.css`, 389 KB) e todas as rotas recebem o mesmo arquivo. Tentado e revertido
         em 2026-10-28; só vale retomar se o vinext passar a dividir CSS por rota ou se o CSS legado
         for podado de fato (etapa 6 já removeu 519 regras mortas);
      e) LCP real: o ~80 ms medido é de localhost e não vale como número de campo.
- [~] 13. **Match inteligente entre membros** (motor FEITO em 2026-10-28, commit 5080a2f; falta ligar).
      `lib/match-score.ts` + 11 testes em `tests/match-score.test.ts` (dentro do `test:critical`).
      Regras transparentes (decisão do dono): encaixe necessidade×oferta 55%, reciprocidade 30%,
      público 15%, alcance 15%; IDF; sem piso/teto; cada motivo cita palavras reais do membro.
      O match ANTIGO (`lib/connection-matching.ts`) segue em uso nas telas: só conta palavras da busca
      e prende a nota entre 52% e 96%. FALTA, nesta ordem:
      a) ligar: em `/app/conexoes` e `/app` ler o perfil de quem busca (tabela `member_profiles`, linha
         própria — a página `/app/cadastro` já faz esse select) e chamar `scoreMatches`; mostrar nota,
         motivos, confiança e os `notEvaluated`. Exige sessão para ver. Manter a busca por texto;
      b) DECISÃO DO DONO: o RPC `search_member_directory` expõe só 12 campos e NÃO inclui as
         necessidades dos outros membros (privacidade por desenho). Sem isso a reciprocidade (30% do
         peso) não é calculável. Expor exige migração no Supabase de PRODUÇÃO + decisão de privacidade
         (o membro sabe que a necessidade dele fica visível a outros?). O motor já aceita `needs`;
      c) feedback de quem conectou (útil / não útil) para calibrar pesos — não existe tabela ainda;
      d) lista de espera de perfil incompleto: hoje sem `looking_for` o motor devolve a mensagem
         "Preencha o que você procura" em vez de sugestão.
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
