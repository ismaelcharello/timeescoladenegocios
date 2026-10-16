import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { tutorSettings } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";

const defaults = {
  id: 1,
  enabled: true,
  tone: "execution_mentor" as const,
  customInstructions: "",
};

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }
  try {
    const [settings] = await getDb().select().from(tutorSettings).where(eq(tutorSettings.id, 1)).limit(1);
    return Response.json({ settings: settings ?? defaults });
  } catch (error) {
    console.error("tutor-config:get failed", error);
    return Response.json({ error: "Não foi possível carregar a configuração do Tutor." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }
  try {
    const payload = (await request.json()) as {
      enabled?: boolean;
      tone?: "execution_mentor" | "didactic_teacher" | "strategic_consultant";
      customInstructions?: string;
    };
    const allowedTones = new Set(["execution_mentor", "didactic_teacher", "strategic_consultant"]);
    const tone = allowedTones.has(payload.tone ?? "") ? payload.tone! : defaults.tone;
    const customInstructions = payload.customInstructions?.trim() ?? "";
    if (customInstructions.length > 2000) {
      return Response.json({ error: "A instrução adicional deve ter até 2.000 caracteres." }, { status: 400 });
    }
    const values = {
      enabled: payload.enabled !== false,
      tone,
      customInstructions,
      updatedAt: new Date().toISOString(),
    };
    const [settings] = await getDb()
      .insert(tutorSettings)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: tutorSettings.id, set: values })
      .returning();
    return Response.json({ settings });
  } catch (error) {
    console.error("tutor-config:save failed", error);
    return Response.json({ error: "Não foi possível salvar a configuração do Tutor." }, { status: 500 });
  }
}
