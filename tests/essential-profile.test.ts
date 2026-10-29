import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const {
  essentialProfileFields,
  getMissingEssentialProfileFields,
  isEssentialProfileReady,
  isNetworkingProfileReady,
  profileToDraft,
} = await import(new URL("../lib/member-profile.ts", import.meta.url).href);

const vazio = () => profileToDraft(null, "");
const essencial = () => ({ ...vazio(), full_name: "Maria Souza", whatsapp: "(41) 99999-0000", city: "Curitiba", segment: "Contabilidade" });

test("perfil vazio não libera o uso e lista exatamente os quatro campos essenciais", () => {
  assert.equal(isEssentialProfileReady(vazio()), false);
  assert.equal(getMissingEssentialProfileFields(vazio()).length, essentialProfileFields.length);
  assert.equal(essentialProfileFields.length, 4);
});

test("só o essencial já libera o uso — era aí que o membro novo ficava preso", () => {
  const draft = essencial();
  assert.equal(isEssentialProfileReady(draft), true);
  assert.deepEqual(getMissingEssentialProfileFields(draft), []);
});

test("liberar o uso NÃO transforma o perfil em completo (o diretório segue exigindo tudo)", () => {
  assert.equal(isEssentialProfileReady(essencial()), true);
  assert.equal(isNetworkingProfileReady(essencial()), false, "o nível completo não pode ter sido afrouxado");
});

test("cada campo essencial é de fato exigido", () => {
  for (const campo of essentialProfileFields) {
    const draft = { ...essencial(), [campo]: "" };
    assert.equal(isEssentialProfileReady(draft), false, `sem "${campo}" não deveria liberar`);
  }
});

test("WhatsApp precisa ser um número com DDD, não qualquer texto", () => {
  assert.equal(isEssentialProfileReady({ ...essencial(), whatsapp: "abc" }), false);
  assert.equal(isEssentialProfileReady({ ...essencial(), whatsapp: "99999" }), false);
  assert.equal(isEssentialProfileReady({ ...essencial(), whatsapp: "41999990000" }), true);
});

test("as portas de uso (cursos, comunidade, eventos, home, conexões) usam o essencial e nenhuma sobrou no completo", () => {
  const ler = (c: string) => readFileSync(new URL(c, import.meta.url), "utf8");
  for (const arquivo of ["../app/app/cursos/page.tsx", "../app/app/comunidade/page.tsx", "../app/app/eventos/page.tsx", "../app/app/page.tsx", "../lib/networking-access.ts"]) {
    const src = ler(arquivo);
    assert.ok(src.includes("isEssentialProfileReady"), `${arquivo} deveria usar o nível essencial`);
    assert.ok(!src.includes("isNetworkingProfileReady"), `${arquivo} ainda usa o nível completo como porta`);
  }
});
