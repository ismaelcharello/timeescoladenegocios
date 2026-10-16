import { mkdir, writeFile } from "node:fs/promises";

const teamId = process.env.APPLE_TEAM_ID?.trim().toUpperCase();
const fingerprint = process.env.ANDROID_SHA256_CERT_FINGERPRINT?.trim().toUpperCase();
const bundleId = "br.com.timeescoladenegocios.app";
const output = new URL("../public/.well-known/", import.meta.url);

if (!/^[A-Z0-9]{10}$/.test(teamId ?? "")) {
  throw new Error("Defina APPLE_TEAM_ID com o Team ID de 10 caracteres da conta Apple Developer.");
}

if (!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(fingerprint ?? "")) {
  throw new Error("Defina ANDROID_SHA256_CERT_FINGERPRINT com o SHA-256 do certificado de upload/release.");
}

const aasa = {
  applinks: {
    apps: [],
    details: [{
      appID: `${teamId}.${bundleId}`,
      paths: ["NOT /checkout", "NOT /checkout/*", "*"],
    }],
  },
};

const assetLinks = [{
  relation: ["delegate_permission/common.handle_all_urls"],
  target: {
    namespace: "android_app",
    package_name: bundleId,
    sha256_cert_fingerprints: [fingerprint],
  },
}];

await mkdir(output, { recursive: true });
await Promise.all([
  writeFile(new URL("apple-app-site-association", output), `${JSON.stringify(aasa, null, 2)}\n`, "utf8"),
  writeFile(new URL("assetlinks.json", output), `${JSON.stringify(assetLinks, null, 2)}\n`, "utf8"),
]);

console.log("Arquivos de associação gerados em public/.well-known/. Revise antes de publicar na Web.");
