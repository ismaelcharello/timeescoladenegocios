declare module "cloudflare:workers" {
  interface R2HttpMetadata {
    contentType?: string;
    cacheControl?: string;
  }

  interface R2ObjectMetadata {
    size: number;
    httpEtag: string;
    writeHttpMetadata(headers: Headers): void;
  }

  interface R2ObjectBody extends R2ObjectMetadata {
    body: ReadableStream<Uint8Array>;
  }

  interface R2Bucket {
    put(
      key: string,
      value: ReadableStream<Uint8Array>,
      options: {
        httpMetadata: R2HttpMetadata;
        customMetadata: Record<string, string>;
      },
    ): Promise<unknown>;
    head(key: string): Promise<R2ObjectMetadata | null>;
    get(
      key: string,
      options?: { range: { offset: number; length: number } },
    ): Promise<R2ObjectBody | null>;
  }

  export const env: {
    DB?: import("drizzle-orm/d1").AnyD1Database;
    BUCKET?: R2Bucket;
  };
}
