import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("checkout vincula o pedido à identidade autenticada e exige aceite versionado", () => {
  const route = source("../app/api/billing/checkout-session/route.ts");
  assert.match(route, /getAuthenticatedIdentity\(request\)/);
  assert.match(route, /memberAuthUserId: identity\.id/);
  assert.match(route, /memberAgreements/);
  assert.doesNotMatch(route, /const email = \(payload\.email/);
  assert.match(route, /authUserId: identity\.id/);
});

test("confirmação do Checkout não redefine o e-mail já fixado pelo servidor", () => {
  const client = source("../app/checkout/checkout-client.tsx");
  const confirmation = client.match(/result\.checkout\.confirm\(\{([\s\S]*?)\}\)/)?.[1] ?? "";
  const defaults = client.match(/defaultValues:\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.doesNotMatch(confirmation, /email\s*:/);
  assert.doesNotMatch(defaults, /email\s*:/);
  assert.match(confirmation, /phoneNumber\s*:/);
  assert.match(defaults, /phoneNumber\s*:/);
});

test("consulta de checkout e portal validam a titularidade da conta", () => {
  const session = source("../app/api/billing/session/route.ts");
  const portal = source("../app/api/billing/portal/route.ts");
  assert.match(session, /order\.memberAuthUserId !== identity\.id/);
  assert.match(portal, /member\?\.authUserId !== identity\.id/);
  assert.match(session, /getAuthenticatedIdentity\(request\)/);
  assert.match(portal, /getAuthenticatedIdentity\(request\)/);
});

test("webhook reserva o evento, usa pedido local e preserva bloqueio/cortesia", () => {
  const webhook = source("../app/api/billing/webhook/route.ts");
  assert.match(webhook, /onConflictDoNothing\(\)\.returning/);
  assert.match(webhook, /status: "processing"/);
  assert.match(webhook, /checkoutOrders\.stripeSessionId, sessionId/);
  assert.match(webhook, /order\.memberAuthUserId/);
  assert.match(webhook, /\('blocked', 'complimentary'\)/);
  assert.match(webhook, /db\.delete\(stripeEvents\)/);
});

test("checkout sincroniza a assinatura mesmo quando o evento created chega primeiro", () => {
  const webhook = source("../app/api/billing/webhook/route.ts");
  assert.match(webhook, /stripeRequest<StripeObject>/);
  assert.match(webhook, /\/subscriptions\/\$\{encodeURIComponent\(subscriptionId\)\}/);
  assert.match(webhook, /await subscriptionChanged\(subscription\)/);
});

test("a oferta TIME usa a associação completa em toda a concessão", () => {
  const policy = source("../lib/access-policy.ts");
  const admin = source("../app/admin/stripe-finance.tsx");
  const offers = source("../app/api/billing/offers/route.ts");
  const webhook = source("../app/api/billing/webhook/route.ts");
  assert.match(policy, /TIME_MEMBERSHIP_ACCESS_KEY: AccessKey = "membership"/);
  assert.match(policy, /\[TIME_MEMBERSHIP_ACCESS_KEY\]: MEMBER_RESOURCES/);
  assert.match(admin, /accessKey: TIME_MEMBERSHIP_ACCESS_KEY/);
  assert.match(offers, /accessKey: payload\.accessKey \?\? TIME_MEMBERSHIP_ACCESS_KEY/);
  assert.doesNotMatch(webhook, /offer\?\.accessKey \?\? "all_courses"/);
});

test("o Admin permite configurar e visualizar o Price ID persistido na oferta", () => {
  const admin = source("../app/admin/stripe-finance.tsx");
  const offers = source("../app/api/billing/offers/route.ts");
  const checkout = source("../app/api/billing/checkout-session/route.ts");
  assert.match(admin, /id: form\.id \?\? undefined/);
  assert.match(admin, /stripePriceId: form\.stripePriceId\.trim\(\)/);
  assert.match(admin, /Price ID da Stripe/);
  assert.match(admin, /offer\.stripePriceId \|\| "Price ID não configurado"/);
  assert.match(admin, /onClick=\{\(\) => edit\(offer\)\}/);
  assert.match(offers, /stripePriceId: payload\.stripePriceId\?\.trim\(\) \|\| null/);
  assert.match(checkout, /line_items\[0\]\[price\]/);
  assert.match(checkout, /if \(offer\.stripePriceId\)/);
});

test("o suporte usa uma única configuração sem números concorrentes", () => {
  const support = source("../lib/support-contact.ts");
  const surfaces = [
    source("../app/page.tsx"),
    source("../app/checkout/checkout-client.tsx"),
    source("../app/checkout/sucesso/success-client.tsx"),
  ].join("\n");
  assert.match(support, /NEXT_PUBLIC_TIME_SUPPORT_WHATSAPP/);
  assert.match(surfaces, /getSupportWhatsappHref/);
  assert.doesNotMatch(surfaces, /wa\.me\/\d/);
});

test("aceites e cortesia possuem registros separados e auditáveis", () => {
  const schema = source("../db/schema.ts");
  const memberAdmin = source("../app/api/admin/members/[id]/route.ts");
  assert.match(schema, /memberAgreements/);
  assert.match(schema, /memberAccessGrants/);
  assert.match(memberAdmin, /Informe o motivo da gratuidade/);
  assert.match(memberAdmin, /revokedAt/);
  assert.match(memberAdmin, /auditLogs/);
});
