import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/auth-redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const returnTo = safeReturnPath(url.searchParams.get("retorno"));
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/entrar?mensagem=configuracao_pendente", url.origin));
  }

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Link inválido") };

  if (result.error) {
    return NextResponse.redirect(new URL("/entrar?mensagem=link_invalido", url.origin));
  }

  return NextResponse.redirect(new URL(returnTo, url.origin));
}
