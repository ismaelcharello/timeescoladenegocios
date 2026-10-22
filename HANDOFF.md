# HANDOFF – colocar o PWA TIME no ar (atualizado 2026-10-22 02:30 BRT)

Dono: Ismael (fala português; está sem tempo, quer que o Code faça as configs sozinho).
Meta: app no ar em **https://app.timeescoladenegocios.com.br** (PWA).

## Estado atual (feito)
- Worker Cloudflare `timeescoladenegocios` no ar em https://timeescoladenegocios.icschool-contato.workers.dev (conta icschool.contato@gmail.com, account id a879ae0bd5f8a15414c47fbae59073fd). Deploy automático a cada push na `main` (Workers Builds).
- Bindings OK: D1 `DB` (time-escola-db, id 312a978a-4e4f-494c-ac0d-b2c248cfa37f), R2 `BUCKET` (time-escola-uploads), `IMAGES`, `ASSETS`. Fonte da verdade: `wrangler.jsonc`.
- Supabase (projeto "TIME Escola de Negócios", akjulbskcbuljakormst): schema aplicado, Auth Site URL/redirects configurados, SUPABASE_SERVICE_ROLE_KEY já cadastrada como secret do Worker.
- Variáveis públicas em `.env.production` (commitado). Nunca colocar segredos ali.
- Build/lint/tsc passam (`npm run build`).

## Pendências
1. **Domínio**: hoje `app.timeescoladenegocios.com.br` é CNAME na HostGator → `custom-domains.chatgpt.site` (publicação ORIGINAL antiga, com banco próprio). O DNS do domínio está na HostGator (ns00124/ns00125). Para usar Worker em domínio próprio o DNS precisa estar na Cloudflare:
   - Zona `timeescoladenegocios.com.br` já adicionada na Cloudflare (tela "confirm-scanned-records"; ainda NÃO ativada).
   - Antes de ativar: adicionar TXT `titan2._domainkey` (valor em DNS antigo da HostGator: `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQClKsvDZbJLPLfj8LrLx9V+xmcEqttStT0oj4G3m0jQFiqQsonxunwDFsROvMoH/qzHIdozh9BnENr3s8u/gEdt4Zy+mPhXo2iRsGsydidbQRWY7nGzHdCveqNuR5KCbUnmo9i1FF9Wi8AyhEzafRXryCld6pQ1vy+eYzP6lRL6twIDAQAB`).
   - Colocar em **DNS only (nuvem cinza)**: A apex, www, mail, webmail, cpanel, ftp, webdisk, whm, autoconfig, autodiscover, cpcalendars, cpcontacts (senão quebra site/e-mail HostGator/Titan). NÃO mexer em MX/SPF/DKIM.
   - Continuar para ativação, trocar nameservers no registrador, esperar ativar.
   - Depois: remover CNAME `app` antigo (e TXT `_cf-custom-hostname.app` / `_openai-site-verification.app`) e adicionar Custom domain `app.timeescoladenegocios.com.br` no Worker (Settings → Domains & Routes).
   - Atualizar no Supabase Auth: Site URL e redirects para o novo domínio (já inclui o domínio? conferir).
   - **ANTES de trocar**: confirmar com o Ismael se o app antigo tem alunos/dados reais. Se tiver, exportar do banco antigo e importar no D1 novo. (Pergunta ainda sem resposta.)
2. Confirmar D1 com ≥28 tabelas: `npx wrangler d1 execute time-escola-db --remote --command "select count(*) from sqlite_master where type='table'"` (NÃO rodar migrations de novo: 0003 já aplicada).
3. `SCHOOL_STATUS` (runtime var): usar `coming_soon` se cursos não estão prontos. Ismael não respondeu.
4. Stripe depois do lançamento: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET (webhook em /api/billing/webhook). Ismael precisa colar os valores.
5. Teste em celular real: cadastro, confirmação de e-mail, Adicionar à Tela de Início (iPhone/Android).
6. Frontend: Ismael ainda não disse o que mudar; perguntar depois do domínio.

## Notas
- Mac: pasta `/Users/ismaellucas/Documents/Time/time-escola-negocios-mobile-final` (fazer `git pull`).
- Worker se chama `timeescoladenegocios` no painel (wrangler.jsonc diz `time-escola-negocios`; o Workers Builds sobrescreve).
- Um agente em nuvem foi bloqueado por classificador ao editar DNS/Auth; no Code local use as permissões do Ismael.
