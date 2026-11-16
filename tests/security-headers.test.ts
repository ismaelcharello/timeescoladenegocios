import assert from "node:assert/strict";
import test from "node:test";
const { applySecurityHeaders, buildContentSecurityPolicy, isCrossSiteMutation } = await import(new URL("../lib/security-headers.ts", import.meta.url).href);

const BASE = "https://app.time.test";

test("toda resposta sai com HSTS, nosniff, anti-iframe, referrer e permissões", () => {
  const r = applySecurityHeaders(new Response("ok", { status: 201, headers: { "x-custom": "1" } }));
  assert.equal(r.status, 201, "o status original não pode mudar");
  assert.equal(r.headers.get("x-custom"), "1", "cabeçalhos existentes continuam");
  assert.match(r.headers.get("strict-transport-security") ?? "", /max-age=31536000/);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-frame-options"), "DENY");
  assert.equal(r.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(r.headers.get("permissions-policy") ?? "", /camera=\(self\)/, "a portaria usa a câmera na própria origem");
  assert.match(r.headers.get("permissions-policy") ?? "", /microphone=\(\)/);
});

test("a CSP entra em modo relatório por padrão e só bloqueia quando pedido", () => {
  const relatorio = applySecurityHeaders(new Response("ok"));
  assert.ok(relatorio.headers.get("content-security-policy-report-only"));
  assert.equal(relatorio.headers.get("content-security-policy"), null, "em report-only nada pode ser bloqueado");
  const bloqueante = applySecurityHeaders(new Response("ok"), { cspMode: "enforce" });
  assert.ok(bloqueante.headers.get("content-security-policy"));
});

test("a CSP permite o que o app usa de verdade e nega o resto", () => {
  const csp = buildContentSecurityPolicy();
  for (const origem of ["https://*.supabase.co", "https://js.stripe.com", "https://player.vimeo.com", "https://www.youtube-nocookie.com", "https://timeescoladenegocios.com.br", "https://wa.me"]) {
    assert.ok(csp.includes(origem), `${origem} precisa estar liberada`);
  }
  assert.match(csp, /frame-ancestors 'none'/, "ninguém pode embutir a TIME num iframe");
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /report-uri \/api\/csp-report/);
  assert.doesNotMatch(csp, /\*(?!\.supabase)/, "curinga só no subdomínio do Supabase");
});

test("mutação de outra origem é cross-site; GET e requisições sem Origin não são", () => {
  const mk = (method: string, origin?: string) => new Request(`${BASE}/api/community`, { method, headers: origin ? { origin } : {} });
  assert.equal(isCrossSiteMutation(mk("POST", "https://evil.example")), true);
  assert.equal(isCrossSiteMutation(mk("DELETE", "https://evil.example")), true);
  assert.equal(isCrossSiteMutation(mk("POST", BASE)), false, "mesma origem passa");
  assert.equal(isCrossSiteMutation(mk("POST")), false, "curl e apps nativos não mandam Origin e não têm cookie de navegador");
  assert.equal(isCrossSiteMutation(mk("GET", "https://evil.example")), false, "GET não altera dados");
  assert.equal(isCrossSiteMutation(mk("POST", "lixo")), true, "Origin ilegível é tratado como estranho");
});
