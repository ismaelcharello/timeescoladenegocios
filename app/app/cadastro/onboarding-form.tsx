"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState, useTransition } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/config";
import TimeLogo from "@/app/time-logo";
import {
  calculateProfileCompleteness,
  getMissingProfileFields,
  getMissingRequiredProfileFields,
  isNetworkingProfileReady,
  profileToDraft,
  type MemberProfile,
  type MemberProfileDraft,
  type SaveProfileResult,
} from "@/lib/member-profile";

type Props = {
  user: { id: string; email: string; name: string };
  initialProfile: MemberProfile | null;
  supabaseConfig: SupabasePublicConfig | null;
};

const steps = [
  { number: 1, label: "Dados pessoais", helper: "Quem é você" },
  { number: 2, label: "Informações profissionais", helper: "Sua atuação" },
  { number: 3, label: "Sobre a empresa", helper: "O que sua empresa faz" },
  { number: 4, label: "Conexões desejadas", helper: "Oportunidades relevantes" },
  { number: 5, label: "Revisão", helper: "Confirme seu perfil" },
];

const states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

type FieldProps = {
  label: string;
  name: keyof MemberProfileDraft;
  value: string;
  onChange: (name: keyof MemberProfileDraft, value: string) => void;
  error?: string;
  placeholder?: string;
  type?: "text" | "url" | "tel";
  required?: boolean;
  wide?: boolean;
  list?: string;
};

function Field({ label, name, value, onChange, error, placeholder, type = "text", required, wide, list }: FieldProps) {
  return (
    <label className={wide ? "onboarding-field onboarding-field-wide" : "onboarding-field"}>
      <span>{label}{required ? <b> *</b> : null}</span>
      <input
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        list={list}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error ? <small id={`${name}-error`}>{error}</small> : null}
    </label>
  );
}

const cityOptions = ["Curitiba", "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Brasília", "Florianópolis", "Porto Alegre", "Londrina", "Maringá", "Joinville", "Campinas", "Recife", "Salvador"];
const professionOptions = ["CEO", "Sócio-fundador", "Diretor", "Gerente", "Empresário", "Consultor", "Especialista", "Vendedor", "Designer", "Psicólogo", "Advogado", "Contador", "Desenvolvedor", "Profissional de marketing"];
const segmentOptions = ["Tecnologia", "Marketing", "Vendas", "Educação", "Saúde", "Finanças", "Consultoria", "Jurídico", "Imobiliário", "Construção", "Indústria", "Varejo", "Serviços profissionais"];

function TextAreaField({ label, name, value, onChange, error, placeholder, required, hint }: FieldProps & { hint?: string }) {
  return (
    <label className="onboarding-field onboarding-field-wide">
      <span>{label}{required ? <b> *</b> : null}</span>
      {hint ? <em>{hint}</em> : null}
      <textarea
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error ? <small id={`${name}-error`}>{error}</small> : null}
    </label>
  );
}

function ReviewItem({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="onboarding-review-item">
      <div><span>{label}</span><p>{value || "Não informado"}</p></div>
      <button type="button" onClick={onEdit}>Editar</button>
    </div>
  );
}

export default function OnboardingForm({ user, initialProfile, supabaseConfig }: Props) {
  const initialStep = Math.min(5, Math.max(1, initialProfile?.onboarding_step ?? 1));
  const [step, setStep] = useState(initialProfile?.completed_at ? 5 : initialStep);
  const [draft, setDraft] = useState(() => profileToDraft(initialProfile, user.name));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof MemberProfileDraft, string>>>({});
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const completeness = useMemo(() => calculateProfileCompleteness(draft), [draft]);
  const networkingReady = useMemo(() => isNetworkingProfileReady(draft), [draft]);
  const missingFields = useMemo(() => getMissingProfileFields(draft), [draft]);
  const missingRequiredFields = useMemo(() => getMissingRequiredProfileFields(draft), [draft]);
  const busy = isPending || uploading;

  useEffect(() => {
    if (!initialProfile?.avatar_path) return;
    const supabase = createBrowserSupabaseClient(supabaseConfig);
    if (!supabase) return;
    void supabase.storage.from("member-avatars").createSignedUrl(initialProfile.avatar_path, 3600)
      .then(({ data }) => setAvatarUrl(data?.signedUrl ?? ""));
  }, [initialProfile?.avatar_path, supabaseConfig]);

  function updateField(name: keyof MemberProfileDraft, value: string) {
    setDraft((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setMessage("");
    setMessageIsError(false);
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 5 * 1024 * 1024) {
      setMessage("Use uma imagem JPG, PNG ou WebP de até 5 MB.");
      setMessageIsError(true);
      return;
    }

    const supabase = createBrowserSupabaseClient(supabaseConfig);
    if (!supabase) {
      setMessage("O envio de imagens ainda não está disponível.");
      setMessageIsError(true);
      return;
    }
    setUploading(true);
    setMessage("");
    setMessageIsError(false);
    const path = `${user.id}/avatar`;
    const { error } = await supabase.storage.from("member-avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });
    if (error) {
      setMessage("Não foi possível enviar a foto. Tente novamente.");
      setMessageIsError(true);
    } else {
      updateField("avatar_path", path);
      setAvatarUrl(URL.createObjectURL(file));
      setMessage("Foto atualizada.");
      setMessageIsError(false);
    }
    setUploading(false);
  }

  function persist(finalize = false) {
    startTransition(async () => {
      setMessage("");
      setMessageIsError(false);
      try {
        const request = await fetch("/api/member-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ draft, currentStep: step, finalize }),
        });
        const result = (await request.json()) as SaveProfileResult;
        if (request.status === 401) {
          window.location.assign("/entrar?retorno=/app/cadastro&mensagem=sessao_expirada");
          return;
        }
        if (!result.ok) {
          setFieldErrors(result.fieldErrors ?? {});
          setMessage(result.message);
          setMessageIsError(true);
          const firstError = result.fieldErrors ? Object.keys(result.fieldErrors)[0] : null;
          if (firstError) document.querySelector(`[name="${firstError}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        setFieldErrors({});
        setMessage(result.message);
        setMessageIsError(false);
        if (finalize) window.location.assign("/app");
        else setStep((current) => Math.min(5, current + 1));
      } catch {
        setMessage("Não foi possível salvar agora. Verifique sua conexão e tente novamente.");
        setMessageIsError(true);
      }
    });
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-topbar">
        <Link href="/" className="onboarding-logo" aria-label="TIME Escola de Negócios"><TimeLogo variant="blue" priority /></Link>
        <div><span>Cadastro empresarial</span><a href="/auth/signout">Sair</a></div>
      </header>

      <div className="onboarding-layout">
        <aside className="onboarding-sidebar">
          <span className="onboarding-eyebrow">SEU PERFIL TIME</span>
          <h1>Transforme seu cadastro em conexões reais.</h1>
          <p>Quanto mais completo estiver seu perfil, melhores serão as recomendações e oportunidades apresentadas pela TIME.</p>
          <div className="onboarding-completeness" aria-label={`Perfil ${completeness}% completo`}>
            <div><span>Perfil completo</span><strong>{completeness}%</strong></div>
            <i><b style={{ width: `${completeness}%` }} /></i>
          </div>
          <nav aria-label="Etapas do cadastro">
            {steps.map((item) => (
              <button
                key={item.number}
                type="button"
                className={item.number === step ? "active" : item.number < step ? "done" : ""}
                onClick={() => item.number <= step && setStep(item.number)}
                disabled={item.number > step || busy}
              >
                <b>{item.number < step ? "✓" : item.number}</b>
                <span>{item.label}<small>{item.helper}</small></span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="onboarding-content">
          <div className="onboarding-mobile-progress"><span>Etapa {step} de 5</span><strong>{steps[step - 1].label}</strong></div>
          <div className="onboarding-card">
            {step === 1 ? (
              <>
                <header><span>ETAPA 1</span><h2>Comece em menos de 1 minuto</h2><p>Preencha só o essencial para entrar. Depois, complete seu perfil para liberar cursos, networking e recomendações.</p></header>
                <div className="onboarding-avatar-row">
                  <div
                    className="onboarding-avatar"
                    role="img"
                    aria-label="Sua foto de perfil"
                    style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
                  >
                    {!avatarUrl ? <span>{(draft.full_name || user.email).charAt(0).toUpperCase()}</span> : null}
                  </div>
                  <div><label className="onboarding-upload">{uploading ? "Enviando…" : "Escolher foto"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={busy} /></label><small>JPG, PNG ou WebP. Máximo de 5 MB.</small></div>
                </div>
                <div className="onboarding-grid">
                  <Field label="Nome completo" name="full_name" value={draft.full_name} onChange={updateField} error={fieldErrors.full_name} required wide placeholder="Seu nome e sobrenome" />
                  <label className="onboarding-field onboarding-field-wide"><span>E-mail</span><input type="email" value={user.email} readOnly aria-label="E-mail da conta" /></label>
                  <Field label="WhatsApp" name="whatsapp" value={draft.whatsapp} onChange={updateField} error={fieldErrors.whatsapp} type="tel" required placeholder="(41) 99999-9999" />
                  <Field label="Cidade" name="city" value={draft.city} onChange={updateField} error={fieldErrors.city} required placeholder="Digite ou escolha sua cidade" list="time-cities" />
                  <label className="onboarding-field"><span>Estado<b> *</b></span><select name="state" value={draft.state} onChange={(event) => updateField("state", event.target.value)} aria-invalid={Boolean(fieldErrors.state)}><option value="">Selecione seu estado</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}</select>{fieldErrors.state ? <small>{fieldErrors.state}</small> : null}</label>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <header><span>ETAPA 2</span><h2>Informações profissionais</h2><p>Mostre sua atuação e facilite conexões dentro do seu mercado.</p></header>
                <div className="onboarding-grid">
                  <Field label="Cargo" name="job_title" value={draft.job_title} onChange={updateField} error={fieldErrors.job_title} required placeholder="Digite ou escolha seu cargo" list="time-professions" />
                  <Field label="Nome da empresa" name="company_name" value={draft.company_name} onChange={updateField} error={fieldErrors.company_name} required placeholder="Nome da sua empresa" />
                  <Field label="Segmento" name="segment" value={draft.segment} onChange={updateField} error={fieldErrors.segment} required wide placeholder="Digite ou escolha o nicho da empresa" list="time-segments" />
                  <Field label="Site" name="website_url" value={draft.website_url} onChange={updateField} type="url" placeholder="https://" />
                  <Field label="Instagram" name="instagram_url" value={draft.instagram_url} onChange={updateField} type="url" placeholder="https://instagram.com/" />
                  <Field label="LinkedIn" name="linkedin_url" value={draft.linkedin_url} onChange={updateField} type="url" wide placeholder="https://linkedin.com/in/" />
                </div>
              </>
            ) : null}

            <datalist id="time-cities">{cityOptions.map((city) => <option key={city} value={city} />)}</datalist>
            <datalist id="time-professions">{professionOptions.map((profession) => <option key={profession} value={profession} />)}</datalist>
            <datalist id="time-segments">{segmentOptions.map((segment) => <option key={segment} value={segment} />)}</datalist>

            {step === 3 ? (
              <>
                <header><span>ETAPA 3</span><h2>Sobre a empresa</h2><p>Essas informações serão usadas para apresentar sua empresa e melhorar as futuras buscas.</p></header>
                <div className="onboarding-grid">
                  <TextAreaField label="Descrição da empresa" name="company_description" value={draft.company_description} onChange={updateField} error={fieldErrors.company_description} required placeholder="Explique de forma clara o que sua empresa faz." />
                  <TextAreaField label="Produtos" name="products" value={draft.products} onChange={updateField} placeholder="Liste os principais produtos oferecidos." />
                  <TextAreaField label="Serviços" name="services" value={draft.services} onChange={updateField} error={fieldErrors.services} required placeholder="Liste os principais serviços oferecidos." />
                  <TextAreaField label="Público atendido" name="target_audience" value={draft.target_audience} onChange={updateField} error={fieldErrors.target_audience} required placeholder="Quem normalmente contrata ou compra da sua empresa?" />
                  <Field label="Área de atuação" name="service_area" value={draft.service_area} onChange={updateField} wide placeholder="Mercados, especialidades ou áreas atendidas" />
                  <TextAreaField label="Diferenciais" name="differentiators" value={draft.differentiators} onChange={updateField} placeholder="O que diferencia sua empresa no mercado?" />
                  <Field label="Regiões atendidas" name="regions_served" value={draft.regions_served} onChange={updateField} wide placeholder="Cidades, estados ou atendimento nacional" />
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <header><span>ETAPA 4</span><h2>Conexões desejadas</h2><p>Conte o que você oferece e quais oportunidades fazem sentido para seu momento.</p></header>
                <div className="onboarding-grid">
                  <TextAreaField label="O que você oferece" name="offers" value={draft.offers} onChange={updateField} error={fieldErrors.offers} required placeholder="Quais soluções você pode oferecer aos membros?" />
                  <TextAreaField label="Como pode ajudar outros membros" name="how_can_help" value={draft.how_can_help} onChange={updateField} placeholder="Experiências, contatos ou conhecimentos que pode compartilhar." />
                  <TextAreaField label="O que procura" name="looking_for" value={draft.looking_for} onChange={updateField} error={fieldErrors.looking_for} required placeholder="Descreva suas necessidades atuais." />
                  <TextAreaField label="Que profissional deseja conhecer" name="desired_professionals" value={draft.desired_professionals} onChange={updateField} placeholder="Perfis profissionais que seriam relevantes para você." />
                  <TextAreaField label="Que indicação deseja receber" name="desired_referrals" value={draft.desired_referrals} onChange={updateField} error={fieldErrors.desired_referrals} required placeholder="Clientes, parceiros, fornecedores ou especialistas." />
                  <TextAreaField label="Problemas que sua empresa precisa resolver" name="company_problems" value={draft.company_problems} onChange={updateField} placeholder="Desafios comerciais, operacionais ou estratégicos." />
                  <TextAreaField label="Parcerias que deseja encontrar" name="desired_partnerships" value={draft.desired_partnerships} onChange={updateField} placeholder="Descreva parcerias que poderiam gerar valor mútuo." />
                </div>
              </>
            ) : null}

            {step === 5 ? (
              <>
                <header><span>ETAPA 5</span><h2>Revise seu perfil</h2><p>Confira as informações principais antes de finalizar. Você poderá editar o perfil novamente depois.</p></header>
                <div className="onboarding-review">
                  <ReviewItem label="Perfil pessoal" value={[draft.full_name, draft.job_title, draft.city && draft.state ? `${draft.city} — ${draft.state}` : draft.city].filter(Boolean).join(" · ")} onEdit={() => setStep(1)} />
                  <ReviewItem label="Empresa" value={[draft.company_name, draft.segment].filter(Boolean).join(" · ")} onEdit={() => setStep(2)} />
                  <ReviewItem label="O que a empresa faz" value={draft.company_description} onEdit={() => setStep(3)} />
                  <ReviewItem label="Serviços principais" value={draft.services} onEdit={() => setStep(3)} />
                  <ReviewItem label="O que oferece" value={draft.offers} onEdit={() => setStep(4)} />
                  <ReviewItem label="O que procura" value={draft.looking_for} onEdit={() => setStep(4)} />
                  <ReviewItem label="Indicações desejadas" value={draft.desired_referrals} onEdit={() => setStep(4)} />
                </div>
                <div className="onboarding-final-note"><b>Seu perfil está {completeness}% completo.</b><span>Informações mais detalhadas aumentam a qualidade das conexões futuras.</span></div>
                {missingRequiredFields.length ? <section className="onboarding-missing" aria-label="Campos essenciais pendentes"><strong>Para concluir e liberar o networking, preencha:</strong><ul>{missingRequiredFields.map((field) => <li key={field}>{field}</li>)}</ul></section> : missingFields.length ? <section className="onboarding-missing" aria-label="Itens opcionais para enriquecer o perfil"><strong>Você já pode concluir. Para enriquecer seu perfil depois:</strong><ul>{missingFields.map((field) => <li key={field}>{field}</li>)}</ul></section> : null}
              </>
            ) : null}

            {message ? <div className={messageIsError ? "onboarding-message error" : "onboarding-message"} role={messageIsError ? "alert" : "status"}>{message}</div> : null}

            {step === 5 && networkingReady && completeness < 100 ? <div className="onboarding-message"><b>Os campos essenciais estão completos.</b> Você poderá adicionar os itens opcionais depois, sem bloquear seu acesso.</div> : null}
            <footer className="onboarding-actions">
              <button type="button" className="onboarding-back" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1 || busy}>Voltar</button>
              <button type="button" className="onboarding-next" onClick={() => persist(step === 5)} disabled={busy}>{busy ? "Salvando…" : step === 5 ? "Finalizar cadastro" : "Salvar e continuar"}</button>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
