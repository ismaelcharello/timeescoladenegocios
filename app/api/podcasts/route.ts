import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { podcastEpisodes } from "@/db/schema";
import { getRequestIdentity, isAdminRequest } from "@/lib/auth";
import { canAccessResource, getMemberAccess } from "@/lib/access";

const schema = z.object({
  id: z.number().int().positive().optional(), title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).optional().default(""), guestName: z.string().trim().max(180).optional().default(""),
  seasonNumber: z.number().int().positive().nullable().optional(), episodeNumber: z.number().int().positive().nullable().optional(),
  publishedAt: z.string().trim().nullable().optional(), thumbnailUrl: z.string().trim().max(2000).optional().default(""),
  externalUrl: z.string().trim().max(2000).optional().default(""), status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
  position: z.number().int().min(0).optional().default(0),
});

function https(value: string) { try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; } }
function slug(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80); }

export async function GET(request: Request) {
  if (!(await getRequestIdentity(request))) return Response.json({ error: "Entre para acessar os podcasts." }, { status: 401 });
  const admin = await isAdminRequest(request); const access = await getMemberAccess(request);
  const rows = admin ? await getDb().select().from(podcastEpisodes).orderBy(asc(podcastEpisodes.position), desc(podcastEpisodes.updatedAt)) : await getDb().select().from(podcastEpisodes).where(eq(podcastEpisodes.status, "published")).orderBy(asc(podcastEpisodes.position), desc(podcastEpisodes.publishedAt));
  const canListen = canAccessResource(access, "podcasts");
  return Response.json({ episodes: rows.map((item) => ({ ...item, externalUrl: canListen ? item.externalUrl : "", locked: !canListen })) });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  try {
    const payload = schema.parse(await request.json()); const externalUrl = payload.externalUrl ? https(payload.externalUrl) : ""; const thumbnailUrl = payload.thumbnailUrl ? https(payload.thumbnailUrl) : "";
    if (payload.externalUrl && !externalUrl) return Response.json({ error: "Use um link HTTPS válido para o episódio." }, { status: 400 });
    if (payload.status === "published" && !externalUrl) return Response.json({ error: "Adicione o link antes de publicar." }, { status: 400 });
    const values = { title: payload.title, description: payload.description, guestName: payload.guestName, seasonNumber: payload.seasonNumber ?? null, episodeNumber: payload.episodeNumber ?? null, publishedAt: payload.publishedAt || null, thumbnailUrl, externalUrl, status: payload.status, position: payload.position, updatedAt: new Date().toISOString() };
    if (payload.id) { const [episode] = await getDb().update(podcastEpisodes).set(values).where(eq(podcastEpisodes.id, payload.id)).returning(); return episode ? Response.json({ episode }) : Response.json({ error: "Episódio não encontrado." }, { status: 404 }); }
    const [episode] = await getDb().insert(podcastEpisodes).values({ ...values, slug: `${slug(payload.title) || "episodio"}-${crypto.randomUUID().slice(0, 8)}` }).returning(); return Response.json({ episode }, { status: 201 });
  } catch (error) { if (error instanceof z.ZodError) return Response.json({ error: "Revise os dados do episódio." }, { status: 400 }); console.error("podcasts:save failed", error); return Response.json({ error: "Não foi possível salvar o episódio." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get("id")); if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Episódio inválido." }, { status: 400 });
  await getDb().delete(podcastEpisodes).where(eq(podcastEpisodes.id, id)); return Response.json({ deleted: true });
}
