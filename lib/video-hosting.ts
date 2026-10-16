export type ExternalVideoProvider = "youtube" | "vimeo" | "panda" | null;

function parseUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function getExternalVideoProvider(value: string): ExternalVideoProvider {
  const url = parseUrl(value);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtube-nocookie.com") return "youtube";
  if (host === "vimeo.com" || host.endsWith(".vimeo.com")) return "vimeo";
  if (host === "pandavideo.com.br" || host.endsWith(".pandavideo.com.br")) return "panda";
  return null;
}

export function isExternalVideoUrl(value: string) {
  return getExternalVideoProvider(value) !== null;
}

export function normalizeExternalVideoUrl(value: string) {
  const url = parseUrl(value);
  if (!url || !getExternalVideoProvider(value)) return null;
  return url.toString();
}

export function getEmbedVideoUrl(value: string) {
  const url = parseUrl(value);
  const provider = getExternalVideoProvider(value);
  if (!url || !provider) return "";

  if (provider === "youtube") {
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathParts = url.pathname.split("/").filter(Boolean);
    const id = host === "youtu.be"
      ? pathParts[0]
      : ["embed", "shorts", "live"].includes(pathParts[0] ?? "")
        ? pathParts[1]
        : url.searchParams.get("v");
    const start = url.searchParams.get("start") ?? url.searchParams.get("t");
    const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
    if (start && /^\d+$/.test(start)) params.set("start", start);
    return id && /^[A-Za-z0-9_-]{6,}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
      : "";
  }

  if (provider === "vimeo") {
    const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
    return id ? `https://player.vimeo.com/video/${id}` : "";
  }

  // URLs de incorporação do Panda são fornecidas pelo próprio painel do vídeo.
  return url.toString();
}
