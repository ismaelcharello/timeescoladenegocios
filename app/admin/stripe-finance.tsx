"use client";

import { FormEvent, useEffect, useState } from "react";
import { TIME_MEMBERSHIP_ACCESS_KEY } from "@/lib/access-policy";
import { Icon } from "@/app/app/icons";

type Offer = {
  id: number; name: string; description: string; amountCents: number; currency: string;
  billingType: "one_time" | "subscription"; billingInterval: "month" | "year" | null;
  intervalCount: number; trialDays: number; stripePriceId: string | null;
  accessKey: string; active: boolean;
};
type Order = { id: number; memberEmail: string; amountTotal: number; currency: string; status: string; updatedAt: string };
type Finance = {
  connection: { secretKey: boolean; publishableKey: boolean; webhookSecret: boolean; ready: boolean; webhookUrl: string };
  offers: Offer[]; orders: Order[];
  stats: { active: number; pastDue: number; canceled: number; completedOrders: number };
};

const initial = {
  id: null as number | null,
  name: "", description: "", amount: "", billingType: "subscription" as "subscription" | "one_time",
  billingInterval: "month" as "month" | "year", trialDays: "0", stripePriceId: "", active: true,
};
function money(cents: number, currency = "brl") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}
async function fetchFinance() {
  const response = await fetch("/api/billing/admin", { cache: "no-store" });
  const payload = (await response.json()) as Finance & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o financeiro.");
  return payload;
}

export default function StripeFinanceAdmin() {
  const [data, setData] = useState<Finance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initial);

  useEffect(() => {
    let active = true;
    fetchFinance()
      .then((payload) => { if (active) setData(payload); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Falha ao carregar."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function reload() {
    try { setData(await fetchFinance()); } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao atualizar.");
    }
  }
  async function saveOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const editing = form.id !== null;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/billing/offers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id ?? undefined,
          name: form.name, description: form.description,
          amountCents: Math.round(Number(form.amount.replace(",", ".")) * 100),
          billingType: form.billingType,
          billingInterval: form.billingType === "subscription" ? form.billingInterval : null,
          intervalCount: 1, trialDays: Number(form.trialDays) || 0,
          stripePriceId: form.stripePriceId.trim(),
          active: form.active, accessKey: TIME_MEMBERSHIP_ACCESS_KEY,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar.");
      setForm(initial); setShowForm(false); setNotice(editing ? "Oferta atualizada." : "Oferta criada e checkout atualizado.");
      await reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar.");
    } finally { setSaving(false); }
  }
  function edit(offer: Offer) {
    setForm({
      id: offer.id,
      name: offer.name,
      description: offer.description,
      amount: String(offer.amountCents / 100).replace(".", ","),
      billingType: offer.billingType,
      billingInterval: offer.billingInterval ?? "month",
      trialDays: String(offer.trialDays),
      stripePriceId: offer.stripePriceId ?? "",
      active: offer.active,
    });
    setShowForm(true);
  }
  async function toggle(offer: Offer) {
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/billing/offers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...offer, active: !offer.active }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar.");
      setNotice(offer.active ? "Oferta pausada." : "Oferta ativada no checkout.");
      await reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível atualizar.");
    }
  }
  async function copyWebhook() {
    if (!data?.connection.webhookUrl) return;
    await navigator.clipboard.writeText(data.connection.webhookUrl);
    setNotice("Endereço do webhook copiado.");
  }
  if (loading) return <div className="stripe-admin-loading"><span />Carregando pagamentos…</div>;

  return (
    <>
      <header className="admin-heading stripe-heading">
        <div><span>PAGAMENTOS E RECORRÊNCIA</span><h1>Stripe</h1><p>Checkout próprio da TIME, cobranças, acessos e assinaturas em um só lugar.</p></div>
        <a className="admin-primary-button" href="/checkout" target="_blank">Ver checkout <Icon name="external" size={14} /></a>
      </header>
      {error ? <div className="stripe-message error">{error}</div> : null}
      {notice ? <div className="stripe-message"><Icon name="check" size={16} /> {notice}</div> : null}

      <section className={data?.connection.ready ? "stripe-connection ready" : "stripe-connection"}>
        <div className="stripe-mark">S</div>
        <div><span>CONEXÃO STRIPE</span><h3>{data?.connection.ready ? "Pagamentos conectados" : "Aguardando credenciais seguras"}</h3><p>{data?.connection.ready ? "Checkout, recorrência e liberação automática estão prontos para operar." : "Cadastre as chaves da conta Stripe no ambiente seguro do projeto para ativar cobranças reais."}</p></div>
        <aside>
          {[["Chave secreta",data?.connection.secretKey],["Chave pública",data?.connection.publishableKey],["Webhook",data?.connection.webhookSecret]].map(([label, ok]) => (
            <span className={ok ? "connected" : ""} key={String(label)}>{ok ? <Icon name="check" size={14} /> : <Icon name="clock" size={14} />} {label}</span>
          ))}
        </aside>
      </section>

      <div className="stripe-stats">
        {[["ASSINATURAS ATIVAS",data?.stats.active ?? 0,"inclui períodos de teste"],["ATENÇÃO NECESSÁRIA",data?.stats.pastDue ?? 0,"pagamentos em atraso"],["CANCELADAS",data?.stats.canceled ?? 0,"histórico da Stripe"],["COMPRAS RECENTES",data?.stats.completedOrders ?? 0,"últimos registros"]].map((item) => (
          <article key={String(item[0])}><span>{item[0]}</span><strong>{item[1]}</strong><small>{item[2]}</small></article>
        ))}
      </div>

      <section className="stripe-panel">
        <header><div><span>OFERTAS DO CHECKOUT</span><h2>Planos e condições</h2></div><button className="admin-primary-button" onClick={() => setShowForm(!showForm)}>{showForm ? "Fechar" : "+ Nova oferta"}</button></header>
        {showForm ? (
          <form className="offer-form" onSubmit={saveOffer}>
            <label><span>Nome</span><input required placeholder="Ex.: TIME Completa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label><span>Valor em reais</span><input required inputMode="decimal" placeholder="297,00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
            <label><span>Cobrança</span><select value={form.billingType} onChange={(e) => setForm({ ...form, billingType: e.target.value as "subscription" | "one_time" })}><option value="subscription">Recorrente</option><option value="one_time">Pagamento único</option></select></label>
            <label><span>Periodicidade</span><select disabled={form.billingType === "one_time"} value={form.billingInterval} onChange={(e) => setForm({ ...form, billingInterval: e.target.value as "month" | "year" })}><option value="month">Mensal</option><option value="year">Anual</option></select></label>
            <label><span>Dias grátis</span><input type="number" min="0" max="90" disabled={form.billingType === "one_time"} value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} /></label>
            <label><span>Price ID da Stripe</span><input placeholder="price_..." value={form.stripePriceId} onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })} /></label>
            <label className="offer-description"><span>Descrição</span><textarea placeholder="O que está incluído?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="offer-active"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Publicar no checkout</label>
            <button className="admin-primary-button" disabled={saving}>{saving ? "Salvando…" : form.id ? "Atualizar oferta" : "Salvar oferta"}</button>
          </form>
        ) : null}
        <div className="offer-list">
          {data?.offers.length ? data.offers.map((offer) => (
            <article key={offer.id}>
              <em className={offer.active ? "active" : ""}>{offer.active ? "ATIVA" : "PAUSADA"}</em>
              <div><strong>{offer.name}</strong><small>{offer.billingType === "one_time" ? "Pagamento único" : offer.billingInterval === "year" ? "Assinatura anual" : "Assinatura mensal"}</small><small>{offer.stripePriceId || "Price ID não configurado"}</small></div>
              <b>{money(offer.amountCents, offer.currency)}</b>
              <button onClick={() => edit(offer)}>Editar</button>
              <button onClick={() => void toggle(offer)}>{offer.active ? "Pausar" : "Ativar"}</button>
            </article>
          )) : <div className="stripe-empty"><span><Icon name="tag" size={20} /></span><strong>Nenhuma oferta criada</strong><p>Crie a primeira condição para exibi-la no checkout.</p></div>}
        </div>
      </section>

      <div className="stripe-bottom">
        <section className="stripe-panel">
          <header><div><span>ATIVIDADE</span><h2>Pagamentos recentes</h2></div></header>
          {data?.orders.length ? data.orders.slice(0,6).map((order) => (
            <div className="stripe-order" key={order.id}><i className={order.status} /><span><strong>{order.memberEmail}</strong><small>{new Date(order.updatedAt).toLocaleDateString("pt-BR")}</small></span><b>{money(order.amountTotal,order.currency)}</b><em>{order.status}</em></div>
          )) : <div className="stripe-empty compact"><strong>Nenhum pagamento registrado</strong><p>As compras aparecerão aqui em tempo real.</p></div>}
        </section>
        <section className="stripe-panel webhook-panel">
          <header><div><span>AUTOMAÇÃO DE ACESSO</span><h2>Webhook da Stripe</h2></div></header>
          <p>Use este endereço na Stripe para liberar, suspender e cancelar acessos automaticamente.</p>
          <code>{data?.connection.webhookUrl}</code>
          <button onClick={() => void copyWebhook()}>Copiar endereço</button>
          <small>Checkout, assinaturas, faturas pagas e falhas de pagamento.</small>
        </section>
      </div>
    </>
  );
}
