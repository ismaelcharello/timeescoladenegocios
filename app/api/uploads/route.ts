import { env } from "cloudflare:workers";
import { getAuthorizedMember } from "@/lib/access";
import { getRequestIdentity, isAdminRequest } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonMaterials, lessons } from "@/db/schema";
import { publishedLessonExists } from "@/lib/course-access";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_COMMUNITY_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_MATERIAL_BYTES = 25 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MATERIAL_TYPES = new Set([
  "application/pdf", "text/plain", "text/csv", "application/zip",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

function safeExtension(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "bin";
  return extension.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
}

async function hasTrustedSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = String.fromCharCode(...bytes);
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (file.type === "image/gif") return ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a");
  if (file.type === "image/webp") return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP";
  if (file.type === "image/avif") return ascii.slice(4, 12).includes("ftypavif") || ascii.slice(4, 12).includes("ftypavis");
  if (file.type === "video/webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (file.type === "video/mp4" || file.type === "video/quicktime") return ascii.slice(4, 8) === "ftyp";
  return true;
}

export async function POST(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!env.BUCKET) {
    return Response.json({ error: "Armazenamento indisponível." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "");

    const admin = identity ? await isAdminRequest(request) : false;
    const activeMember = identity ? await getAuthorizedMember(request, "community") : null;
    const canUploadThumbnail = kind === "thumbnail" && admin;
    const canUploadEventBanner = kind === "event-banner" && admin;
    const canUploadMaterial = kind === "lesson-material" && admin;
    const canUploadCommunityMedia = kind === "community" && Boolean(activeMember);
    if (!identity || (!canUploadThumbnail && !canUploadEventBanner && !canUploadMaterial && !canUploadCommunityMedia)) {
      return Response.json({ error: kind === "community" ? "Acesso ativo necessário para enviar mídia." : "Acesso administrativo necessário." }, { status: 401 });
    }

    if (!(file instanceof File)) {
      return Response.json({ error: "Selecione um arquivo." }, { status: 400 });
    }

    const isThumbnail = kind === "thumbnail" || kind === "event-banner";
    const isMaterial = kind === "lesson-material";
    const isCommunityImage = kind === "community" && IMAGE_TYPES.has(file.type);
    const isCommunityVideo = kind === "community" && VIDEO_TYPES.has(file.type);
    if ((isThumbnail && !IMAGE_TYPES.has(file.type)) || (isMaterial && !MATERIAL_TYPES.has(file.type)) || (!isThumbnail && !isMaterial && !isCommunityImage && !isCommunityVideo)) {
      return Response.json({ error: isMaterial ? "Envie PDF, documento, planilha, apresentação, CSV, TXT ou ZIP." : "Envie uma imagem, GIF ou vídeo MP4, WebM ou MOV." }, { status: 400 });
    }
    if ((isThumbnail || isCommunityImage || isCommunityVideo) && !(await hasTrustedSignature(file))) {
      return Response.json({ error: "O conteúdo do arquivo não corresponde ao formato informado." }, { status: 400 });
    }

    const maxBytes = isCommunityVideo ? MAX_COMMUNITY_VIDEO_BYTES : isMaterial ? MAX_MATERIAL_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      return Response.json(
        { error: isCommunityVideo ? "O vídeo deve ter até 100 MB." : isMaterial ? "O material deve ter até 25 MB." : "A imagem deve ter até 15 MB." },
        { status: 413 },
      );
    }

    const prefix = kind === "community" ? "community" : kind === "event-banner" ? "event-banners" : isMaterial ? "materials" : "thumbnails";
    const key = `${prefix}/${crypto.randomUUID()}.${safeExtension(file.name)}`;
    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: kind === "community" || isMaterial ? "private, no-store" : "public, max-age=31536000, immutable",
      },
      customMetadata: {
        originalName: file.name.slice(0, 220),
        uploadedBy: identity.email.slice(0, 220),
      },
    });

    return Response.json(
      {
        key,
        url: `/api/uploads?key=${encodeURIComponent(key)}`,
        name: file.name,
        size: file.size,
        type: file.type,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("uploads:save failed", error);
    return Response.json(
      { error: "Não foi possível enviar o arquivo agora." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  if (!env.BUCKET) {
    return new Response("Armazenamento indisponível.", { status: 503 });
  }
  const key = new URL(request.url).searchParams.get("key");
  if (!key || (!key.startsWith("thumbnails/") && !key.startsWith("event-banners/") && !key.startsWith("videos/") && !key.startsWith("materials/") && !key.startsWith("community/"))) {
    return new Response("Arquivo inválido.", { status: 400 });
  }
  const protectedMedia = key.startsWith("videos/") || key.startsWith("materials/") || key.startsWith("community/");
  if (protectedMedia && !(await getAuthorizedMember(request, key.startsWith("community/") ? "community" : "courses"))) {
    return new Response("Acesso ativo necessário.", { status: 403 });
  }
  if (key.startsWith("videos/") && !(await isAdminRequest(request))) {
    const linkedLessons = await getDb().select({ id: lessons.id }).from(lessons).where(eq(lessons.videoKey, key));
    const visible = await Promise.all(linkedLessons.map((lesson) => publishedLessonExists(lesson.id)));
    if (!visible.some(Boolean)) return new Response("Arquivo não encontrado.", { status: 404 });
  }
  if (key.startsWith("materials/") && !(await isAdminRequest(request))) {
    const linkedMaterials = await getDb().select({ lessonId: lessonMaterials.lessonId })
      .from(lessonMaterials)
      .where(and(eq(lessonMaterials.storageKey, key), eq(lessonMaterials.status, "published")));
    const visible = await Promise.all(linkedMaterials.map((material) => publishedLessonExists(material.lessonId)));
    if (!visible.some(Boolean)) return new Response("Arquivo não encontrado.", { status: 404 });
  }

  const metadata = await env.BUCKET.head(key);
  if (!metadata) {
    return new Response("Arquivo não encontrado.", { status: 404 });
  }

  const rangeHeader = request.headers.get("range");
  let range: { offset: number; length: number } | undefined;
  let contentRange = "";
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match || (!match[1] && !match[2])) {
      return new Response("Intervalo inválido.", {
        status: 416,
        headers: { "content-range": `bytes */${metadata.size}` },
      });
    }
    const requestedStart = match[1] ? Number(match[1]) : null;
    const requestedEnd = match[2] ? Number(match[2]) : null;
    const start = requestedStart === null
      ? Math.max(0, metadata.size - Math.max(0, requestedEnd ?? 0))
      : requestedStart;
    const end = requestedStart === null
      ? metadata.size - 1
      : Math.min(metadata.size - 1, requestedEnd ?? metadata.size - 1);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= metadata.size) {
      return new Response("Intervalo inválido.", {
        status: 416,
        headers: { "content-range": `bytes */${metadata.size}` },
      });
    }
    range = { offset: start, length: end - start + 1 };
    contentRange = `bytes ${start}-${end}/${metadata.size}`;
  }

  const object = await env.BUCKET.get(key, range ? { range } : undefined);
  if (!object) return new Response("Arquivo não encontrado.", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (protectedMedia) headers.set("Cache-Control", "private, no-store");
  headers.set("etag", object.httpEtag);
  if (key.startsWith("materials/") && new URL(request.url).searchParams.get("download") === "1") {
    const filename = key.split("/").pop()?.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 120) || "material";
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  }
  headers.set("accept-ranges", "bytes");
  if (range) {
    headers.set("content-range", contentRange);
    headers.set("content-length", String(range.length));
  }
  return new Response(object.body, { status: range ? 206 : 200, headers });
}
