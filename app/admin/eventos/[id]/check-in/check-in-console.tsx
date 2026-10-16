"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { matchesParticipantSearch } from "@/lib/event-checkin";
import TimeLogo from "@/app/time-logo";

type CheckInStatus = "expected" | "present" | "absent" | "cancelled";
type AttendeeType = "member" | "guest";
type CheckInHistory = {
  id: number;
  previousStatus: CheckInStatus;
  newStatus: CheckInStatus;
  changedByEmail: string;
  changedAt: string;
};
type Participant = {
  id: number;
  attendeeType: AttendeeType;
  displayName: string;
  company: string;
  phone: string;
  avatarUrl: string;
  guestId: number | null;
  memberId: number | null;
  hostName: string;
  host: { id: number; fullName: string; phone: string } | null;
  status: CheckInStatus;
  checkedInAt: string | null;
  checkedInByEmail: string;
  addedAtDoor: boolean;
  isHost: boolean;
  history: CheckInHistory[];
};
type CheckInData = {
  event: { id: number; title: string; startsAt: string; locationName: string; city: string; status: string };
  participants: Participant[];
  hostCandidates: Array<{ attendeeId: number; id: number | null; fullName: string }>;
  summary: { expected: number; present: number; absent: number; cancelled: number; members: number; guests: number; membersPresent: number; guestsPresent: number; addedAtDoor: number };
  notice?: string;
};

const statusCopy: Record<CheckInStatus, string> = {
  expected: "Ainda não chegou",
  present: "Presente",
  absent: "Ausente",
  cancelled: "Cancelado",
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatEventStart(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date).replace(",", " •");
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "T";
}

function pdfSafeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^ -\u007e]/g, " ")
    .replace(/[\\()]/g, (character) => `\\${character}`)
    .replace(/\s+/g, " ")
    .trim();
}

function splitPdfLine(value: string, maxLength = 82) {
  const words = pdfSafeText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function createAttendancePdf(data: CheckInData) {
  type PdfPage = string[];
  const byStatus = (status: CheckInStatus) => data.participants.filter((participant) => participant.status === status);
  const colors = { navy: "050829", violet: "3700F0", magenta: "FF00E0", ink: "151429", muted: "5C586B", line: "E3E0EC", panel: "F7F6FB", green: "087F5B", greenSoft: "EAF8F2", red: "B4233F", redSoft: "FDEFF2", amber: "9A5B00", amberSoft: "FFF5DE", gray: "5C6472", graySoft: "F0F2F5" };
  const rgb = (hex: string) => `${parseInt(hex.slice(0, 2), 16) / 255} ${parseInt(hex.slice(2, 4), 16) / 255} ${parseInt(hex.slice(4, 6), 16) / 255}`;
  const rect = (x: number, y: number, width: number, height: number, hex: string) => `q ${rgb(hex)} rg ${x} ${y} ${width} ${height} re f Q`;
  const line = (x1: number, y1: number, x2: number, y2: number, hex: string, thickness = 1) => `q ${rgb(hex)} RG ${thickness} w ${x1} ${y1} m ${x2} ${y2} l S Q`;
  const text = (x: number, y: number, value: string, size: number, hex = colors.ink, bold = false) => `BT /${bold ? "F2" : "F1"} ${size} Tf ${rgb(hex)} rg ${x} ${y} Td (${pdfSafeText(value)}) Tj ET`;
  const pages: PdfPage[] = [];
  const eventDetails = `${formatEventStart(data.event.startsAt)}${data.event.locationName ? ` | ${data.event.locationName}` : ""}${data.event.city ? ` | ${data.event.city}` : ""}`;
  const pageFrame = (title: string, subtitle: string, accent: string, page: number) => [
    rect(0, 755, 595, 87, colors.navy),
    rect(0, 755, 7, 87, accent),
    text(50, 812, "TIME ESCOLA DE NEGOCIOS", 10, colors.magenta, true),
    text(50, 782, title, 22, "FFFFFF", true),
    text(50, 764, subtitle, 9, "D8D5E7"),
    text(50, 732, data.event.title, 12, colors.ink, true),
    text(50, 715, eventDetails, 9, colors.muted),
    line(50, 696, 545, 696, colors.line),
    text(50, 28, "TIME - Relatorio de presenca", 8, colors.muted),
    text(500, 28, `Pagina ${page}`, 8, colors.muted),
  ];
  const summaryCards = [
    { label: "ESPERADOS", value: String(data.summary.expected), color: colors.violet, soft: "F2EFFF" },
    { label: "PRESENTES", value: String(byStatus("present").length), color: colors.green, soft: colors.greenSoft },
    { label: "AUSENTES", value: String(byStatus("absent").length), color: colors.red, soft: colors.redSoft },
    { label: "EM ABERTO", value: String(byStatus("expected").length), color: colors.amber, soft: colors.amberSoft },
  ];
  const summary: PdfPage = [];
  summary.push(...pageFrame("Resumo de presenca", "Visao rapida do evento e da lista de participantes", colors.violet, 1));
  summaryCards.forEach((card, index) => {
    const x = 50 + index * 124;
    summary.push(rect(x, 568, 116, 90, card.soft), rect(x, 650, 116, 8, card.color), text(x + 12, 624, card.label, 8, card.color, true), text(x + 12, 586, card.value, 29, colors.ink, true));
  });
  summary.push(
    rect(50, 454, 495, 82, colors.panel),
    text(70, 506, "COMO LER ESTE RELATORIO", 10, colors.violet, true),
    text(70, 484, "Cada status aparece em uma secao propria nas paginas seguintes.", 11, colors.ink),
    text(70, 466, "Presentes mostram o horario de chegada. Ausentes e pendentes ficam separados para conferencia.", 10, colors.muted),
    text(50, 408, "LISTAS INCLUIDAS", 10, colors.ink, true),
    text(50, 384, `Presentes (${byStatus("present").length})`, 12, colors.green, true),
    text(210, 384, `Ausentes (${byStatus("absent").length})`, 12, colors.red, true),
    text(370, 384, `Ainda nao chegaram (${byStatus("expected").length})`, 12, colors.amber, true),
    text(50, 340, "Para cada pessoa: nome, empresa, tipo de participacao, anfitriao quando houver e horario de chegada.", 10, colors.muted),
    text(50, 310, `Relatorio gerado em ${formatWhen(new Date().toISOString())}.`, 9, colors.muted),
  );
  pages.push(summary);
  const statusSections: Array<{ status: CheckInStatus; title: string; description: string; accent: string; soft: string }> = [
    { status: "present", title: "Presentes", description: "Pessoas com chegada confirmada no evento.", accent: colors.green, soft: colors.greenSoft },
    { status: "absent", title: "Ausentes", description: "Pessoas marcadas como ausentes ao final do check-in.", accent: colors.red, soft: colors.redSoft },
    { status: "expected", title: "Ainda nao chegaram", description: "Pessoas esperadas cujo check-in ainda nao foi confirmado.", accent: colors.amber, soft: colors.amberSoft },
    { status: "cancelled", title: "Cancelados", description: "Participantes cancelados para este evento.", accent: colors.gray, soft: colors.graySoft },
  ];
  let pageNumber = 2;
  for (const section of statusSections) {
    const items = byStatus(section.status);
    const chunks = items.length ? Array.from({ length: Math.ceil(items.length / 11) }, (_, index) => items.slice(index * 11, index * 11 + 11)) : [[]];
    chunks.forEach((chunk, chunkIndex) => {
      const page: PdfPage = [];
      page.push(...pageFrame(`${section.title} (${items.length})`, chunkIndex ? `${section.description} Continua.` : section.description, section.accent, pageNumber));
      pageNumber += 1;
      page.push(rect(50, 662, 495, 24, section.soft), text(62, 670, "PARTICIPANTE", 8, section.accent, true), text(270, 670, "EMPRESA E PARTICIPACAO", 8, section.accent, true), text(465, 670, section.status === "present" ? "CHEGADA" : "STATUS", 8, section.accent, true));
      if (!chunk.length) page.push(rect(50, 598, 495, 46, colors.panel), text(68, 616, `Nenhuma pessoa nesta lista de ${section.title.toLowerCase()}.`, 11, colors.muted));
      chunk.forEach((participant, index) => {
        const y = 622 - index * 47;
        const company = participant.company || "Empresa nao informada";
        const type = participant.attendeeType === "member" ? "Membro TIME" : "Convidado";
        const host = participant.attendeeType === "guest" && participant.hostName ? ` - anfitriao: ${participant.hostName}` : "";
        const arrival = participant.status === "present" && participant.checkedInAt ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(participant.checkedInAt)) : statusCopy[participant.status];
        const nameLines = splitPdfLine(participant.displayName, 34).slice(0, 2);
        const detailLines = splitPdfLine(`${company} - ${type}${host}`, 39).slice(0, 2);
        if (index % 2 === 0) page.push(rect(50, y - 17, 495, 42, "FAF9FD"));
        page.push(text(62, y + 8, nameLines[0] ?? participant.displayName, 9.5, colors.ink, true));
        if (nameLines[1]) page.push(text(62, y - 4, nameLines[1], 9.5, colors.ink, true));
        page.push(text(270, y + 8, detailLines[0] ?? company, 8.25, colors.muted));
        if (detailLines[1]) page.push(text(270, y - 3, detailLines[1], 8.25, colors.muted));
        page.push(text(465, y + 8, arrival, 8.5, section.accent, true));
        page.push(line(62, y - 20, 533, y - 20, colors.line, .55));
      });
      pages.push(page);
    });
  }
  const pageCount = pages.length;
  const objectCount = 4 + pageCount * 2;
  const objects: string[] = new Array(objectCount + 1).fill("");
  const pageRefs = pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ");
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  pages.forEach((page, index) => {
    const pageObject = 5 + index * 2;
    const contentObject = pageObject + 1;
    const commands = page.join("\n");
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject] = `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`;
  });
  let pdf = "%PDF-1.4\n%PDF report\n";
  const offsets = [0];
  for (let index = 1; index <= objectCount; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objectCount; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function StatusPill({ status }: { status: CheckInStatus }) {
  return <span className={`event-checkin-status ${status}`}>{status === "present" ? "✓ " : ""}{statusCopy[status]}</span>;
}

function ParticipantRow({ participant, busy, onCheckIn, onUndo, onEdit, onRemove }: { participant: Participant; busy: boolean; onCheckIn: () => void; onUndo: () => void; onEdit: () => void; onRemove: () => void }) {
  const [showHost, setShowHost] = useState(false);
  return (
    <article className={`event-checkin-participant ${participant.status === "present" ? "is-present" : ""}`}>
      <div className="event-checkin-avatar" aria-hidden="true">
        {participant.avatarUrl ? <img src={participant.avatarUrl} alt="" /> : initials(participant.displayName)}
      </div>
      <div className="event-checkin-person">
        <div className="event-checkin-person-title"><h3>{participant.displayName}</h3><span className={`event-checkin-type ${participant.attendeeType}`}>{participant.attendeeType === "member" ? "MEMBRO TIME" : "CONVIDADO"}</span>{participant.isHost ? <span className="event-checkin-type host">ANFITRIÃO</span> : null}</div>
        <p>{participant.company ? `Empresa: ${participant.company}` : participant.attendeeType === "guest" ? "Convidado da TIME · empresa não informada" : "Membro da TIME · empresa não informada"}</p>
        {participant.attendeeType === "guest" ? <div className="event-checkin-host"><span>{participant.hostName ? `Convidado por ${participant.hostName}` : "Convidado · sem anfitrião informado"}</span>{participant.host ? <button type="button" onClick={() => setShowHost((open) => !open)} aria-expanded={showHost}>Ver anfitrião</button> : null}{participant.guestId ? <Link href={`/admin/convidados/${participant.guestId}`}>Ver histórico</Link> : null}</div> : null}
        {showHost && participant.host ? <div className="event-checkin-host-card"><strong>{participant.host.fullName}</strong><span>{participant.host.phone || "WhatsApp não informado"}</span></div> : null}
      </div>
      <div className="event-checkin-row-action">
        <StatusPill status={participant.status} />
        {participant.status === "present" ? <><small>✓ Presente · {participant.checkedInAt ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(participant.checkedInAt)) : "agora"}</small><button className="event-checkin-undo" type="button" onClick={onUndo} disabled={busy}>Desfazer check-in</button></> : <button className="event-checkin-confirm" type="button" onClick={onCheckIn} disabled={busy || participant.status === "cancelled"}>{busy ? "Salvando…" : "Confirmar chegada"}</button>}
        <button className="event-checkin-edit" type="button" onClick={onEdit} disabled={busy}>Editar pessoa</button>
        <button className="event-checkin-remove" type="button" onClick={onRemove} disabled={busy}>Excluir da lista</button>
      </div>
    </article>
  );
}

function AddGuestForm({ candidates, onClose, onSubmit, busy }: { candidates: CheckInData["hostCandidates"]; onClose: () => void; onSubmit: (value: Record<string, unknown>) => Promise<void>; busy: boolean }) {
  const [attendeeType, setAttendeeType] = useState<AttendeeType>("guest");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [hostChoice, setHostChoice] = useState("");
  const [hostName, setHostName] = useState("");
  const [checkInNow, setCheckInNow] = useState(true);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const selected = candidates.find((candidate) => String(candidate.attendeeId) === hostChoice);
    try {
      await onSubmit({ fullName, phone, company, email, jobTitle, attendeeType, hostAttendeeId: selected?.attendeeId ?? null, hostName: selected?.fullName ?? hostName, checkInNow });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível adicionar o convidado.");
    }
  }

  return <section className="event-checkin-add-guest" aria-labelledby="new-guest-title"><header><div><span>CHEGADA NA PORTA</span><h2 id="new-guest-title">Adicionar pessoa</h2><p>Defina se ela é membro da TIME ou convidada e confirme a chegada, se já estiver presente.</p></div><button type="button" aria-label="Fechar cadastro de pessoa" onClick={onClose}>×</button></header><form onSubmit={submit}><label><span>Nome completo <b>obrigatório</b></span><input autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nome da pessoa" required minLength={2} /></label><label><span>Tipo de participação <b>obrigatório</b></span><select value={attendeeType} onChange={(event) => setAttendeeType(event.target.value as AttendeeType)}><option value="guest">Convidado</option><option value="member">Membro da TIME</option></select><small className="event-checkin-field-hint">Marcar como membro identifica a pessoa nesta lista; não cria uma nova conta.</small></label><div className="event-checkin-form-grid"><label><span>WhatsApp</span><input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="(11) 99999-9999" /></label><label><span>Empresa da pessoa <b>opcional</b></span><input name="company" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Nome da empresa" autoComplete="organization" /></label></div>{attendeeType === "guest" ? <div className="event-checkin-form-grid"><label><span>Quem convidou</span><select value={hostChoice} onChange={(event) => setHostChoice(event.target.value)}><option value="">Selecionar membro (opcional)</option>{candidates.map((candidate) => <option key={candidate.attendeeId} value={candidate.attendeeId}>{candidate.fullName}</option>)}</select></label><label><span>Anfitrião não listado</span><input value={hostName} onChange={(event) => setHostName(event.target.value)} disabled={Boolean(hostChoice)} placeholder="Opcional" /></label></div> : null}<details><summary>Adicionar mais informações</summary><div className="event-checkin-form-grid"><label><span>Cargo</span><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Opcional" /></label><label><span>E-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Opcional" /></label></div></details><label className="event-checkin-immediate"><input type="checkbox" checked={checkInNow} onChange={(event) => setCheckInNow(event.target.checked)} /><span><strong>Confirmar chegada agora</strong><small>A pessoa será salva e marcada como presente.</small></span></label>{error ? <p className="event-checkin-error" role="alert">{error}</p> : null}<footer><button type="button" className="event-checkin-secondary" onClick={onClose}>Cancelar</button><button className="event-checkin-confirm" disabled={busy}>{busy ? "Salvando…" : checkInNow ? "Adicionar e confirmar chegada" : "Adicionar à lista"}</button></footer></form></section>;
}

function EditParticipantForm({ participant, candidates, onClose, onSubmit, busy }: { participant: Participant; candidates: CheckInData["hostCandidates"]; onClose: () => void; onSubmit: (value: Record<string, unknown>) => Promise<void>; busy: boolean }) {
  const [fullName, setFullName] = useState(participant.displayName);
  const [company, setCompany] = useState(participant.company);
  const [phone, setPhone] = useState(participant.phone);
  const [attendeeType, setAttendeeType] = useState<AttendeeType>(participant.attendeeType);
  const currentHost = candidates.find((candidate) => candidate.id === participant.host?.id || candidate.fullName === participant.hostName);
  const [hostAttendeeId, setHostAttendeeId] = useState(currentHost ? String(currentHost.attendeeId) : "");
  const [hostName, setHostName] = useState(currentHost ? "" : participant.hostName);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await onSubmit({ fullName, company, phone, attendeeType, hostAttendeeId: hostAttendeeId ? Number(hostAttendeeId) : null, hostName });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível salvar a pessoa.");
    }
  }

  return <section className="event-checkin-add-guest event-checkin-edit-person" aria-labelledby="edit-person-title"><header><div><span>CADASTRO DO EVENTO</span><h2 id="edit-person-title">Editar pessoa</h2><p>Atualize os dados da lista. O anfitrião é um membro associado a um convidado.</p></div><button type="button" aria-label="Fechar edição" onClick={onClose}>×</button></header><form onSubmit={submit}><label><span>Nome completo <b>obrigatório</b></span><input autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} /></label><div className="event-checkin-form-grid"><label><span>Empresa</span><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Nome da empresa" autoComplete="organization" /></label><label><span>WhatsApp</span><input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="(11) 99999-9999" /></label></div><label><span>Tipo de participação</span><select value={attendeeType} onChange={(event) => setAttendeeType(event.target.value as AttendeeType)}><option value="member">Membro do clube</option><option value="guest">Convidado</option></select><small className="event-checkin-field-hint">Um membro pode ser escolhido como anfitrião de convidados. Não é criada uma conta nova por esta edição.</small></label>{attendeeType === "guest" ? <div className="event-checkin-form-grid"><label><span>Anfitrião</span><select value={hostAttendeeId} onChange={(event) => setHostAttendeeId(event.target.value)}><option value="">Selecionar membro (opcional)</option>{candidates.filter((candidate) => candidate.attendeeId !== participant.id).map((candidate) => <option key={candidate.attendeeId} value={candidate.attendeeId}>{candidate.fullName}</option>)}</select></label><label><span>Anfitrião não listado</span><input value={hostName} onChange={(event) => setHostName(event.target.value)} disabled={Boolean(hostAttendeeId)} placeholder="Opcional" /></label></div> : <aside className="event-checkin-role-note"><strong>Membro do clube</strong><span>Esta pessoa já pode ser selecionada como anfitrião ao editar um convidado.</span></aside>}{error ? <p className="event-checkin-error" role="alert">{error}</p> : null}<footer><button type="button" className="event-checkin-secondary" onClick={onClose}>Cancelar</button><button className="event-checkin-confirm" disabled={busy}>{busy ? "Salvando…" : "Salvar alterações"}</button></footer></form></section>;
}

export default function CheckInConsole({ eventId, userRole }: { eventId: number; userRole: string }) {
  const [data, setData] = useState<CheckInData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | "guest" | "finalize" | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AttendeeType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CheckInStatus>("all");
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [pendingDestructiveAction, setPendingDestructiveAction] = useState<
    | { kind: "finalize" }
    | { kind: "remove-participant"; participant: Participant }
    | null
  >(null);

  async function load() {
    const response = await fetch(`/api/admin/events/${eventId}/check-in`, { cache: "no-store" });
    const payload = await response.json() as CheckInData & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar o check-in.");
    setData(payload);
  }

  useEffect(() => {
    let mounted = true;
    void fetch(`/api/admin/events/${eventId}/check-in`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as CheckInData & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar o check-in.");
        if (mounted) setData(payload);
      })
      .catch((loadError) => { if (mounted) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o check-in."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [eventId]);

  async function action(body: Record<string, unknown>, busy: number | "guest" | "finalize") {
    setBusyId(busy); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/events/${eventId}/check-in`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as CheckInData & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar a alteração.");
      setData(payload);
      setNotice(payload.notice ?? "Alteração salva.");
      if (body.action === "check-in" && typeof navigator !== "undefined") navigator.vibrate?.(14);
    } finally { setBusyId(null); }
  }

  function generateAttendancePdf() {
    if (!data) return;
    const fileName = `presenca-${pdfSafeText(data.event.title).toLowerCase().replace(/\s+/g, "-").slice(0, 48) || "evento"}.pdf`;
    const downloadUrl = URL.createObjectURL(createAttendancePdf(data));
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
    setNotice("Relatório em PDF baixado. Ele reflete o status atual do check-in.");
  }

  const filtered = useMemo(() => (data?.participants ?? []).filter((participant) => (typeFilter === "all" || participant.attendeeType === typeFilter) && (statusFilter === "all" || participant.status === statusFilter) && matchesParticipantSearch(participant, query)), [data, query, statusFilter, typeFilter]);
  const historyItems = useMemo(() => (data?.participants ?? [])
    .flatMap((participant) => participant.history.map((history) => ({ ...history, name: participant.displayName })))
    .sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt)), [data]);

  if (loading) return <main className="event-checkin-shell"><div className="event-checkin-loading"><TimeLogo variant="blue" className="event-checkin-state-logo" /><span /><strong>Preparando lista de presença…</strong></div></main>;
  if (error && !data) return <main className="event-checkin-shell"><section className="event-checkin-fatal" role="alert"><TimeLogo variant="blue" className="event-checkin-state-logo" /><span>!</span><h1>Não foi possível abrir o check-in</h1><p>{error}</p><button className="event-checkin-confirm" onClick={() => { setLoading(true); setError(""); void load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar.")).finally(() => setLoading(false)); }}>Tentar novamente</button></section></main>;
  if (!data) return null;
  const expectedRemaining = data.summary.expected - data.summary.present - data.summary.absent - data.summary.cancelled;

  const returnHref = userRole === "coordinator" ? "/app" : "/admin";
  const returnLabel = userRole === "coordinator" ? "← Área de membros" : "← Administração";
  return <main className="event-checkin-shell"><header className="event-checkin-header"><div><Link href={returnHref} className="event-checkin-brand" aria-label="TIME Escola de Negócios"><TimeLogo variant="blue" priority /></Link><Link href={returnHref} className="event-checkin-back">{returnLabel}</Link><span>EVENTO · CHECK-IN</span><h1>{data.event.title}</h1><p>{formatEventStart(data.event.startsAt)}{data.event.locationName ? ` · ${data.event.locationName}` : ""}{data.event.city ? ` · ${data.event.city}` : ""}</p></div><div className="event-checkin-header-actions"><span className="event-checkin-role">{userRole === "coordinator" ? "COORDENAÇÃO" : "ADMINISTRATIVO"}</span><button className="event-checkin-add" type="button" onClick={() => setAddGuestOpen(true)}>+ Adicionar pessoa</button></div></header>
    <section className="event-checkin-summary" aria-label="Resumo do check-in"><article><span>ESPERADOS</span><strong>{data.summary.expected}</strong><small>{expectedRemaining} ainda não chegaram</small></article><article className="present"><span>PRESENTES</span><strong>{data.summary.present}</strong><small>Atualiza a cada chegada</small></article><article><span>MEMBROS</span><strong>{data.summary.membersPresent}<b>/{data.summary.members}</b></strong><small>presentes</small></article><article><span>CONVIDADOS</span><strong>{data.summary.guestsPresent}<b>/{data.summary.guests}</b></strong><small>{data.summary.addedAtDoor} adicionado(s) na porta</small></article></section>
    {notice ? <p className="event-checkin-notice" role="status">✓ {notice}</p> : null}{error ? <p className="event-checkin-error" role="alert">{error}</p> : null}
    <section className="event-checkin-controls" aria-label="Busca e filtros"><label className="event-checkin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar participante" autoComplete="off" /><small>Nome, empresa ou anfitrião</small></label><div className="event-checkin-filters"><div role="group" aria-label="Tipo de participante">{(["all", "member", "guest"] as const).map((filter) => <button key={filter} type="button" className={typeFilter === filter ? "active" : ""} onClick={() => setTypeFilter(filter)}>{filter === "all" ? "Todos" : filter === "member" ? "Membros" : "Convidados"}</button>)}</div><div role="group" aria-label="Status de presença">{(["all", "expected", "present"] as const).map((filter) => <button key={filter} type="button" className={statusFilter === filter ? "active" : ""} onClick={() => setStatusFilter(filter)}>{filter === "all" ? "Todos" : filter === "expected" ? "Ainda não chegaram" : "Presentes"}</button>)}</div></div></section>
    <section className="event-checkin-list" aria-live="polite"><header><div><span>PARTICIPANTES</span><h2>{filtered.length} {filtered.length === 1 ? "pessoa encontrada" : "pessoas encontradas"}</h2></div><div className="event-checkin-report-actions"><button className="event-checkin-finalize" type="button" disabled={busyId === "finalize" || expectedRemaining === 0} onClick={() => { setError(""); setPendingDestructiveAction({ kind: "finalize" }); }}>{busyId === "finalize" ? "Finalizando…" : "Finalizar check-in"}</button><button className="event-checkin-pdf" type="button" onClick={generateAttendancePdf} title="Baixar agora um relatório com o status atual do check-in">Baixar relatório PDF</button></div></header>{expectedRemaining > 0 ? <p className="event-checkin-report-hint">O relatório já pode ser baixado e mostra quem está presente e quem ainda não chegou. Finalize o check-in ao fim do evento para marcar os ausentes.</p> : <p className="event-checkin-report-hint is-ready">Relatório final pronto: inclui confirmações e ausentes.</p>}{filtered.length ? <div>{filtered.map((participant) => <ParticipantRow key={participant.id} participant={participant} busy={busyId === participant.id} onCheckIn={() => void action({ action: "check-in", attendeeId: participant.id }, participant.id).catch((actionError) => setError(actionError instanceof Error ? actionError.message : "Não foi possível confirmar."))} onUndo={() => void action({ action: "undo", attendeeId: participant.id }, participant.id).catch((actionError) => setError(actionError instanceof Error ? actionError.message : "Não foi possível desfazer."))} onEdit={() => setEditingParticipant(participant)} onRemove={() => { setError(""); setPendingDestructiveAction({ kind: "remove-participant", participant }); }} />)}</div> : <div className="event-checkin-empty"><strong>Nenhum participante encontrado</strong><p>Altere a busca ou os filtros. Também é possível adicionar um convidado na hora.</p></div>}</section>
    <details className="event-checkin-history"><summary>Histórico administrativo do evento</summary><div>{historyItems.length ? historyItems.map((history) => <article key={history.id}><strong>{history.name}</strong><span>{statusCopy[history.previousStatus]} → {statusCopy[history.newStatus]}</span><small>{formatWhen(history.changedAt)} · {history.changedByEmail || "usuário administrativo"}</small></article>) : <p>Nenhuma alteração registrada.</p>}</div></details>
    {addGuestOpen ? <AddGuestForm candidates={data.hostCandidates} onClose={() => setAddGuestOpen(false)} busy={busyId === "guest"} onSubmit={async (value) => { await action({ action: "add-guest", ...value }, "guest"); }} /> : null}
    {editingParticipant ? <EditParticipantForm participant={editingParticipant} candidates={data.hostCandidates} onClose={() => setEditingParticipant(null)} busy={busyId === editingParticipant.id} onSubmit={async (value) => { await action({ action: "update-participant", attendeeId: editingParticipant.id, ...value }, editingParticipant.id); }} /> : null}
    {pendingDestructiveAction ? <div className="event-registration-backdrop" role="presentation"><section className="event-registration-modal compact" role="dialog" aria-modal="true" aria-labelledby="checkin-destructive-title"><button className="event-registration-close" type="button" aria-label="Fechar confirmação" disabled={busyId !== null} onClick={() => setPendingDestructiveAction(null)}>×</button><div className="event-registration-content"><span>CONFIRMAÇÃO NECESSÁRIA</span><h2 id="checkin-destructive-title">{pendingDestructiveAction.kind === "finalize" ? "Finalizar o check-in?" : `Remover ${pendingDestructiveAction.participant.displayName} desta lista?`}</h2><p>{pendingDestructiveAction.kind === "finalize" ? `${expectedRemaining} participante(s) ainda esperado(s) será(ão) marcado(s) como ausente(s).` : "Somente o registro nesta lista será removido. O perfil geral não será apagado."}</p>{error ? <p className="event-checkin-error" role="alert">{error}</p> : null}<footer><button type="button" className="event-checkin-secondary" disabled={busyId !== null} onClick={() => setPendingDestructiveAction(null)}>Manter como está</button><button type="button" className="event-checkin-confirm" disabled={busyId !== null} onClick={() => void (async () => { try { if (pendingDestructiveAction.kind === "finalize") await action({ action: "finalize" }, "finalize"); else await action({ action: "remove-participant", attendeeId: pendingDestructiveAction.participant.id }, pendingDestructiveAction.participant.id); setPendingDestructiveAction(null); } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Não foi possível concluir a ação."); } })()}>{busyId !== null ? "Atualizando…" : pendingDestructiveAction.kind === "finalize" ? "Sim, finalizar check-in" : "Sim, remover da lista"}</button></footer></div></section></div> : null}
  </main>;
}
