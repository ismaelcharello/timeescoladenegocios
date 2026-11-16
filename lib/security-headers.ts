/**
 * Cabeçalhos de segurança aplicados pelo Worker a TODA resposta.
 *
 * Dois níveis, de propósito:
 *
 * 1. Os que não têm como quebrar o site e por isso já valem: HSTS (só HTTPS),
 *    nosniff, `frame-ancestors 'none'` (ninguém embute a TIME num iframe —
 *    protege contra clickjacking no checkout e no admin), Referrer-Policy
 *    (o WhatsApp e links externos não recebem a URL interna) e
 *    Permissions-Policy (câmera liberada só para a própria origem, que a
 *    portaria usa; o resto desligado).
 *
 * 2. A Content-Security-Policy completa, que lista cada origem permitida.
 *    Uma CSP errada quebra o site inteiro em silêncio (vídeo, Stripe,
 *    Supabase). Por isso ela entra primeiro em **Report-Only**: o navegador
 *    registra o que violaria, sem bloquear. Só depois de ler os relatórios
 *    em produção ela vira bloqueante (trocar o nome do cabeçalho abaixo).
 */

export const CSP_REPORT_PATH = "/api/csp-report";

/** Origens externas que o app usa de fato (levantadas no código, não supostas). */
const ORIGENS = {
  supabase: "https://*.supabase.co",
  stripe: ["https://js.stripe.com", "https://api.stripe.com", "https://m.stripe.network"],
  video: ["https://player.vimeo.com", "https://www.youtube-nocookie.com", "https://www.youtube.com"],
  imagensExternas: ["https://timeescoladenegocios.com.br", "https://i.vimeocdn.com", "https://i.ytimg.com"],
};

export function buildContentSecurityPolicy(): string {
  const diretivas: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next/vinext injeta scripts inline de hidratação; sem 'unsafe-inline' aqui o app não sobe.
    "script-src": ["'self'", "'unsafe-inline'", ...ORIGENS.stripe],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ORIGENS.supabase, ...ORIGENS.imagensExternas],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ORIGENS.supabase, "wss://*.supabase.co", ...ORIGENS.stripe],
    "frame-src": [...ORIGENS.video, ...ORIGENS.stripe],
    "media-src": ["'self'", "blob:", ORIGENS.supabase],
    "worker-src": ["'self'", "blob:"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", "https://wa.me"],
    "object-src": ["'none'"],
    "report-uri": [CSP_REPORT_PATH],
  };
  return Object.entries(diretivas).map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");
}

export function applySecurityHeaders(response: Response, options: { cspMode?: "report-only" | "enforce" } = {}): Response {
  const headers = new Headers(response.headers);
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=(self \"https://js.stripe.com\"), usb=(), interest-cohort=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  const cspHeader = options.cspMode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
  headers.set(cspHeader, buildContentSecurityPolicy());
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Defesa em profundidade contra CSRF nas rotas de API que alteram dados. O
 * cookie de sessão já é SameSite=Lax (o navegador não o envia em POST de
 * outro site), mas conferir o Origin fecha o caso de um navegador antigo ou
 * de uma configuração que afrouxe o cookie. Requisições sem Origin (curl,
 * apps nativos) passam: elas não carregam cookie de navegador.
 */
export function isCrossSiteMutation(request: Request): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin !== new URL(request.url).origin;
  } catch {
    return true;
  }
}
