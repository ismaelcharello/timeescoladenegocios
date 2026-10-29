import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * A identidade de teste (lib/dev-identity.ts) dá acesso de admin sem senha. Ela
 * NUNCA pode estar no que é publicado. Este teste olha o ARTEFATO gerado, não o
 * código-fonte: o que importa é o que vai ao ar. Exige `vinext build` feito.
 */
const dist = new URL("../dist/", import.meta.url).pathname;

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

test("o bundle publicado não contém a identidade de teste", { skip: !existsSync(dist) && "rode `vinext build` antes" }, () => {
  const alvos = arquivos(dist).filter((f) => /\.(js|mjs|json|html|map)$/.test(f));
  assert.ok(alvos.length > 0);

  // Controle positivo: sem isto, "não achei" poderia ser "dist vazio/errado".
  const todos = alvos.map((f) => readFileSync(f, "utf8")).join("\n");
  assert.ok(todos.includes("getAuthenticatedIdentity"), "o bundle não parece ser o de produção");

  for (const segredo of ["__TIME_DEV_IDENTITY__", "time-dev-identity", "membro.teste@time.local", "admin.teste@time.local", "getDevIdentity"]) {
    assert.ok(!todos.includes(segredo), `"${segredo}" vazou para o bundle de produção`);
  }
});

test("a identidade de teste só é importada atrás de import.meta.env.DEV", () => {
  const auth = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
  const ocorrencias = auth.split("dev-identity").length - 1;
  assert.equal(ocorrencias, 1, "lib/auth.ts deve importar dev-identity em um único lugar");
  assert.match(auth, /if \(import\.meta\.env\.DEV\) \{\s*const \{ getDevIdentity \} = await import\("@\/lib\/dev-identity"\)/);

  const rota = readFileSync(new URL("../app/dev/login/route.ts", import.meta.url), "utf8");
  assert.match(rota, /if \(!import\.meta\.env\.DEV \|\| !\(await isLocalRequest\(\)\)\)/);
});
