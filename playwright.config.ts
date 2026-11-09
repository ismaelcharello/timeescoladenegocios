import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://time-connect-staging.ismaelcharello.chatgpt.site";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  use: {
    baseURL,
    // Medido: com o service worker ativo, cada contexto novo faz o worker
    // pré-carregar "/" e "/offline" no dev server, competindo com a hidratação
    // — 4 falhas em 420 execuções, contra 0 em 390 com ele bloqueado. Em produção
    // isso não existe (build estático). O teste que PRECISA do worker
    // (carregamento.spec.ts) o reativa; o comportamento offline é coberto por
    // tests/sw-offline.test.mjs.
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile-360", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 } } },
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "tablet-768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1024", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } } },
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
