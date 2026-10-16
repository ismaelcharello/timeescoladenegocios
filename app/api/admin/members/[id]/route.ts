import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, memberAccessGrants, members, subscriptions } from "@/db/schema";
import { getRequestIdentity } from "@/lib/auth";

const updateSchema = z.object({
  accessStatus: z.enum(["pending", "active", "complimentary", "past_due", "canceled", "blocked"]),
  reason: z.string().trim().max(500).optional().default(""),
  accessExpiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getRequestIdentity(request);
  if (!actor?.isAdmin) return Response.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const memberId = Number((await context.params).id);
  if (!Number.isInteger(memberId) || memberId < 1) return Response.json({ error: "Membro inválido." }, { status: 400 });
  try {
    const payload = updateSchema.parse(await request.json());
    if (payload.accessStatus === "complimentary" && !payload.reason) return Response.json({ error: "Informe o motivo da gratuidade." }, { status: 400 });
    if (payload.accessStatus === "blocked" && !payload.reason) return Response.json({ error: "Informe o motivo do bloqueio." }, { status: 400 });
    if (payload.accessExpiresAt && Date.parse(payload.accessExpiresAt) <= Date.now()) return Response.json({ error: "A validade deve estar no futuro." }, { status: 400 });
    const db = getDb();
    const [current] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (!current) return Response.json({ error: "Membro não encontrado." }, { status: 404 });
    const now = new Date().toISOString();
    let nextStatus = payload.accessStatus;
    if (current.accessStatus === "complimentary" && payload.accessStatus !== "complimentary") {
      await db.update(memberAccessGrants).set({ revokedAt: now, revokedByUserId: actor.id, updatedAt: now })
        .where(and(eq(memberAccessGrants.memberId, memberId), eq(memberAccessGrants.grantType, "complimentary"), isNull(memberAccessGrants.revokedAt)));
      if (payload.accessStatus === "active") {
        const [paidSubscription] = await db.select({ id: subscriptions.id }).from(subscriptions).where(and(
          eq(subscriptions.memberEmail, current.email), inArray(subscriptions.status, ["active", "trialing"]),
          gt(subscriptions.currentPeriodEnd, now),
        )).limit(1);
        nextStatus = paidSubscription ? "active" : "pending";
      }
    }
    const [member] = await db.update(members).set({ accessStatus: nextStatus, ...(payload.accessExpiresAt !== undefined ? { accessExpiresAt: payload.accessExpiresAt } : {}), updatedAt: now }).where(eq(members.id, memberId)).returning();
    if (nextStatus === "complimentary") {
      await db.update(memberAccessGrants).set({ revokedAt: now, revokedByUserId: actor.id, updatedAt: now })
        .where(and(eq(memberAccessGrants.memberId, memberId), eq(memberAccessGrants.grantType, "complimentary"), isNull(memberAccessGrants.revokedAt)));
      await db.insert(memberAccessGrants).values({ memberId, reason: payload.reason, grantedByUserId: actor.id, startsAt: now, expiresAt: member.accessExpiresAt, createdAt: now, updatedAt: now });
    }
    await db.insert(auditLogs).values({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: "member.access.changed",
      entityType: "member",
      entityId: String(memberId),
      detailsJson: JSON.stringify({ from: current.accessStatus, to: nextStatus, reason: payload.reason, expiresFrom: current.accessExpiresAt, expiresTo: member.accessExpiresAt }),
    });
    return Response.json({ member });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Revise os dados de acesso." }, { status: 400 });
    console.error("admin:member-access failed", error);
    return Response.json({ error: "Não foi possível alterar o acesso agora." }, { status: 500 });
  }
}
