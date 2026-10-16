import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { memberAgreements, members } from "@/db/schema";
import { getAuthenticatedIdentity } from "@/lib/auth";
import { CHECKOUT_DOCUMENT_TYPES, CURRENT_LEGAL_DOCUMENTS, type CheckoutDocumentType } from "@/lib/legal-documents";

const requestSchema = z.object({ documents: z.array(z.enum(CHECKOUT_DOCUMENT_TYPES)).min(1) });

export async function GET() {
  const identity = await getAuthenticatedIdentity();
  if (!identity) return Response.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  const db = getDb();
  const [member] = await db.select({ fullName: members.fullName, phone: members.phone })
    .from(members).where(eq(members.email, identity.email)).limit(1);
  const accepted = await db.select({ documentType: memberAgreements.documentType, documentVersion: memberAgreements.documentVersion })
    .from(memberAgreements).where(and(eq(memberAgreements.memberAuthUserId, identity.id), inArray(memberAgreements.documentType, CHECKOUT_DOCUMENT_TYPES)));
  const documents = CHECKOUT_DOCUMENT_TYPES.map((type) => ({
    type,
    version: CURRENT_LEGAL_DOCUMENTS[type].version,
    accepted: accepted.some((entry) => entry.documentType === type && entry.documentVersion === CURRENT_LEGAL_DOCUMENTS[type].version),
  }));
  return Response.json({ identity: { email: identity.email, fullName: member?.fullName || identity.fullName, phone: member?.phone || "" }, documents });
}

export async function POST(request: Request) {
  const identity = await getAuthenticatedIdentity(request);
  if (!identity) return Response.json({ error: "Entre na sua conta para aceitar os termos." }, { status: 401 });
  try {
    const { documents } = requestSchema.parse(await request.json());
    const now = new Date().toISOString();
    await getDb().insert(memberAgreements).values(documents.map((type) => ({
      memberEmail: identity.email,
      memberAuthUserId: identity.id,
      documentType: type,
      documentVersion: CURRENT_LEGAL_DOCUMENTS[type].version,
      documentReference: CURRENT_LEGAL_DOCUMENTS[type].reference,
      acceptedAt: now,
      createdAt: now,
    }))).onConflictDoNothing();
    return Response.json({ accepted: documents });
  } catch (error) {
    return Response.json({ error: error instanceof z.ZodError ? "Selecione os termos necessários." : "Não foi possível registrar o aceite." }, { status: 400 });
  }
}
