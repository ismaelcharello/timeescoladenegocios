"use client";

import { useEffect, useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { Icon } from "./icons";

type Ticket = { attendeeId: number; type: "member" | "guest"; name: string; status: string; token: string };
type TicketPayload = { event: { id: number; title: string; startsAt: string; locationName: string; city: string }; tickets: Ticket[] };

const storageKey = (eventId: number) => `time-ticket-v1-${eventId}`;

/**
 * O QR é gerado no aparelho a partir do token: não depende de imagem remota, e
 * o token fica salvo no próprio aparelho. Assim o ingresso abre mesmo sem
 * internet — exatamente quando a fila na portaria derruba o sinal.
 */
function QrCode({ value, label }: { value: string; label: string }) {
  const modules = useMemo(() => {
    const qr = qrcode(0, "M"); // correção de erro M: tolera tela suja ou arranhada
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const cells: Array<[number, number]> = [];
    for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) if (qr.isDark(r, c)) cells.push([r, c]);
    return { n, cells };
  }, [value]);
  const margem = 4; // "zona silenciosa" exigida pela especificação do QR
  const lado = modules.n + margem * 2;
  return (
    <svg className="ticket-qr" viewBox={`0 0 ${lado} ${lado}`} role="img" aria-label={label} shapeRendering="crispEdges">
      {/* Sempre preto sobre branco, em qualquer tema: leitores esperam esse contraste. */}
      <rect width={lado} height={lado} fill="#fff" />
      {modules.cells.map(([r, c]) => <rect key={`${r}-${c}`} x={c + margem} y={r + margem} width="1" height="1" fill="#000" />)}
    </svg>
  );
}

export default function TicketModal({ eventId, onClose }: { eventId: number; onClose: () => void }) {
  const [payload, setPayload] = useState<TicketPayload | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      let response: Response;
      try {
        response = await fetch(`/api/events/${eventId}/ticket`, { cache: "no-store" });
      } catch {
        // A REDE falhou (fetch lança): aí sim vale a cópia salva no aparelho.
        if (cancelado) return;
        try {
          const salvo = window.localStorage.getItem(storageKey(eventId));
          if (salvo) {
            setPayload(JSON.parse(salvo) as TicketPayload);
            setOffline(true);
            return;
          }
        } catch { /* cópia ilegível: cai no erro abaixo */ }
        setError("Sem conexão, e o ingresso ainda não foi salvo neste aparelho. Abra-o uma vez com internet.");
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (cancelado) return;
      if (!response.ok) {
        // O SERVIDOR respondeu e disse não (inscrição cancelada, por exemplo):
        // a cópia salva está velha e NÃO pode ser mostrada como se valesse.
        try { window.localStorage.removeItem(storageKey(eventId)); } catch { /* ok */ }
        setError(typeof data.error === "string" ? data.error : "Não foi possível carregar o ingresso.");
        return;
      }
      setPayload(data as TicketPayload);
      try { window.localStorage.setItem(storageKey(eventId), JSON.stringify(data)); } catch { /* sem armazenamento: só não fica offline */ }
    })();
    return () => { cancelado = true; };
  }, [eventId]);

  const ticket = payload?.tickets[active];
  return (
    <div className="ticket-backdrop" role="dialog" aria-modal="true" aria-label="Meu ingresso">
      <button className="ticket-scrim" aria-label="Fechar ingresso" onClick={onClose} />
      <section className="ticket-sheet">
        <header>
          <span>MEU INGRESSO</span>
          <button type="button" aria-label="Fechar" onClick={onClose}><Icon name="close" size={18} /></button>
        </header>
        {error ? <p className="ticket-error" role="alert">{error}</p> : null}
        {!payload && !error ? <p className="ticket-loading">Carregando ingresso…</p> : null}
        {payload && ticket ? <>
          <h2>{payload.event.title}</h2>
          <p className="ticket-when">{new Date(payload.event.startsAt).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}{payload.event.locationName ? ` · ${payload.event.locationName}` : ""}</p>
          {payload.tickets.length > 1 ? <div className="ticket-tabs" role="tablist" aria-label="Ingressos deste evento">
            {payload.tickets.map((t, i) => <button key={t.attendeeId} role="tab" aria-selected={i === active} className={i === active ? "active" : ""} onClick={() => setActive(i)}>{t.type === "guest" ? `Convidado: ${t.name}` : "Meu ingresso"}</button>)}
          </div> : null}
          <QrCode value={ticket.token} label={`QR Code de entrada de ${ticket.name}`} />
          <strong className="ticket-name">{ticket.name}</strong>
          <small className="ticket-status">{ticket.status === "present" ? "Check-in já realizado" : "Apresente este código na entrada"}</small>
          {offline ? <small className="ticket-offline">Ingresso salvo neste aparelho. Funciona sem internet.</small> : null}
        </> : null}
      </section>
    </div>
  );
}
