import { Suspense } from "react";
import AuthShell from "../auth-shell";
import { AuthForm } from "../auth-form";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export const metadata = {
  title: "Entrar | TIME Escola de Negócios",
  description: "Acesse sua conta da TIME Escola de Negócios.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ retorno?: string }>;
}) {
  const params = await searchParams;
  const adminFlow = params.retorno === "/admin";
  const supabaseConfig = getSupabasePublicConfig();
  return (
    <AuthShell
      eyebrow={adminFlow ? "ADMINISTRAÇÃO TIME" : "ÁREA DE MEMBROS"}
      title={adminFlow ? "Acesso administrativo" : "Acesse sua conta"}
      description={adminFlow ? "Entre sem senha pelo link seguro enviado ao seu e-mail autorizado." : "Entre para acessar suas conexões, conteúdos e próximos eventos."}
    >
      <Suspense fallback={<div className="auth-form-loading">Carregando acesso…</div>}>
        <AuthForm mode="login" supabaseConfig={supabaseConfig} />
      </Suspense>
    </AuthShell>
  );
}
