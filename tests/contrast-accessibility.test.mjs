import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const platformCss = readFileSync(new URL("../app/platform.css", import.meta.url), "utf8");
const authCss = readFileSync(new URL("../app/(auth)/auth.css", import.meta.url), "utf8");
const onboardingCss = readFileSync(new URL("../app/app/cadastro/onboarding.css", import.meta.url), "utf8");
const playwrightConfig = readFileSync(new URL("../playwright.config.ts", import.meta.url), "utf8");

test("landing mantém hierarquia clara em todas as superfícies escuras", () => {
  assert.match(globalCss, /--time-on-dark-muted: #d2cfdd/);
  assert.match(globalCss, /\.hero-description,[\s\S]*?color: var\(--time-on-dark-muted\)/);
  assert.match(globalCss, /\.community-stat-connections span \{[\s\S]*?color: #fff/);
  assert.match(globalCss, /\.time-landing :is\(a, button, summary\):focus-visible/);
});

test("autenticação e onboarding expõem foco, placeholder e estados desabilitados", () => {
  assert.match(authCss, /\.auth-form :is\(input, button, a\):focus-visible/);
  assert.match(authCss, /\.auth-submit:disabled \{[^}]*background: var\(--text-muted\); color: var\(--surface\); opacity: 1;/);
  assert.match(onboardingCss, /\.onboarding-sidebar nav button:disabled \{ color: rgba\(255, 255, 255, \.62\); opacity: 1; \}/);
  assert.match(onboardingCss, /\.onboarding-actions button:disabled \{ border-color: #c7c3cf; background: #ddd9e2; color: #5d5968; opacity: 1; \}/);
});

test("área de membros diferencia superfícies claras e escuras", () => {
  assert.match(platformCss, /\.member-app\.theme-dark \.member-content :is\(p, small, label, time\)/);
  assert.match(platformCss, /\.member-app\.theme-light \.member-content :is\(p, small, label, time\)/);
  assert.match(platformCss, /\.member-home-next-action,[\s\S]*?\.new-post-card[\s\S]*?color: #fff/);
});

test("admin tem texto operacional legível e foco visível", () => {
  assert.match(platformCss, /\.admin-kpis article span,[\s\S]*?font-size: 11px/);
  assert.match(platformCss, /:is\(\.member-app, \.admin-app, \.time-app\) :is\(a, button, input, textarea, select, summary\):focus-visible/);
  assert.match(platformCss, /\.admin-app button:disabled \{[\s\S]*?color: #d8d5e1/);
});

test("os cinco viewports continuam cobertos pelos contratos responsivos", () => {
  for (const viewport of [360, 390, 768, 1024, 1440]) {
    assert.match(playwrightConfig, new RegExp(`width: ${viewport}`));
  }
});
