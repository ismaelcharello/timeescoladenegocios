import assert from "node:assert/strict";
import test from "node:test";
const { detectInstallMode, isDismissed, isIosDevice } = await import(new URL("../lib/pwa-install.ts", import.meta.url).href);

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15";
const base = { userAgent: ANDROID, standalone: false, hasPromptEvent: false };

test("já instalado: não mostra nada, mesmo no iPhone ou com evento de instalação", () => {
  assert.equal(detectInstallMode({ ...base, userAgent: IPHONE, standalone: true }), "installed");
  assert.equal(detectInstallMode({ ...base, standalone: true, hasPromptEvent: true }), "installed");
});

test("Android/Chrome com o evento beforeinstallprompt: oferece o botão de instalar", () => {
  assert.equal(detectInstallMode({ ...base, hasPromptEvent: true }), "prompt");
});

test("iPhone não tem evento de instalação: mostra a instrução manual", () => {
  assert.equal(detectInstallMode({ ...base, userAgent: IPHONE }), "ios");
});

test("iPad moderno se apresenta como Mac, e só a tela de toque o denuncia", () => {
  assert.equal(isIosDevice({ userAgent: MAC, platform: "MacIntel", maxTouchPoints: 5 }), true);
  assert.equal(isIosDevice({ userAgent: MAC, platform: "MacIntel", maxTouchPoints: 0 }), false, "um Mac de verdade não é iOS");
});

test("computador comum e Android sem o evento: não incomoda", () => {
  assert.equal(detectInstallMode({ ...base, userAgent: MAC, platform: "MacIntel", maxTouchPoints: 0 }), "none");
  assert.equal(detectInstallMode(base), "none");
});

test("dispensar vale por 14 dias, não para sempre", () => {
  const agora = Date.now(), dia = 864e5;
  assert.equal(isDismissed(String(agora - 13 * dia), agora), true);
  assert.equal(isDismissed(String(agora - 15 * dia), agora), false, "depois de 14 dias o aviso volta");
  assert.equal(isDismissed(null, agora), false);
  assert.equal(isDismissed("lixo", agora), false, "valor corrompido não pode esconder o aviso");
});
