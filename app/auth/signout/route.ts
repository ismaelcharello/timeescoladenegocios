import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function signOut(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/entrar?mensagem=sessao_encerrada", request.url), 303);
}

export const GET = signOut;
export const POST = signOut;
