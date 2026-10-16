import Link from "next/link";
import TimeLogo from "./time-logo";

type AccessGateProps = {
  kind: "member" | "admin";
  email: string;
  status?: string;
};

const statusCopy: Record<string, string> = {
  pending: "Seu pagamento ainda está em confirmação.",
  past_due: "Sua assinatura precisa de atenção para liberar novamente o acesso.",
  canceled: "Sua assinatura não está ativa no momento.",
  blocked: "Este acesso foi pausado pela equipe TIME.",
  unavailable: "Não foi possível confirmar o acesso agora. Tente novamente em instantes.",
  not_found: "Ainda não encontramos uma matrícula ativa para este e-mail.",
};

export default function AccessGate({ kind, email, status = "not_found" }: AccessGateProps) {
  const isAdmin = kind === "admin";
  return (
    <main className="access-gate">
      <div className="access-gate-grid" aria-hidden="true" />
      <section>
        <Link href="/" className="access-gate-logo">
          <TimeLogo variant="white" priority />
        </Link>
        <span className="access-gate-kicker">{isAdmin ? "ÁREA RESTRITA" : "ACESSO TIME"}</span>
        <h1>{isAdmin ? "Permissão administrativa necessária." : "Vamos liberar sua jornada."}</h1>
        <p>
          {isAdmin
            ? "Sua conta está autenticada, mas não faz parte da lista segura de administradores da plataforma."
            : statusCopy[status] ?? statusCopy.not_found}
        </p>
        <div className="access-gate-account">
          <span>Conta conectada</span>
          <strong>{email}</strong>
        </div>
        <div className="access-gate-actions">
          {isAdmin ? (
            <Link href="/app">Ir para a área de membros</Link>
          ) : (
            <Link href="/checkout">Ver planos e ativar acesso</Link>
          )}
          <Link className="secondary" href="/auth/signout">
            Entrar com outro e-mail
          </Link>
        </div>
        <small>
          {isAdmin
            ? "Para autorizar esta conta, inclua o e-mail em TIME_ADMIN_EMAILS no ambiente seguro do projeto."
            : "Use o mesmo e-mail informado no checkout. A liberação é atualizada automaticamente após a confirmação da Stripe."}
        </small>
      </section>
    </main>
  );
}
