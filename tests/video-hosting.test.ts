import assert from "node:assert/strict";
import test from "node:test";
const { getEmbedVideoUrl, getExternalVideoProvider, normalizeExternalVideoUrl } = await import(new URL("../lib/video-hosting.ts", import.meta.url).href);

test("YouTube: todas as formas de link viram o mesmo embed sem cookies", () => {
  const esperado = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1";
  for (const link of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ",
  ]) assert.equal(getEmbedVideoUrl(link), esperado, link);
});

test("YouTube: o instante inicial é preservado e valida só dígitos", () => {
  assert.match(getEmbedVideoUrl("https://youtu.be/dQw4w9WgXcQ?t=90"), /start=90/);
  assert.doesNotMatch(getEmbedVideoUrl("https://youtu.be/dQw4w9WgXcQ?t=90%22%3E"), /start=/);
});

test("Vimeo público vira o player pelo id", () => {
  assert.equal(getEmbedVideoUrl("https://vimeo.com/123456789"), "https://player.vimeo.com/video/123456789");
});

test("Vimeo NÃO LISTADO mantém o hash de privacidade — sem ele o player recusa o vídeo", () => {
  assert.equal(getEmbedVideoUrl("https://vimeo.com/123456789/a1b2c3d4e5"), "https://player.vimeo.com/video/123456789?h=a1b2c3d4e5");
  assert.equal(
    getEmbedVideoUrl("https://player.vimeo.com/video/123456789?h=a1b2c3d4e5"),
    "https://player.vimeo.com/video/123456789?h=a1b2c3d4e5",
  );
});

test("Vimeo: hash malformado é descartado, não injetado", () => {
  assert.equal(getEmbedVideoUrl("https://vimeo.com/123456789/ab"), "https://player.vimeo.com/video/123456789");
  assert.equal(getEmbedVideoUrl("https://vimeo.com/123456789?h=x%22onload%3Dalert(1)"), "https://player.vimeo.com/video/123456789");
});

test("links hostis ou de outro domínio nunca viram embed", () => {
  for (const link of [
    "javascript:alert(1)",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://vimeo.com.evil.com/123456789",
    "https://evilvimeo.com/123456789",
    "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
    "https://example.com/video.mp4",
    "isto não é um link",
    "",
  ]) {
    assert.equal(getEmbedVideoUrl(link), "", `"${link}" não deveria virar embed`);
    assert.equal(getExternalVideoProvider(link), null, `"${link}" não deveria ter provedor`);
    assert.equal(normalizeExternalVideoUrl(link), null);
  }
});

test("URL sem id reconhecível não gera embed quebrado", () => {
  assert.equal(getEmbedVideoUrl("https://www.youtube.com/watch"), "");
  assert.equal(getEmbedVideoUrl("https://vimeo.com/canal/nome"), "");
});
