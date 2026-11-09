# Plano de ação — deixar a plataforma funcional (2026-10-29)

## Diagnóstico honesto

- **"Verde" não significa "funciona".** Os testes críticos (92) são quase todos
  leituras do código-fonte com `assert.match`. Provam que uma linha existe, não
  que a tela responde. Nenhuma funcionalidade interna foi exercitada logada.
- **Ninguém jamais viu a área interna rodando**, nem as sessões anteriores. A
  causa é uma só: ela exige login e o ambiente de teste não tem sessão.
- **Cursos estão desligados de propósito.** `SCHOOL_STATUS=coming_soon` em
  `wrangler.jsonc`, e não há conteúdo semeado (o D1 local tem 1 curso e 2 aulas
  de teste). A referência estilo Netflix (Conquer Plus, no reference pack) não
  está implementada como catálogo.
- Existem 31 rotas de API e 33 tabelas: há **estrutura**, mas sem verificação de
  que cada fluxo ponta a ponta funciona.
- O match era contagem de palavras; o motor novo existe mas **não está ligado**.

## Regra a partir daqui

Uma funcionalidade só vira "pronta" quando um teste **logado, no navegador,
executa o fluxo e confere o resultado** (não texto do código). Cada fase abaixo
termina com esse critério.

## Fase 0 — Destravar a verificação (eu, sem depender de você)

Sem isto nada mais é verificável. Entregas:
1. **Identidade de teste só no dev local**: um ponto único em `getRequestIdentity`
   que, SOMENTE quando `import.meta.env.DEV` e host `localhost`, aceita um
   membro e um admin de teste. No build de produção o código é eliminado; um
   teste confere que o bundle publicado não contém o gancho.
2. **Conteúdo de demonstração só no D1 local**, marcado `[DEMO]`, fora das
   migrações de produção: ~8 cursos, módulos, aulas, eventos, benefícios,
   posts, membros. Nunca aparece como real.
3. **Suíte logada** (Playwright) com um teste por fluxo, substituindo os
   testes de texto como critério de pronto.
4. **Varredura visual** das 8 rotas de membro e do admin, com capturas.

## Fase 1 — Cursos como plataforma de streaming (maior item)

Referência: Conquer Plus (catálogo, streaming, progresso).
- Catálogo: destaque grande no topo, fileiras ("Continue assistindo", "Novos",
  por categoria), cartões 16:9 com barra de progresso.
- Página do curso: capa, descrição, módulos e aulas com estado (concluída,
  atual, bloqueada), botão "Continuar".
- Player: retoma de onde parou, próxima aula automática, velocidade, notas,
  materiais, avaliação da aula.
- Admin: criar curso/módulo/aula, enviar vídeo e capa, reordenar, publicar.
- **Depende de você**: ativar a escola (`SCHOOL_STATUS=active`), conteúdo real
  (vídeos, capas, textos) e escolher onde hospedar vídeo.

## Fase 2 — Match e rede de membros
- Ligar `lib/match-score.ts` em `/app/conexoes` e na Home: nota, motivos,
  confiança, "o que não foi avaliado".
- Perfil completo guiado, diretório com filtros, perfil público do membro,
  botão de contato por WhatsApp, "útil / não útil" para calibrar pesos.
- **Depende de você**: expor as necessidades dos outros membros no banco de
  produção (decisão de privacidade) para liberar a reciprocidade.

## Fase 3 — Comunidade
Publicar, comentar, curtir, salvar, denunciar, anexar imagem/link/vídeo,
moderação no admin. Verificar cada ação logada.

## Fase 4 — Eventos
Lista, inscrição, ingresso com QR, check-in no admin, convidados, relatório.

## Fase 5 — Benefícios, Ouvidoria e Podcasts
Catálogo com busca e filtro, resgate, ouvidoria com protocolo, player de
podcast. Cada um com gestão no admin.

## Fase 6 — Admin
Visão geral com dados reais, membros (liberar/bloquear acesso), conteúdo,
eventos, financeiro. Testado como admin de teste.

## Fase 7 — Pagamentos e acesso (precisa de você)
Chaves do Stripe, webhook, assinatura, portal, liberação automática de acesso.

## Fase 8 — Publicação
Domínio, app iOS/Android (Capacitor), notificações, teste em celular real.

## Decisões que preciso de você
1. **Ativar a escola** e enviar o conteúdo real dos cursos.
2. **Hospedagem de vídeo** (Cloudflare Stream, Bunny, Vimeo ou outra).
3. **Autorizar a identidade de teste só no dev local** (Fase 0, item 1).
4. **Privacidade do match**: expor as necessidades dos membros a outros?

## Eventos no estilo Sympla (referência pedida em 2026-11-08)

Lido nas páginas públicas do Sympla (app do participante, app do organizador e
site). **Referência de funcionalidade, não de visual**, e só o que as páginas
descrevem: não assumi lotes, cupons nem taxas, que elas não detalham.

| Sympla | TIME hoje | Estado |
|---|---|---|
| Ingresso digital que funciona **offline** | "Meu ingresso" com QR salvo no aparelho | ✅ feito |
| Check-in por **QR Code** | Leitor na portaria (câmera + campo de código/leitor USB) | ✅ feito |
| Check-in pela **lista** | Já existia | ✅ |
| Detectar ingresso **já usado** | `already` em âmbar, com quem e a que horas | ✅ feito |
| Monitoramento da portaria (feitos/pendentes) | Painel mostra esperados/presentes/membros/convidados | ◐ falta fluxo por hora |
| Ingresso do convidado | Anfitrião tem o QR de cada convidado | ✅ feito |
| Apple Wallet | — | ❌ (exige certificado Apple Developer: depende do dono) |
| Descoberta por cidade/mapa e compartilhar | — | ❌ |
| Vendas em tempo real e pagamento por tipo de ingresso | — | ❌ depende do Stripe (chaves do dono) |
| Controle por portaria (aparelhos por ponto de entrada) | — | ❌ |
| Notificação push | — | ❌ |

**Limite conhecido do leitor:** o Safari do iPhone não tem `BarcodeDetector`,
então a câmera não lê QR lá. Para a portaria em iPhone é preciso uma
biblioteca de decodificação em JS (ex.: jsQR, ~130 KB) — decisão e instalação
pendentes. Enquanto isso o campo de código e leitores USB/Bluetooth funcionam.

**Pendência do dono para produção:** o segredo `TICKET_SECRET` (mínimo 16
caracteres) precisa existir no Worker (`wrangler secret put TICKET_SECRET`).
Sem ele, em produção, o ingresso **recusa emitir** (503), por segurança. Em dev
local há um valor próprio.
