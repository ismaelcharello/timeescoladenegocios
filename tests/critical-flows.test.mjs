import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { registerHooks } from "node:module";
import test from "node:test";

// Node strips TypeScript natively, while this hook resolves the extensionless
// project imports used by the application modules under test.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^\.{1,2}\//.test(specifier) && context.parentURL?.startsWith("file:")) {
      const resolved = new URL(specifier, context.parentURL);
      if (!extname(resolved.pathname)) {
        for (const suffix of [".ts", ".tsx", "/index.ts"]) {
          const candidate = new URL(`${specifier}${suffix}`, context.parentURL);
          if (existsSync(fileURLToPath(candidate))) {
            return { url: candidate.href, shortCircuit: true };
          }
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const { safeReturnPath } = await import(new URL("../lib/auth-redirect.ts", import.meta.url).href);
const {
  calculateProfileCompleteness,
  completionFields,
  getMissingProfileFields,
  getMissingRequiredProfileFields,
  isNetworkingProfileReady,
  profileFieldLabels,
  profileToDraft,
  requiredProfileFields,
} = await import(new URL("../lib/member-profile.ts", import.meta.url).href);
const { presentLesson } = await import(new URL("../lib/course-presentation.ts", import.meta.url).href);

test("login, sessão e logout usam os fluxos autenticados e retorno interno seguro", () => {
  assert.equal(safeReturnPath("/app/cursos?curso=1#modulo"), "/app/cursos?curso=1#modulo");
  assert.equal(safeReturnPath("https://malicioso.test/app"), "/app");
  assert.equal(safeReturnPath("//malicioso.test/app"), "/app");
  assert.equal(safeReturnPath("/auth/confirm?retorno=/app"), "/app");
  assert.equal(safeReturnPath("/entrar"), "/app");

  const form = source("../app/(auth)/auth-form.tsx");
  const auth = source("../lib/auth.ts");
  const sessionProxy = source("../lib/supabase/proxy.ts");
  const signout = source("../app/auth/signout/route.ts");

  assert.match(form, /signInWithPassword\(\{[\s\S]*?email: normalizedEmail,[\s\S]*?password/);
  assert.match(form, /window\.location\.assign\(returnTo\)/);
  assert.match(form, /sessionStorage\.setItem\(AUTH_DRAFT_KEY/);
  assert.doesNotMatch(form, /saveDraft\(\{\s*password/);
  assert.doesNotMatch(form, /auth\.signOut\(/);
  assert.match(auth, /supabase\.auth\.getUser\(\)/);
  assert.match(auth, /\.from\("app_roles"\)/);
  assert.match(sessionProxy, /supabase\.auth\.getClaims\(\)/);
  assert.match(signout, /supabase\.auth\.signOut\(\)/);
  assert.match(signout, /export const GET = signOut/);
  assert.match(signout, /export const POST = signOut/);
});

test("onboarding calcula completude pelos campos persistidos, sem percentual arbitrário", () => {
  const empty = profileToDraft(null, "");
  assert.equal(calculateProfileCompleteness(empty), 0);

  const existing = profileToDraft({
    full_name: "Ana Silva",
    company_name: "Empresa Exemplo",
    looking_for: "Parceiros comerciais",
  }, "Nome alternativo");
  assert.equal(existing.full_name, "Ana Silva");
  assert.equal(existing.company_name, "Empresa Exemplo");
  assert.equal(existing.looking_for, "Parceiros comerciais");

  const partiallyCompleted = { ...empty, full_name: "Ana Silva", company_name: "Empresa Exemplo" };
  assert.equal(
    calculateProfileCompleteness(partiallyCompleted),
    Math.round((2 / completionFields.length) * 100),
  );
  assert.equal(getMissingProfileFields(partiallyCompleted).includes(profileFieldLabels.full_name), false);
  assert.equal(getMissingProfileFields(partiallyCompleted).includes(profileFieldLabels.services), true);

  const complete = Object.fromEntries(Object.keys(profileFieldLabels).map((field) => [field, "Informado"]));
  assert.equal(calculateProfileCompleteness(complete), 100);
  assert.deepEqual(getMissingProfileFields(complete), []);
});

test("perfil libera networking pelos campos essenciais, não por 100% visual", () => {
  const draft = profileToDraft(null, "");
  for (const field of requiredProfileFields) draft[field] = "Informado";
  draft.full_name = "Ana Silva";
  draft.whatsapp = "41999999999";
  draft.state = "PR";

  assert.equal(isNetworkingProfileReady(draft), true);
  assert.deepEqual(getMissingRequiredProfileFields(draft), []);
  assert.ok(calculateProfileCompleteness(draft) < 100);

  draft.services = "";
  assert.equal(isNetworkingProfileReady(draft), false);
  assert.deepEqual(getMissingRequiredProfileFields(draft), [profileFieldLabels.services]);

  draft.services = "Informado";
  draft.whatsapp = "123";
  assert.equal(isNetworkingProfileReady(draft), false);
  assert.deepEqual(getMissingRequiredProfileFields(draft), [profileFieldLabels.whatsapp]);
});

test("onboarding salva por usuário e recarrega o perfil existente para edição", () => {
  const page = source("../app/app/cadastro/page.tsx");
  const form = source("../app/app/cadastro/onboarding-form.tsx");
  const api = source("../lib/member-profile-api.ts");

  assert.match(page, /requireUser\("\/app\/cadastro"\)/);
  assert.match(page, /\.eq\("user_id", user\.id\)\.maybeSingle\(\)/);
  assert.match(page, /initialProfile=/);
  assert.match(form, /profileToDraft\(initialProfile, user\.name\)/);
  assert.match(form, /fetch\("\/api\/member-profile", \{/);
  assert.match(form, /credentials: "same-origin"/);
  assert.match(form, /JSON\.stringify\(\{ draft, currentStep: step, finalize \}\)/);
  assert.match(api, /if \(!identity \|\| !supabase\)/);
  assert.match(api, /user_id: identity\.id/);
  assert.match(api, /finalize && !networkingReady/);
  assert.match(api, /completed_at: null/);
  assert.match(api, /\.upsert\(payload, \{ onConflict: "user_id" \}\)/);
});

test("cadastro novo sempre segue para onboarding e login preserva o retorno", () => {
  const form = source("../app/(auth)/auth-form.tsx");
  const config = source("../lib/supabase/config.ts");
  const browserClient = source("../lib/supabase/client.ts");
  assert.match(form, /NEW_MEMBER_ONBOARDING_PATH = "\/app\/cadastro"/);
  assert.match(form, /emailRedirectTo: `\$\{window\.location\.origin\}\/auth\/confirm\?retorno=\$\{encodeURIComponent\(NEW_MEMBER_ONBOARDING_PATH\)\}`/);
  assert.match(form, /if \(!data\.user\)/);
  assert.match(form, /data\.user\.identities\?\.length === 0/);
  assert.match(form, /window\.location\.assign\(NEW_MEMBER_ONBOARDING_PATH\)/);
  assert.match(form, /if \(mode === "login"\)[\s\S]*?window\.location\.assign\(returnTo\)/);
  assert.match(config, /process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(config, /process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(config, /supabase\.co|sb_publishable_/);
  assert.doesNotMatch(browserClient, /process\.env|getSupabasePublicConfig/);
});

test("curso bloqueado não serializa videoKey, videoUrl nem progresso privado", () => {
  const privateVideo = "https://youtu.be/abcdefghijk";
  const lesson = {
    id: 10,
    courseId: 3,
    moduleId: 2,
    moduleTitle: "Fundamentos",
    title: "Aula protegida",
    description: "Metadado público",
    videoKey: privateVideo,
    durationSeconds: 900,
    position: 1,
    isPreview: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const progress = {
    id: 8,
    memberEmail: "membro@time.test",
    lessonId: lesson.id,
    watchSeconds: 420,
    completed: false,
    updatedAt: "2026-01-02T00:00:00.000Z",
  };

  const locked = presentLesson(lesson, false, progress);
  assert.equal(Object.hasOwn(locked, "videoKey"), false);
  assert.equal(Object.hasOwn(locked, "videoUrl"), false);
  assert.equal(locked.progress, null);
  assert.doesNotMatch(JSON.stringify(locked), /abcdefghijk|membro@time\.test/);

  const allowed = presentLesson(lesson, true, progress);
  assert.equal(allowed.videoUrl, privateVideo);
  assert.equal(allowed.progress?.watchSeconds, 420);

  const uploaded = presentLesson({ ...lesson, videoKey: "videos/aula privada.mp4" }, true);
  assert.equal(uploaded.videoUrl, "/api/uploads?key=videos%2Faula%20privada.mp4");
  assert.equal(Object.hasOwn(uploaded, "videoKey"), false);
});

test("APIs críticas aplicam autorização antes de ler dados protegidos", () => {
  const guardedRoutes = [
    ["../app/api/events/route.ts", "events"],
    ["../app/api/community/route.ts", "community"],
    ["../app/api/community/[id]/route.ts", "community"],
    ["../app/api/community/[id]/comments/route.ts", "community"],
    ["../app/api/progress/route.ts", "courses"],
    ["../app/api/lesson-notes/route.ts", "courses"],
    ["../app/api/reviews/route.ts", "courses"],
  ];

  for (const [path, resource] of guardedRoutes) {
    const route = source(path);
    const guard = `getAuthorizedMember(request, "${resource}")`;
    const handlers = route
      .split(/(?=export async function (?:GET|POST)\()/)
      .filter((part) => part.startsWith("export async function"));
    assert.ok(handlers.length > 0, `${path} não possui handler testável`);
    for (const handler of handlers) {
      const guardIndex = handler.indexOf(guard);
      const protectedOperation = ["getDb()", "publishedPostExists(", "ensureNoiteDeNegociosEvent()", "request.json()"]
        .map((marker) => handler.indexOf(marker))
        .filter((index) => index >= 0)
        .sort((left, right) => left - right)[0];
      assert.ok(guardIndex >= 0, `${path} não usa a guarda ${resource}`);
      assert.ok(protectedOperation === undefined || guardIndex < protectedOperation, `${path} acessa dados antes da guarda`);
      assert.match(handler, /status: 403/);
    }
  }

  const courses = source("../app/api/courses/route.ts");
  assert.ok(courses.indexOf("getMemberAccess(request)") < courses.indexOf("getDb()"));
  assert.match(courses, /canAccessResource\(access, "courses"\)/);
  assert.match(courses, /presentLesson\(lesson, canAccessLessons/);
});

test("diretório, busca, perfil e WhatsApp exigem networking no servidor", () => {
  const listPage = source("../app/app/membros/page.tsx");
  const searchPage = source("../app/app/conexoes/page.tsx");
  const profilePage = source("../app/app/membros/[id]/page.tsx");
  const whatsapp = source("../app/app/membros/[id]/whatsapp/route.ts");
  const directoryClient = source("../lib/supabase/directory.ts");
  const directory = source("../lib/member-directory.ts");

  assert.match(listPage, /requireNetworkingAccess\("\/app\/membros"\)/);
  assert.match(searchPage, /requireNetworkingAccess\("\/app\/conexoes"\)/);
  assert.match(profilePage, /requireNetworkingAccess\(`\/app\/membros\/\$\{id\}`\)/);
  assert.match(whatsapp, /requireNetworkingAccess\(`\/app\/membros\/\$\{id\}\/whatsapp`\)/);
  assert.ok(whatsapp.indexOf("requireNetworkingAccess") < whatsapp.indexOf("get_member_whatsapp"));
  assert.match(directoryClient, /getNetworkingMember\(\)/);
  assert.match(directoryClient, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(directoryClient, /if \(!config \|\| !key\) return null/);
  assert.doesNotMatch(directoryClient, /publishableKey/);
  assert.match(directory, /if \(!supabase\) return \{ members: \[\]/);
  assert.match(directory, /rpc\("search_member_directory"/);
  assert.match(directory, /rpc\("get_member_directory_profile"/);
});

test("rotas diretas mantêm o estado central de acesso e conexões bloqueia lead", () => {
  for (const path of [
    "../app/app/cursos/page.tsx",
    "../app/app/comunidade/page.tsx",
    "../app/app/eventos/page.tsx",
  ]) {
    const page = source(path);
    assert.match(page, /requireMemberAccess/);
    assert.match(page, /accessLevel: access\.level/);
    assert.match(page, /accessStatus: access\.status/);
    assert.match(page, /permissions: access\.permissions/);
  }

  const connections = source("../app/app/conexoes/page.tsx");
  assert.match(connections, /requireNetworkingAccess\("\/app\/conexoes"\)/);
});
