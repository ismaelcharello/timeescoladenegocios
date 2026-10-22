import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("membership inclui os módulos V1 protegidos", () => {
  const policy = source("../lib/access-policy.ts");
  assert.match(policy, /"courses", "networking", "community", "events", "podcasts", "benefits", "ombudsman"/);
  assert.match(policy, /\[TIME_MEMBERSHIP_ACCESS_KEY\]: MEMBER_RESOURCES/);
});

test("benefícios e ouvidoria usam a política central", () => {
  assert.match(source("../app/api/benefits/route.ts"), /getAuthorizedMember\(request, "benefits"\)/);
  assert.match(source("../app/api/ombudsman/route.ts"), /getAuthorizedMember\(request, "ombudsman"\)/);
  assert.match(source("../app/app/beneficios/page.tsx"), /requireMemberAccess\("\/app\/beneficios", "benefits"\)/);
  assert.match(source("../app/app/ouvidoria/page.tsx"), /requireMemberAccess\("\/app\/ouvidoria", "ombudsman"\)/);
});

test("ouvidoria preserva o formulário durante o envio assíncrono", () => {
  const form = source("../app/app/ouvidoria/ombudsman-form.tsx");
  assert.match(form, /const formElement = event\.currentTarget/);
  assert.match(form, /formElement\.reset\(\)/);
  assert.doesNotMatch(form, /event\.currentTarget\.reset\(\)/);
});

test("catálogo de benefícios possui busca, filtro e detalhe funcional", () => {
  const catalog = source("../app/app/beneficios/benefits-catalog.tsx");
  assert.match(catalog, /placeholder="Busque por benefício, categoria ou abrangência"/);
  assert.match(catalog, /Todas as categorias/);
  assert.match(catalog, /setSelected\(item\)/);
  assert.match(catalog, /role="dialog"/);
});

test("migration de staging cria seeds identificados e sem parceiro inventado", () => {
  const migration = source("../drizzle/0016_staging_e2e_support.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `benefits`/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `ombudsman_messages`/);
  assert.match(migration, /\[HOMOLOGAÇÃO\] Benefício Educação/);
  assert.match(migration, /Não representa parceiro ou desconto real/);
});

test("a marca TIME usa versões oficiais com contraste adequado nos shells principais", () => {
  const logo = source("../app/time-logo.tsx");
  assert.match(logo, /time-logo-oficial-blue\.png/);
  assert.match(logo, /time-logo-oficial-white\.png/);

  const brandedShells = [
    "../app/page.tsx",
    "../app/(auth)/auth-shell.tsx",
    "../app/app/cadastro/onboarding-form.tsx",
    "../app/app/member-frame.tsx",
    "../app/admin/admin-platform.tsx",
    "../app/checkout/checkout-client.tsx",
    "../app/checkout/sucesso/success-client.tsx",
    "../app/legal-page.tsx",
    "../app/access-gate.tsx",
    "../app/admin/eventos/[id]/check-in/check-in-console.tsx",
    "../app/admin/podcasts/page.tsx",
  ];

  for (const shell of brandedShells) assert.match(source(shell), /<TimeLogo\s/);
});

test("Admin gerencia benefícios e Ouvidoria com autorização e estados persistentes", () => {
  const benefitsApi = source("../app/api/admin/benefits/route.ts");
  const ombudsmanApi = source("../app/api/ombudsman/route.ts");
  const admin = source("../app/admin/admin-platform.tsx");

  assert.match(benefitsApi, /isAdminRequest\(request\)/);
  assert.match(benefitsApi, /z\.enum\(\["active", "inactive", "coming_soon"\]\)/);
  assert.match(benefitsApi, /getDb\(\)\.insert\(benefits\)/);
  assert.match(benefitsApi, /getDb\(\)\.update\(benefits\)/);
  assert.match(ombudsmanApi, /isAdminRequest\(request\)/);
  assert.match(ombudsmanApi, /"received", "in_progress", "completed"/);
  assert.match(admin, /title="Clube de Benefícios"/);
  assert.match(admin, /title="Ouvidoria"/);
  assert.match(admin, /Novo benefício/);
  assert.match(admin, /Caixa de entrada/);
});
