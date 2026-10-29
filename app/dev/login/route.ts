import { NextResponse } from "next/server";
import { DEV_IDENTITY_COOKIE, isLocalRequest } from "@/lib/dev-identity";

/**
 * Abre uma sessão de TESTE local: /dev/login?como=membro|admin&retorno=/app.
 * Em produção responde 404 antes de qualquer outra coisa (import.meta.env.DEV
 * vira false no build) e fora de localhost também.
 */
export async function GET(request: Request) {
  if (!import.meta.env.DEV || !(await isLocalRequest())) {
    return new NextResponse("Not found", { status: 404 });
  }
  const url = new URL(request.url);
  const como = url.searchParams.get("como");
  const retorno = url.searchParams.get("retorno") ?? "/app";
  const destino = retorno.startsWith("/") && !retorno.startsWith("//") ? retorno : "/app";
  const response = NextResponse.redirect(new URL(destino, url.origin));
  if (como === "membro" || como === "admin") {
    response.cookies.set(DEV_IDENTITY_COOKIE, como, { path: "/", httpOnly: true, sameSite: "lax" });
  } else {
    response.cookies.delete(DEV_IDENTITY_COOKIE);
  }
  return response;
}
