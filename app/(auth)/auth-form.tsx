"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/config";
import { safeReturnPath } from "@/lib/auth-redirect";
import { Icon } from "../app/icons";

type Mode = "login" | "signup" | "forgot" | "reset";

const AUTH_DRAFT_KEY = "time-auth-draft-v1";
const NEW_MEMBER_ONBOARDING_PATH = "/app/cadastro";

type AuthDraft = {
  fullName?: string;
  email?: string;
};

const messages: Record<string, string> = {
  sessao_necessaria: "Entre com sua conta para continuar.",
  sessao_expirada: "Sua sessão expirou. Entre novamente para continuar.",
  sessao_encerrada: "Você saiu da sua conta com segurança.",
  senha_atualizada: "Senha atualizada. Entre novamente com sua nova senha.",
  email_confirmado: "E-mail confirmado. Sua conta está pronta para entrar.",
  link_invalido: "Este link expirou ou já foi utilizado. Solicite um novo acesso.",
  configuracao_pendente: "O acesso está temporariamente indisponível. Tente novamente em instantes.",
};

function humanizeAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (normalized.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (normalized.includes("user already registered")) return "Já existe uma conta com este e-mail.";
  if (normalized.includes("password should be")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (normalized.includes("rate limit")) return "Muitas tentativas em pouco tempo. Aguarde alguns minutos.";
  return "Não foi possível concluir agora. Revise os dados e tente novamente.";
}

export function AuthForm({ mode, supabaseConfig }: { mode: Mode; supabaseConfig: SupabasePublicConfig | null }) {
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("retorno"));
  const adminFlow = mode === "login" && returnTo === "/admin";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(AUTH_DRAFT_KEY);
        if (!saved) return;
        const draft = JSON.parse(saved) as AuthDraft;
        if (typeof draft.fullName === "string") setFullName(draft.fullName);
        if (typeof draft.email === "string") setEmail(draft.email);
      } catch {
        // Um rascunho inválido não pode impedir o acesso à conta.
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function saveDraft(patch: AuthDraft) {
    try {
      const saved = window.sessionStorage.getItem(AUTH_DRAFT_KEY);
      const current = saved ? JSON.parse(saved) as AuthDraft : {};
      window.sessionStorage.setItem(AUTH_DRAFT_KEY, JSON.stringify({ ...current, ...patch }));
    } catch {
      // O formulário segue funcional quando o navegador bloqueia armazenamento temporário.
    }
  }

  function clearDraft() {
    try {
      window.sessionStorage.removeItem(AUTH_DRAFT_KEY);
    } catch {
      // Não há dado sensível persistido neste rascunho.
    }
  }

  function authHref(path: string) {
    return `${path}?retorno=${encodeURIComponent(returnTo)}`;
  }

  function goBack() {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer?.origin === window.location.origin && window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch {
      // Usa a rota segura abaixo se o referenciador não puder ser interpretado.
    }

    window.location.assign("/");
  }

  const notice = useMemo(() => {
    const key = searchParams.get("mensagem") ?? "";
    return messages[key] ?? "";
  }, [searchParams]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    if (mode !== "reset" && !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Informe um e-mail válido.");
      return;
    }
    if ((mode === "login" || mode === "signup" || mode === "reset") && password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (mode === "signup" && fullName.trim().length < 3) {
      setError("Informe seu nome completo.");
      return;
    }
    if (mode === "reset" && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    const supabase = createBrowserSupabaseClient(supabaseConfig, remember);
    if (!supabase) {
      setError("O acesso está temporariamente indisponível. Tente novamente em instantes.");
      return;
    }

    setLoading(true);
    try {
      if (adminFlow) {
        const { error: authError } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${window.location.origin}/auth/confirm?retorno=/admin`,
          },
        });
        if (authError) throw authError;
        setSuccess("Enviamos um link seguro para este e-mail. Após abrir o link, a plataforma confirmará sua permissão administrativa.");
        return;
      }

      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (authError) throw authError;
        clearDraft();
        window.location.assign(returnTo);
        return;
      }

      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/confirm?retorno=${encodeURIComponent(NEW_MEMBER_ONBOARDING_PATH)}`,
          },
        });
        if (authError) throw authError;
        if (!data.user) throw new Error("Cadastro não confirmado pelo provedor de autenticação.");
        if (data.user.identities?.length === 0) {
          setError("Já existe uma conta com este e-mail.");
          return;
        }
        if (data.session) {
          clearDraft();
          window.location.assign(NEW_MEMBER_ONBOARDING_PATH);
          return;
        }
        setSuccess("Conta criada. Enviamos um link de confirmação para o seu e-mail.");
        return;
      }

      if (mode === "forgot") {
        const resetPath = `/redefinir-senha?retorno=${encodeURIComponent(returnTo)}`;
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          { redirectTo: `${window.location.origin}/auth/confirm?retorno=${encodeURIComponent(resetPath)}` },
        );
        if (authError) throw authError;
        setSuccess("Se este e-mail estiver cadastrado, você receberá as instruções para criar uma nova senha.");
        return;
      }

      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;
      clearDraft();
      window.location.assign(returnTo === "/redefinir-senha" ? "/app" : returnTo);
    } catch (caught) {
      setError(humanizeAuthError(caught instanceof Error ? caught.message : ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" method="post" onSubmit={submit} noValidate>
      <button className="auth-back" type="button" onClick={goBack} disabled={loading}>
        <Icon name="back" size={18} />
        Voltar
      </button>
      {notice ? <div className="auth-notice" role="status">{notice}</div> : null}
      {success ? <div className="auth-success" role="status">{success}</div> : null}
      {error ? <div className="auth-error" role="alert">{error}</div> : null}

      {mode === "signup" ? (
        <label>
          <span>Nome completo</span>
          <input
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Como você quer ser chamado"
            value={fullName}
            onChange={(event) => { setFullName(event.target.value); saveDraft({ fullName: event.target.value }); }}
            disabled={loading || Boolean(success)}
          />
        </label>
      ) : null}

      {adminFlow ? (
        <div className="admin-passwordless-card">
          <span>ADMINISTRADOR AUTORIZADO</span>
          <strong>Acesso sem senha</strong>
          <p>Informe seu e-mail autorizado. O link pessoal e temporário confirma sua identidade antes de abrir o painel.</p>
        </div>
      ) : null}

      {mode !== "reset" ? (
        <label>
          <span>E-mail</span>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nome@empresa.com.br"
            value={email}
            onChange={(event) => { setEmail(event.target.value); saveDraft({ email: event.target.value }); }}
            disabled={loading || Boolean(success)}
          />
        </label>
      ) : null}

      {(mode === "login" && !adminFlow) || mode === "signup" || mode === "reset" ? (
        <label>
          <span>{mode === "reset" ? "Nova senha" : "Senha"}</span>
          <div className="auth-password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="Mínimo de 8 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading || Boolean(success)}
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </label>
      ) : null}

      {mode === "reset" ? (
        <label>
          <span>Confirmar senha</span>
          <input
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Digite a senha novamente"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={loading || Boolean(success)}
          />
        </label>
      ) : null}

      {mode === "login" && !adminFlow ? (
        <div className="auth-form-options">
          <label className="auth-check">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            <span>Manter conectado</span>
          </label>
          <Link href={authHref("/recuperar-senha")}>Esqueci minha senha</Link>
        </div>
      ) : null}

      <button className="auth-submit" type="submit" disabled={loading || Boolean(success)}>
        {loading ? <><i />Aguarde…</> : adminFlow ? "Receber acesso de administrador" : mode === "login" ? "Entrar na TIME" : mode === "signup" ? "Criar minha conta" : mode === "forgot" ? "Enviar instruções" : "Salvar nova senha"}
      </button>

      <footer>
        {mode === "login" && !adminFlow ? <><p>Ainda não tem conta? <Link href={authHref("/criar-conta")}>Criar conta</Link></p><p className="auth-admin-link"><Link href="/entrar?retorno=/admin">Acesso administrativo</Link></p></> : null}
        {adminFlow ? <p><Link href="/entrar?retorno=/app">Entrar como membro</Link></p> : null}
        {mode === "signup" ? <p>Já possui uma conta? <Link href={authHref("/entrar")}>Entrar</Link></p> : null}
        {mode === "forgot" || mode === "reset" ? <p><Link href={authHref("/entrar")}>Voltar para o login</Link></p> : null}
      </footer>
    </form>
  );
}
