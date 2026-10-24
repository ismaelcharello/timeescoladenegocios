"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { getSupportWhatsappHref } from "@/lib/support-contact";
import TimeLogo from "@/app/time-logo";
import { Icon } from "@/app/app/icons";

type Offer = {
  id: number; name: string; description: string; amountCents: number; currency: string;
  billingType: "one_time" | "subscription"; billingInterval: "month" | "year" | null;
  intervalCount: number; trialDays: number;
};
type Buyer = { fullName: string; email: string; phone: string };
type Session = { clientSecret: string; publishableKey: string; sessionId: string };
type Agreements = { identity?: Buyer; documents?: Array<{ type: string; version: string; accepted: boolean }>; error?: string };

function money(cents: number, currency = "brl") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}
function cadence(offer: Offer) {
  if (offer.billingType === "one_time") return "pagamento único";
  return offer.billingInterval === "year" ? "por ano" : "por mês";
}
function Shield() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3 5 6v5c0 4.7 2.7 8.1 7 10 4.3-1.9 7-5.3 7-10V6l-7-3Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m9.2 12 1.8 1.8 3.9-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function Payment({ buyer, onBack }: { buyer: Buyer; onBack: () => void }) {
  const result = useCheckoutElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (result.type !== "success") return;
    setSubmitting(true);
    setError("");
    const confirmation = await result.checkout.confirm({
      phoneNumber: buyer.phone || undefined,
    });
    if (confirmation.type === "error") {
      setError(confirmation.error.message || "Não foi possível confirmar o pagamento.");
      setSubmitting(false);
    }
  }
  if (result.type === "loading") return <div className="checkout-loading"><span />Preparando pagamento seguro…</div>;
  if (result.type === "error") {
    return <div className="checkout-alert error"><strong>Não foi possível carregar o pagamento.</strong><span>{result.error.message}</span><button type="button" onClick={onBack}>Voltar e tentar novamente</button></div>;
  }
  return (
    <form onSubmit={submit}>
      <Heading step="ETAPA 2 DE 2" title="Finalize sua inscrição" description="Escolha a forma de pagamento e confirme seus dados." />
      <div className="buyer-chip">
        <b>{buyer.fullName.slice(0, 1).toUpperCase()}</b>
        <span><strong>{buyer.fullName}</strong><small>{buyer.email}</small></span>
        <button type="button" onClick={onBack}>Editar</button>
      </div>
      <div className="stripe-shell">
        <PaymentElement options={{ layout: { type: "accordion", defaultCollapsed: false, radios: "auto", spacedAccordionItems: false } }} />
      </div>
      {error ? <p className="checkout-error" role="alert">{error}</p> : null}
      <button className="checkout-submit" type="submit" disabled={submitting}>
        {submitting ? "Confirmando…" : "Confirmar pagamento seguro"} {!submitting ? <span><Icon name="arrow" size={16} /></span> : null}
      </button>
      <div className="secure-note"><Shield />Seus dados são criptografados e processados com segurança pela Stripe.</div>
    </form>
  );
}

function Heading({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="checkout-heading">
      <span>{step}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export default function CheckoutClient() {
  const supportWhatsappHref = getSupportWhatsappHref("Gostaria de falar com a equipe TIME sobre a associação");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [buyer, setBuyer] = useState<Buyer>({ fullName: "", email: "", phone: "" });
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/billing/offers").then(async (response) => {
        const payload = (await response.json()) as { offers?: Offer[]; error?: string };
        if (!response.ok) throw new Error(payload.error);
        return payload.offers ?? [];
      }),
      fetch("/api/billing/agreements").then(async (response) => {
        const payload = (await response.json()) as Agreements;
        if (!response.ok) throw new Error(payload.error);
        return payload;
      }),
    ])
      .then(([rows, agreement]) => {
        if (!active) return;
        setOffers(rows);
        setSelectedId(rows[0]?.id ?? null);
        if (agreement.identity) setBuyer(agreement.identity);
        setAccepted(Boolean(agreement.documents?.every((document) => document.accepted)));
      })
      .catch(() => { if (active) setError("Não foi possível consultar as ofertas neste momento."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const offer = useMemo(() => offers.find((row) => row.id === selectedId) ?? offers[0], [offers, selectedId]);
  const stripePromise = useMemo(
    () => session?.publishableKey ? loadStripe(session.publishableKey, { locale: "pt-BR" }) : null,
    [session],
  );

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!offer) return setError("Selecione uma oferta para continuar.");
    if (buyer.fullName.trim().length < 3) return setError("Informe seu nome completo.");
    if (!accepted) return setError("Confirme que você aceita os termos para continuar.");
    setStarting(true);
    try {
      const agreementResponse = await fetch("/api/billing/agreements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: ["terms_of_use", "privacy_policy"] }),
      });
      const agreementPayload = (await agreementResponse.json()) as { error?: string };
      if (!agreementResponse.ok) throw new Error(agreementPayload.error || "Não foi possível registrar o aceite dos termos.");
      const response = await fetch("/api/billing/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id, fullName: buyer.fullName, phone: buyer.phone }),
      });
      const payload = (await response.json()) as Session & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível iniciar o pagamento.");
      setSession(payload);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível iniciar o pagamento.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="checkout-page dark-lock">
      <div className="checkout-grid" aria-hidden="true" />
      <header className="checkout-header">
        <Link href="/" aria-label="Voltar ao início"><TimeLogo variant="white" priority /></Link>
        <div><Shield />Ambiente seguro</div>
      </header>

      <div className="checkout-layout">
        <section className="checkout-form">
          {!session ? (
            <form onSubmit={start}>
              <Heading step="ETAPA 1 DE 2" title="Seu próximo nível começa aqui." description="Complete seus dados para garantir acesso à TIME Escola de Negócios." />
              {loading ? (
                <div className="offer-skeleton"><span /><span /></div>
              ) : offers.length ? (
                <fieldset className="offer-picker">
                  <legend>Escolha sua condição</legend>
                  {offers.map((row) => (
                    <label className={offer?.id === row.id ? "offer-card selected" : "offer-card"} key={row.id}>
                      <input type="radio" name="offer" checked={offer?.id === row.id} onChange={() => setSelectedId(row.id)} />
                      <i />
                      <span><strong>{row.name}</strong><small>{row.description}</small></span>
                      <b><strong>{money(row.amountCents, row.currency)}</strong><small>{cadence(row)}</small></b>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <div className="checkout-alert">
                  <strong>Oferta em configuração</strong>
                  <span>A equipe TIME está preparando as condições de inscrição. Fale conosco para receber prioridade.</span>
                  {supportWhatsappHref ? <a href={supportWhatsappHref} target="_blank" rel="noreferrer">Falar com a TIME</a> : <small>Canal de atendimento em configuração.</small>}
                </div>
              )}
              <div className="checkout-fields">
                <label><span>Nome completo</span><input autoComplete="name" placeholder="Como devemos chamar você?" value={buyer.fullName} onChange={(e) => setBuyer({ ...buyer, fullName: e.target.value })} /></label>
                <label><span>E-mail da sua conta</span><input type="email" autoComplete="email" value={buyer.email} readOnly /></label>
                <label><span>WhatsApp</span><input type="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} /></label>
              </div>
              <label className="checkout-consent">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                <span>Concordo com os <Link href="/termos">Termos de Uso</Link> e a <Link href="/privacidade">Política de Privacidade</Link>.</span>
              </label>
              {error ? <p className="checkout-error" role="alert">{error}</p> : null}
              <button className="checkout-submit" type="submit" disabled={starting || !offers.length}>
                {starting ? "Preparando pagamento…" : "Continuar para pagamento"} {!starting ? <span><Icon name="arrow" size={16} /></span> : null}
              </button>
            </form>
          ) : stripePromise ? (
            <CheckoutElementsProvider stripe={stripePromise} options={{
              clientSecret: session.clientSecret,
              defaultValues: { phoneNumber: buyer.phone || undefined },
              elementsOptions: {
                loader: "auto",
                appearance: {
                  theme: "night",
                  variables: {
                    colorPrimary: "#6a45ff", colorBackground: "#0d1033", colorText: "#f4f4fb",
                    colorDanger: "#ff7676", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
                    borderRadius: "12px", spacingUnit: "5px",
                  },
                  rules: {
                    ".Input": { border: "1px solid #6068b0", boxShadow: "none" },
                    ".Input:focus": { border: "1px solid #a58bff", boxShadow: "0 0 0 3px rgba(165,139,255,.28)" },
                  },
                },
              },
            }}>
              <Payment buyer={buyer} onBack={() => setSession(null)} />
            </CheckoutElementsProvider>
          ) : null}
        </section>

        <aside className="checkout-summary">
          <span className="summary-kicker">SUA EXPERIÊNCIA TIME</span>
          <h2>Mais que cursos. Um ambiente para crescer.</h2>
          <p>Conhecimento prático, pessoas relevantes e ritmo para transformar intenção em resultado.</p>
          <ul>
            <li><span>01</span><div><strong>Cursos que viram ação</strong><small>Aulas diretas ao ponto, com progresso acompanhado.</small></div></li>
            <li><span>02</span><div><strong>Networking com propósito</strong><small>Comunidade de empreendedores, líderes e especialistas.</small></div></li>
            <li><span>03</span><div><strong>Evolução que você enxerga</strong><small>Metas, conquistas, gamificação e recomendações.</small></div></li>
          </ul>
          {offer ? (
            <div className="summary-total">
              <span><small>INVESTIMENTO</small><strong>{offer.name}</strong></span>
              <span><strong>{money(offer.amountCents, offer.currency)}</strong><small>{cadence(offer)}</small></span>
            </div>
          ) : <div className="summary-total muted">Condições disponíveis em breve</div>}
          <div className="checkout-access-note"><strong>Liberação automática</strong><p>Após a confirmação da Stripe, o acesso é vinculado à sua conta TIME autenticada.</p></div>
        </aside>
      </div>
      <footer className="checkout-footer"><span>© {new Date().getFullYear()} TIME Escola de Negócios</span><span>Pagamento processado com segurança pela Stripe</span></footer>
    </main>
  );
}
