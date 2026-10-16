# TIME Mobile (Capacitor)

## Arquitetura

O aplicativo é um shell Capacitor para o domínio HTTPS oficial. Essa escolha preserva o SSR, os cookies, as API routes e o runtime Cloudflare do produto homologado. Não existe export estático da aplicação.

- App ID: `br.com.timeescoladenegocios.app`
- Nome: `TIME Escola de Negócios`
- Origem: `https://app.timeescoladenegocios.com.br`
- iOS: `ios/App/App.xcodeproj`
- Android: `android/`

O conteúdo local em `mobile-shell/` é usado durante inicialização e como fallback offline. O app não contém service role, chaves Stripe secretas ou webhook secrets.

## Comandos

```bash
npm run mobile:check
npm run mobile:sync
npm run mobile:associations
npm run mobile:open:ios
npm run mobile:open:android
npm run mobile:build:android
```

## Pagamentos nas lojas

O checkout Stripe web de produção permanece inalterado e bloqueado dentro do app. A V1 não vende assinatura no iOS ou Android. Acesso e login de membros já ativos permanecem disponíveis conforme o entitlement existente.

## Deep links de autenticação

- Universal/App Link principal: `https://app.timeescoladenegocios.com.br/*`.
- Fallback nativo: `timeescola://auth/confirm`.
- O checkout é excluído no iOS e continua bloqueado pela política nativa nos dois sistemas.
- No Supabase Auth, mantenha o Site URL de produção e autorize `https://app.timeescoladenegocios.com.br/auth/confirm**` e `timeescola://auth/confirm**` em **Additional Redirect URLs**.

Os arquivos públicos de associação dependem das identidades de assinatura reais. Depois de escolher o Apple Developer Team e o certificado Android de upload/release, gere-os sem placeholders:

```bash
APPLE_TEAM_ID=XXXXXXXXXX \
ANDROID_SHA256_CERT_FINGERPRINT=AA:BB:...:FF \
npm run mobile:associations
```

Revise e publique `public/.well-known/apple-app-site-association` e `public/.well-known/assetlinks.json` no domínio oficial em uma alteração Web separada. Ambos precisam responder por HTTPS, sem redirecionamento; AASA deve usar `application/json` e não ter extensão.

## Antes da submissão

1. Definir Apple Developer Team, assinatura e provisioning no Xcode.
2. Criar chave de upload/Play App Signing e gerar o AAB assinado.
3. Gerar e publicar AASA/`assetlinks.json` com as identidades reais e confirmar os redirects adicionais do Supabase.
4. Executar QA em iPhone e Android reais, inclusive login, sessão, teclado, uploads, downloads, links e retomada após perda de rede.
