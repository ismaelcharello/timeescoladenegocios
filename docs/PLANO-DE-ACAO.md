# Plano de ação — concluir a plataforma TIME (revisado em 2026-11-16)

Critério de "pronto", desde 2026-10-29: um teste **logado, no navegador, executa o
fluxo e confere o resultado**. Nada é marcado pronto por leitura de código.

## Estado por área

| Área | Estado | Prova |
|---|---|---|
| Landing, login, cadastro, PWA (instalação, offline, ícones) | ✅ no ar | `viewports`, `acessibilidade`, `carregamento` |
| Cursos (catálogo, player, vídeo Vimeo/YouTube não listado) | ✅ pronto, escola em "Em breve" até haver conteúdo | `area-interna` |
| Perfil em dois níveis (essencial libera, completo lista) | ✅ | `essential-profile` |
| **Match** (motor + reciprocidade + tela explicável) | ✅ local, com substituto do Supabase | prova de ponta a ponta 2026-11-16 |
| Diretório e perfil público | ✅ local | idem |
| Comunidade (postar, curtir, comentar, denunciar, aviso oficial) | ✅ backend provado; tela sem varredura visual fina | API |
| Eventos: inscrição, vagas, convidados, **ingresso QR offline**, portaria, relatório | ✅ | `area-interna` (ingresso) |
| Ouvidoria, Benefícios | ✅ backend; tela básica | API |
| Admin: visão geral, cursos, eventos, membros, comunidade, benefícios, ouvidoria | ◐ funciona; falta varredura visual e tutorial | capturas 2026-10-29 |
| Podcasts, Tutor IA, Conquistas | ⏸ **Em breve** por decisão do dono (nav, página e API fechadas) | `area-interna` |
| Segurança do Worker (HSTS, nosniff, anti-iframe, Permissions, CSP relatório, anti-CSRF) | ✅ | `security-headers`, `area-interna` |

## Fases restantes (o que o dono pediu em 2026-11-16)

### A. Eventos no padrão Sympla — organizadores por evento
Hoje os papéis são globais (`app_roles`: admin, coordinator, support). Falta:
1. Tabela `event_collaborators (event_id, member_email, role: 'organizer'|'checkin'|'partner')` com migração.
2. Admin: no evento, "Equipe" para adicionar colaboradores por e-mail, com o papel.
3. Portaria: quem é `checkin` daquele evento entra na tela de check-in **só dele**.
4. Papel `partner` (sócio): vê relatório e lista, não faz check-in.
5. Banner por evento: **já existe** (upload para R2); falta mostrar no card do membro e no ingresso.
6. Portaria em iPhone: biblioteca `jsQR` (~130 KB) — **aguarda autorização**.
7. Fluxo de entrada por hora no painel da portaria.

### B. Design e responsividade em tudo
1. Varredura visual logada de TODAS as telas em 390/768/1440 e nos dois temas, com correção do que aparecer (como foi feito em cursos e eventos).
2. Um só sistema: tokens, espaçamentos e tipografia de `docs/DESIGN-SYSTEM.md` aplicados às telas que ainda têm CSS legado (admin, comunidade, benefícios, ouvidoria).
3. Estados vazio, carregando, erro e offline em cada tela interna, com teste.

### C. Tutorial dentro do produto
1. Primeiro acesso: 4 passos (perfil → cursos → conexões → eventos), dispensável, lembrado por aparelho.
2. Admin: guia de "como organizar um evento" e "como publicar um curso" na própria tela.

### D. Segurança (continuação)
1. Ler os relatórios da CSP em produção (`/api/csp-report`) e trocá-la para bloqueante.
2. Limite de requisições por IP/sessão nas APIs de escrita (comunidade, ouvidoria, uploads, tutor).
3. Validação Zod nas 5 rotas que ainda não têm.
4. Auditoria de uploads: tipos permitidos por extensão **e** conteúdo, tamanho, nome aleatório (já parcialmente feito).
5. `TICKET_SECRET` e segredos só no Worker (dono).

### E. Depende do dono
- `TICKET_SECRET` no Cloudflare (sem ele, ingresso responde 503).
- Stripe (3 chaves) para cobrança e liberação automática.
- Domínio `app.timeescoladenegocios.com.br`.
- Conteúdo real: vídeos, capas e textos dos cursos; episódios de podcast.
- Autorizar `jsQR`.
- Teste em celular real (instalação, offline, câmera).

## Como ligar uma área quando o conteúdo existir
Em `wrangler.jsonc` → `vars`: `SCHOOL_STATUS`, `PODCASTS_STATUS`, `TUTOR_STATUS`,
`ACHIEVEMENTS_STATUS` = `"active"`. Sem a variável, a área fica em "Em breve".
