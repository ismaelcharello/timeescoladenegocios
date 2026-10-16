import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
test("curso apresenta aulas por allowlist sem vazar videoKey", () => {
  const presentation = source("../lib/course-presentation.ts");
  const api = source("../app/api/courses/route.ts");
  assert.doesNotMatch(presentation, /\.\.\.lesson/);
  assert.match(api, /presentLesson\(lesson, canAccessLessons/);
});
test("rotas diretas propagam acesso central à plataforma", () => {
  for (const path of ["../app/app/cursos/page.tsx", "../app/app/comunidade/page.tsx", "../app/app/eventos/page.tsx"]) {
    const page = source(path);
    assert.match(page, /requireMemberAccess/);
    assert.match(page, /accessLevel: access\.level/);
    assert.match(page, /permissions: access\.permissions/);
  }
});
test("diretório e WhatsApp passam pela guarda de networking", () => {
  const directory = source("../lib/supabase/directory.ts");
  const networking = source("../lib/networking-access.ts");
  const whatsapp = source("../app/app/membros/[id]/whatsapp/route.ts");
  assert.match(directory, /getNetworkingMember\(\)/);
  assert.match(networking, /getAuthorizedMember\(request, "networking"\)/);
  assert.match(networking, /hasNetworkingProfile/);
  assert.match(whatsapp, /requireNetworkingAccess/);
});
