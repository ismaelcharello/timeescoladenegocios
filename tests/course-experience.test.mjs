import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getEmbedVideoUrl, getExternalVideoProvider } from "../lib/video-hosting.ts";

test("o player de curso ocupa o frame 16:9 sem herdar o tamanho intrínseco do iframe", () => {
  const css = readFileSync(new URL("../app/platform.css", import.meta.url), "utf8");
  const memberPlatform = readFileSync(new URL("../app/app/member-platform.tsx", import.meta.url), "utf8");
  assert.match(css, /\.course-player-stage \.real-video-frame \{[\s\S]*?aspect-ratio: 16 \/ 9;/);
  assert.match(css, /\.course-player-stage \.real-video-frame > :is\(iframe, video\) \{[\s\S]*?width: 100% !important;[\s\S]*?height: 100% !important;/);
  assert.match(memberPlatform, /allowFullScreen loading="lazy"/);
  assert.match(memberPlatform, /aria-pressed=\{theaterMode\}/);
  assert.match(css, /\.real-course-viewer\.theater-mode[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
});

test("o fluxo de autenticação preserva o retorno e não encerra a sessão ao redefinir senha", () => {
  const authForm = readFileSync(new URL("../app/(auth)/auth-form.tsx", import.meta.url), "utf8");
  assert.match(authForm, /const AUTH_DRAFT_KEY = "time-auth-draft-v1"/);
  assert.match(authForm, /function goBack\(\)/);
  assert.match(authForm, /window\.history\.back\(\)/);
  assert.match(authForm, /window\.location\.assign\("\/"\)/);
  assert.match(authForm, /resetPath = `\/redefinir-senha\?retorno=/);
  assert.doesNotMatch(authForm, /await supabase\.auth\.signOut\(\);/);
});

test("URLs autorizadas de YouTube, Vimeo e Panda são normalizadas sem aceitar hosts arbitrários", () => {
  const youtubeId = "abcdefghijk";
  const youtubeCases = [
    `https://www.youtube.com/watch?v=${youtubeId}`,
    `https://youtu.be/${youtubeId}`,
    `https://youtube.com/embed/${youtubeId}`,
    `https://youtube.com/shorts/${youtubeId}`,
    `https://youtube.com/live/${youtubeId}`,
  ];

  for (const url of youtubeCases) {
    assert.equal(getExternalVideoProvider(url), "youtube");
    assert.match(getEmbedVideoUrl(url), new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${youtubeId}\\?`));
  }

  assert.match(getEmbedVideoUrl(`https://youtu.be/${youtubeId}?t=42`), /start=42/);
  assert.equal(getEmbedVideoUrl("https://example.com/video/abcdefghijk"), "");
  assert.equal(getEmbedVideoUrl(`http://youtube.com/watch?v=${youtubeId}`), "");
  assert.equal(getEmbedVideoUrl("https://vimeo.com/123456789"), "https://player.vimeo.com/video/123456789");
  assert.equal(getExternalVideoProvider("https://player-vz-a1b2c3.tv.pandavideo.com.br/embed/?v=123"), "panda");
});

test("eventos são administrados pelo CRUD e a inscrição exige confirmação", () => {
  const eventStore = readFileSync(new URL("../lib/event-checkin-store.ts", import.meta.url), "utf8");
  const eventsApi = readFileSync(new URL("../app/api/events/route.ts", import.meta.url), "utf8");
  const adminEventsApi = readFileSync(new URL("../app/api/admin/events/route.ts", import.meta.url), "utf8");
  const memberPlatform = readFileSync(new URL("../app/app/member-platform.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(eventStore, /noite-de-negocios-2026|ensureNoiteDeNegociosEvent/);
  assert.doesNotMatch(eventsApi, /ensureNoiteDeNegociosEvent/);
  assert.match(adminEventsApi, /export async function POST/);
  assert.match(adminEventsApi, /export async function PATCH/);
  assert.match(adminEventsApi, /export async function DELETE/);
  assert.match(memberPlatform, /Confirmo minha presença/);
  assert.match(memberPlatform, /"Confirmar inscrição"/);
  assert.match(memberPlatform, /eventCoverUrl\(event\)/);
});

test("o formulário de evento coleta contato e só registra presença confirmada", () => {
  const eventsApi = readFileSync(new URL("../app/api/events/route.ts", import.meta.url), "utf8");
  const memberPlatform = readFileSync(new URL("../app/app/member-platform.tsx", import.meta.url), "utf8");

  assert.match(memberPlatform, /Dados do participante/);
  assert.match(memberPlatform, /WhatsApp <em>obrigatório<\/em>/);
  assert.match(memberPlatform, /registration: \{ \.\.\.registrationData, confirmed: presenceConfirmed \}/);
  assert.match(eventsApi, /parseRegistration/);
  assert.match(eventsApi, /registration\.phone\.replace\(\/\\D\/g, ""\)\.length < 8/);
  assert.match(eventsApi, /company: registration\.company/);
});
