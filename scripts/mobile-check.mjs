import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const config = await readFile(new URL("../capacitor.config.ts", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const androidManifest = await readFile(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
const androidPolicy = await readFile(new URL("../android/app/src/main/java/br/com/timeescoladenegocios/app/MobilePolicyPlugin.java", import.meta.url), "utf8");
const androidActivity = await readFile(new URL("../android/app/src/main/java/br/com/timeescoladenegocios/app/MainActivity.java", import.meta.url), "utf8");
const iosPolicy = await readFile(new URL("../ios/App/App/SceneDelegate.swift", import.meta.url), "utf8");
const iosEntitlements = await readFile(new URL("../ios/App/App/App.entitlements", import.meta.url), "utf8");

const textExtensions = new Set([".html", ".java", ".json", ".plist", ".swift", ".xml"]);

async function collectTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectTextFiles(path));
    else if (textExtensions.has(extname(entry.name))) files.push(await readFile(path, "utf8"));
  }

  return files;
}

const binaryInputs = await Promise.all([
  collectTextFiles(fileURLToPath(new URL("../mobile-shell", import.meta.url))),
  collectTextFiles(fileURLToPath(new URL("../android/app/src/main", import.meta.url))),
  collectTextFiles(fileURLToPath(new URL("../ios/App/App", import.meta.url))),
]);
const serialized = [config, JSON.stringify(packageJson), ...binaryInputs.flat()].join("\n");

const forbidden = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "sk_live_",
  "rk_live_",
  "sk_test_",
  "rk_test_",
];

for (const value of forbidden) {
  if (serialized.includes(value)) {
    throw new Error(`Configuração mobile contém identificador proibido: ${value}`);
  }
}

if (!config.includes('url: "https://app.timeescoladenegocios.com.br"')) {
  throw new Error("O shell mobile não aponta para o domínio HTTPS oficial.");
}

if (!config.includes('appId: "br.com.timeescoladenegocios.app"')) {
  throw new Error("O identificador estável do app foi alterado.");
}

if (!config.includes('loggingBehavior: "none"')) {
  throw new Error("Logs do Capacitor precisam permanecer desativados no binário de release.");
}

if (!androidManifest.includes('android:usesCleartextTraffic="false"')) {
  throw new Error("O Android não está bloqueando tráfego HTTP em claro.");
}

if (!androidManifest.includes('android:autoVerify="true"')
    || !androidManifest.includes('android:scheme="timeescola" android:host="auth"')) {
  throw new Error("Universal/App Links e o fallback de autenticação não estão completos no Android.");
}

if (!androidActivity.includes("handleIncomingIntent(getIntent())")
    || !androidActivity.includes("setIntent(intent)")) {
  throw new Error("O Android precisa tratar deep links em inicialização fria e com o app aberto.");
}

if (!iosEntitlements.includes("applinks:app.timeescoladenegocios.com.br")
    || !iosPolicy.includes('incomingURL.scheme == "timeescola"')) {
  throw new Error("Universal Links e o fallback de autenticação não estão completos no iOS.");
}

if (!androidPolicy.includes('path.equals("/checkout")') || !iosPolicy.includes('url.path == "/checkout"')) {
  throw new Error("A proteção de checkout mobile não está ativa nos dois projetos.");
}

console.log("Mobile config OK: HTTPS, deep links, checkout protegido, logs de release desativados e nenhum secret embutido.");
