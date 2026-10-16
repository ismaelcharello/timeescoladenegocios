import { Suspense } from "react";
import AuthShell from "../auth-shell";
import { AuthForm } from "../auth-form";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export const metadata = {
  title: "Criar conta | TIME Escola de Negócios",
  description: "Crie sua conta na comunidade TIME.",
};

export default function SignUpPage() {
  const supabaseConfig = getSupabasePublicConfig();
  return (
    <AuthShell
      eyebrow="NOVO MEMBRO"
      title="Crie sua conta"
      description="Comece seu acesso. O perfil empresarial será preenchido na próxima etapa."
    >
      <Suspense fallback={<div className="auth-form-loading">Preparando cadastro…</div>}>
        <AuthForm mode="signup" supabaseConfig={supabaseConfig} />
      </Suspense>
    </AuthShell>
  );
}
