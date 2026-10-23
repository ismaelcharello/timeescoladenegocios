"use client";

import { useState } from "react";
import { Icon } from "@/app/app/icons";

type Candidate = { id: number; fullName: string; email: string };

export default function GuestConversion({ guestId, candidates, convertedMemberId }: { guestId: number; candidates: Candidate[]; convertedMemberId: number | null }) {
  const [memberId, setMemberId] = useState(convertedMemberId ? String(convertedMemberId) : "");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(""); setNotice(""); setSaving(true);
    try {
      const response = await fetch(`/api/admin/convidados/${guestId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId: Number(memberId) }) });
      const payload = await response.json() as { error?: string; notice?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível vincular.");
      setNotice(payload.notice ?? "Vínculo salvo.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível vincular."); }
    finally { setSaving(false); }
  }

  return <section className="guest-conversion"><div><span>CONVERSÃO</span><h2>Vincular a um membro oficial</h2><p>Os eventos já registrados permanecem no histórico da mesma pessoa.</p></div><label><span>Membro correspondente</span><select value={memberId} onChange={(event) => setMemberId(event.target.value)}><option value="">Selecionar membro</option>{candidates.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.fullName || candidate.email}</option>)}</select></label><button type="button" className="event-checkin-confirm" onClick={() => void submit()} disabled={saving || !memberId}>{saving ? "Salvando…" : "Vincular histórico"}</button>{notice ? <p className="event-checkin-notice" role="status"><Icon name="check" size={16} /> {notice}</p> : null}{error ? <p className="event-checkin-error" role="alert">{error}</p> : null}</section>;
}
