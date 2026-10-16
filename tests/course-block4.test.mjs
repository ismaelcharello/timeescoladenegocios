import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { materialDeliveryUrl, normalizeMaterialUrl } from "../lib/learning-content.ts";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("a migration do Bloco 4 preserva registros existentes com defaults compatíveis", () => {
  const migration = source("../drizzle/0010_chemical_lionheart.sql");
  assert.match(migration, /CREATE TABLE `lesson_materials`/);
  assert.match(migration, /CREATE TABLE `lesson_reviews`/);
  assert.match(migration, /ALTER TABLE `courses` ADD `position` integer DEFAULT 0 NOT NULL/);
  assert.match(migration, /ALTER TABLE `lessons` ADD `status` text DEFAULT 'published' NOT NULL/);
  assert.match(migration, /ALTER TABLE `member_progress` ADD `started_at` text/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|UPDATE `(?:courses|lessons|member_progress)`/);
});

test("materiais aceitam somente HTTPS e arquivos usam entrega protegida", () => {
  assert.equal(normalizeMaterialUrl("https://docs.example.com/material.pdf"), "https://docs.example.com/material.pdf");
  assert.equal(normalizeMaterialUrl("http://docs.example.com/material.pdf"), null);
  assert.equal(normalizeMaterialUrl("javascript:alert(1)"), null);
  assert.equal(normalizeMaterialUrl("https://user:secret@docs.example.com/a"), null);
  assert.equal(materialDeliveryUrl({ kind: "file", storageKey: "materials/aula.pdf", externalUrl: null }), "/api/uploads?key=materials%2Faula.pdf&download=1");
  assert.equal(materialDeliveryUrl({ kind: "file", storageKey: "community/aula.pdf", externalUrl: null }), "");
});

test("recursos da aula exigem associação antes de acessar banco ou payload", () => {
  const route = source("../app/api/lesson-experience/route.ts");
  for (const handler of route.split(/(?=export async function (?:GET|POST)\()/).filter((part) => part.startsWith("export async function"))) {
    const guard = handler.indexOf('getAuthorizedMember(request, "courses")');
    const database = handler.indexOf("getDb()");
    const body = handler.indexOf("request.json()");
    assert.ok(guard >= 0);
    assert.ok(database < 0 || guard < database);
    assert.ok(body < 0 || guard < body);
    assert.match(handler, /status: 403/);
  }
  assert.match(route, /publishedLessonExists\(lessonId\)/);
  assert.doesNotMatch(route, /videoKey|videoUrl/);
});

test("progresso só começa após reprodução ou conclusão explícita", () => {
  const progress = source("../app/api/progress/route.ts");
  const member = source("../app/app/member-platform.tsx");
  assert.match(progress, /payload\.started \|\| payload\.completed \|\| Number\(payload\.watchSeconds\) > 0/);
  assert.match(progress, /O progresso só é iniciado por uma ação de reprodução ou conclusão/);
  assert.match(progress, /startedAt: sql`coalesce/);
  assert.match(member, /onClick=\{startPlayer\}/);
  assert.match(member, /Seu progresso começa somente após esta ação/);
  assert.match(member, /Marcar como concluída/);
  assert.doesNotMatch(member, /activeTab === "lesson" \? lesson \? <><div className="video-frame/);
});

test("notas têm autosave por aula e materiais privados exigem curso autorizado", () => {
  const member = source("../app/app/member-platform.tsx");
  const notes = source("../app/api/lesson-notes/route.ts");
  const uploads = source("../app/api/uploads/route.ts");
  assert.match(member, /window\.setTimeout\(\(\) => \{ void persistNote\(lessonId, note, true\); \}, 1_200\)/);
  assert.match(member, /if \(lesson && noteLoadedFor === lesson\.id && note !== savedNote\)/);
  assert.match(notes, /lessonNotes\.memberEmail, identity\.email/);
  assert.match(notes, /lessonNotes\.lessonId, lessonId/);
  assert.match(uploads, /key\.startsWith\("materials\/"\)/);
  assert.match(uploads, /getAuthorizedMember\(request, key\.startsWith\("community\/"\) \? "community" : "courses"\)/);
  assert.match(uploads, /publishedLessonExists\(material\.lessonId\)/);
});

test("admin gerencia módulos, aulas, materiais e moderação com guarda server-side", () => {
  const adminRoute = source("../app/api/admin/course-content/route.ts");
  const adminUi = source("../app/admin/admin-platform.tsx");
  assert.ok(adminRoute.indexOf("isAdminRequest(request)") < adminRoute.indexOf("request.json()"));
  for (const action of ["module.upsert", "module.reorder", "lesson.upsert", "lesson.reorder", "material.upsert", "review.moderate"]) {
    assert.match(adminRoute, new RegExp(action.replace(".", "\\.")));
  }
  assert.match(adminRoute, /Mova ou exclua as aulas antes de excluir o módulo/);
  assert.match(adminUi, /addMaterialFile/);
  assert.match(adminUi, /toggleLesson/);
  assert.match(adminUi, /moderateReview/);
});

test("aulas em rascunho não são liberadas na API de membros", () => {
  const courses = source("../app/api/courses/route.ts");
  const access = source("../lib/course-access.ts");
  assert.match(courses, /lesson\.status === "published"/);
  assert.match(access, /eq\(lessons\.status, "published"\)/);
  assert.match(courses, /presentLesson\(lesson, canAccessLessons/);
});
