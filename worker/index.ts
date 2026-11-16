/** Cloudflare Worker entry point for the vinext-starter template. */
import type { AnyD1Database } from "drizzle-orm/d1";
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { applySecurityHeaders, isCrossSiteMutation } from "../lib/security-headers";

interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
  DB: AnyD1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    // CSRF, defesa em profundidade: mutação de /api vinda de outra origem não entra.
    if (url.pathname.startsWith("/api/") && isCrossSiteMutation(request)) {
      return new Response(JSON.stringify({ error: "Origem não permitida." }), { status: 403, headers: { "content-type": "application/json" } });
    }

    const response = await handler.fetch(request, env, ctx);
    // CSP em modo relatório até os relatórios de produção mostrarem que nada legítimo é bloqueado.
    return applySecurityHeaders(response, { cspMode: "report-only" });
  },
};

export default worker;
