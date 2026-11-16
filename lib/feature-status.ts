
/**
 * Áreas da plataforma que o dono pode manter em "Em breve" até existir
 * conteúdo real: a página mostra o estado, a navegação sinaliza, e a API da
 * área recusa (503) — "não dá para acessar", como pedido em 2026-11-16.
 *
 * Mesmo mecanismo de SCHOOL_STATUS: uma variável por área em `wrangler.jsonc`
 * (produção) ou `.dev.vars` (local). Sem a variável, a área fica EM BREVE —
 * o padrão seguro é não mostrar o que ainda não existe.
 */
export const GATED_FEATURES = ["podcasts", "tutor", "conquistas"] as const;
export type GatedFeature = (typeof GATED_FEATURES)[number];
export type FeatureStatus = "active" | "coming_soon";
export type FeatureStatusMap = Record<GatedFeature, FeatureStatus>;

const ENV_VAR: Record<GatedFeature, string> = {
  podcasts: "PODCASTS_STATUS",
  tutor: "TUTOR_STATUS",
  conquistas: "ACHIEVEMENTS_STATUS",
};

export function getFeatureStatus(feature: GatedFeature): FeatureStatus {
  return process.env[ENV_VAR[feature]] === "active" ? "active" : "coming_soon";
}

export function getFeatureStatusMap(): FeatureStatusMap {
  return Object.fromEntries(GATED_FEATURES.map((f) => [f, getFeatureStatus(f)])) as FeatureStatusMap;
}

export function isFeatureComingSoon(feature: GatedFeature): boolean {
  return getFeatureStatus(feature) === "coming_soon";
}

/** Resposta padrão das APIs de uma área em "Em breve". */
export function comingSoonResponse(area: string) {
  return Response.json({ error: `${area} ainda não está disponível. Em breve.`, status: "coming_soon" }, { status: 503, headers: { "Retry-After": "86400" } });
}
