export function safeReturnPath(value: string | null | undefined, fallback = "/app") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const url = new URL(value, "https://time.local");
    if (url.origin !== "https://time.local") return fallback;
    if (url.pathname.startsWith("/auth/") || url.pathname === "/entrar") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
