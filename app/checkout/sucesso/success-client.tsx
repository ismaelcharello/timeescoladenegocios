"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupportWhatsappHref } from "@/lib/support-contact";
import TimeLogo from "@/app/time-logo";
type Status = {
  id: string; status: "open" | "complete" | "expired";
  paymentStatus: "paid" | "unpaid" | "no_payment_required";
  customerEmail: string | null; amountTotal: number | null; currency: string | null;
};

export default function SuccessClient() {
  const supportWhatsappHref = getSupportWhatsappHref("Preciso de ajuda com minha associação TIME");
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [session, setSession] = useState<Status | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState("");
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    fetch(`/api/billing/session?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        const payload = (await response.json()) as Status & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Falha ao consultar o pagamento.");
        return payload;
      })
      .then((payload) => { if (active) setSession(payload); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Não foi possível confirmar o pagamento."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionId]);
  if (loading) return <div className="checkout-loading"><span />Confirmando sua inscrição…</div>;
  const displayError = error || (!sessionId ? "Não encontramos a referência deste pagamento." : "");
  const confirmed = session?.status === "complete" && (session.paymentStatus === "paid" || session.paymentStatus === "no_payment_required");
  return (
    <section className="success-card">
      <Link href="/" aria-label="TIME Escola de Negócios"><TimeLogo variant="white" priority /></Link>
      <div className="success-icon">{confirmed ? "✓" : displayError ? "!" : "↗"}</div>
      <h1>{confirmed ? "Você agora faz parte da TIME." : displayError ? "Precisamos conferir seu pagamento." : "Pagamento em processamento."}</h1>
      <p>{confirmed ? "Sua inscrição foi confirmada. Entre usando o mesmo e-mail da compra; a liberação ocorre quando o webhook da Stripe concluir a atualização." : displayError || "Algumas formas de pagamento levam alguns instantes para confirmar."}</p>
      {session?.customerEmail ? <div className="success-detail"><span>RESUMO DA INSCRIÇÃO</span><strong>{session.customerEmail}</strong></div> : null}
      <Link className="checkout-submit" href={confirmed ? "/app" : "/checkout"}>{confirmed ? "Entrar com o e-mail da compra" : "Voltar ao checkout"} <span>→</span></Link>
      {supportWhatsappHref ? <a className="success-help" href={supportWhatsappHref} target="_blank" rel="noreferrer">Precisa de ajuda? Fale com a TIME</a> : <span className="success-help">Canal de atendimento em configuração.</span>}
    </section>
  );
}
