import { Suspense } from "react";
import AuthShell from "../auth-shell";
import { AuthForm } from "../auth-form";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export const metadata = { title: "Recuperar senha | TIME Escola de Negócios" };

export default function ForgotPasswordPage() {
  const supabaseConfig = getSupabasePublicConfig();
  return (
    <AuthShell
      eyebrow="RECUPERAR ACESSO"
      title="Esqueceu sua senha?"
      description="Informe seu e-mail e enviaremos as instruções de recuperação."
    >
      <Suspense fallback={<div className="auth-form-loading">Carregando…</div>}>
        <AuthForm mode="forgot" supabaseConfig={supabaseConfig} />
      </Suspense>
    </AuthShell>
  );
}
