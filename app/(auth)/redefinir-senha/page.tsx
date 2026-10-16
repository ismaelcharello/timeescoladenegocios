import { Suspense } from "react";
import AuthShell from "../auth-shell";
import { AuthForm } from "../auth-form";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export const metadata = { title: "Nova senha | TIME Escola de Negócios" };

export default function ResetPasswordPage() {
  const supabaseConfig = getSupabasePublicConfig();
  return (
    <AuthShell
      eyebrow="NOVA SENHA"
      title="Defina sua nova senha"
      description="Crie uma senha segura para voltar a acessar sua conta."
    >
      <Suspense fallback={<div className="auth-form-loading">Validando acesso…</div>}>
        <AuthForm mode="reset" supabaseConfig={supabaseConfig} />
      </Suspense>
    </AuthShell>
  );
}
