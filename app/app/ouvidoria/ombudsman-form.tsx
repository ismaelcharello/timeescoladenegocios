"use client";

import { FormEvent, useState } from "react";

export default function OmbudsmanForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setSuccess("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/ombudsman", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: form.get("type"), subject: form.get("subject"), message: form.get("message") }) });
    const payload = await response.json() as { error?: string };
    setLoading(false);
    if (!response.ok) { setError(payload.error ?? "Não foi possível enviar."); return; }
    formElement.reset(); setSuccess("Mensagem recebida. A equipe TIME acompanhará por este canal privado.");
  }

  return <form className="simple-member-form" onSubmit={submit}>
    <label>Tipo<select name="type" defaultValue="suggestion"><option value="suggestion">Sugestão</option><option value="complaint">Reclamação</option><option value="problem">Problema</option><option value="feedback">Feedback</option></select></label>
    <label>Assunto<input name="subject" required minLength={3} maxLength={180} placeholder="Resuma o tema" /></label>
    <label>Mensagem<textarea name="message" required minLength={10} maxLength={4000} rows={8} placeholder="Conte o que aconteceu e como podemos ajudar." /></label>
    {error ? <p className="simple-member-error" role="alert">{error}</p> : null}
    {success ? <p className="simple-member-success" role="status">{success}</p> : null}
    <button type="submit" disabled={loading}>{loading ? "Enviando…" : "Enviar para a Ouvidoria"}</button>
  </form>;
}
