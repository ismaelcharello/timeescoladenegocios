/**
 * Recebe os relatórios da Content-Security-Policy (modo Report-Only). Serve
 * para descobrir, em produção, o que a CSP bloquearia ANTES de ela virar
 * bloqueante. Não grava em banco: registra no log do Worker, que é onde a
 * equipe lê. Aceita só o formato do navegador e ignora o resto.
 */
export const dynamic = "force-dynamic";

const MAX_BYTES = 8_192;

export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!/application\/(csp-report|reports\+json|json)/.test(type)) return new Response(null, { status: 415 });
  const text = (await request.text()).slice(0, MAX_BYTES);
  try {
    const body = JSON.parse(text) as { "csp-report"?: Record<string, unknown> } | Array<{ body?: Record<string, unknown> }>;
    const report = Array.isArray(body) ? body[0]?.body : body["csp-report"];
    if (report) {
      console.warn("csp-report", {
        documento: String(report["document-uri"] ?? report.documentURL ?? ""),
        diretiva: String(report["violated-directive"] ?? report.effectiveDirective ?? ""),
        bloqueado: String(report["blocked-uri"] ?? report.blockedURL ?? "").slice(0, 200),
      });
    }
  } catch {
    // Relatório malformado: não é erro do app.
  }
  return new Response(null, { status: 204 });
}
