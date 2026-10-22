"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import TimeLogo from "../time-logo";
import { Icon, type IconName } from "./icons";
import { ALL_NAV, MORE_NAV, PRIMARY_NAV, SPA_SECTIONS, type NavId, type NavItem } from "./member-nav";

type ThemePreference = "system" | "light" | "dark";
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

const THEME_KEY = "time-theme";

const THEME_OPTIONS: Array<{ id: ThemePreference; label: string; icon: IconName }> = [
  { id: "system", label: "Automático", icon: "monitor" },
  { id: "light", label: "Claro", icon: "sun" },
  { id: "dark", label: "Escuro", icon: "moon" },
];

function readPreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "T") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export type FrameMember = { name: string; email: string; isAdmin: boolean };

/**
 * Estrutura única da área interna (docs/DESIGN-SYSTEM.md): barra lateral no desktop,
 * barra inferior no celular, mesmo cabeçalho, mesmo menu de conta e mesmo tema em
 * todas as telas. `onNavigate` permite à plataforma trocar de seção sem recarregar;
 * as demais rotas navegam normalmente.
 */
export default function MemberFrame({
  active,
  member,
  onNavigate,
  topbarSlot,
  children,
}: {
  active: NavId;
  member: FrameMember;
  onNavigate?: (id: NavId) => void;
  topbarSlot?: ReactNode;
  children: ReactNode;
}) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const initials = initialsOf(member.name);
  const activeItem = ALL_NAV.find((item) => item.id === active) ?? PRIMARY_NAV[0];
  const moreActive = MORE_NAV.some((item) => item.id === active);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreference(readPreference()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  // Fecha popovers com Esc ou clique fora; a folha "Mais" também fecha com Esc.
  useEffect(() => {
    if (!accountOpen && !notificationsOpen && !moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setAccountOpen(false);
      setNotificationsOpen(false);
      setMoreOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (accountOpen && !accountRef.current?.contains(target)) setAccountOpen(false);
      if (notificationsOpen && !notificationsRef.current?.contains(target)) setNotificationsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [accountOpen, notificationsOpen, moreOpen]);

  const chooseTheme = useCallback((next: ThemePreference) => {
    setPreference(next);
    try {
      if (next === "system") window.localStorage.removeItem(THEME_KEY);
      else window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* sem armazenamento: o tema vale só nesta visita */
    }
    window.dispatchEvent(new Event("time-theme-change"));
  }, []);

  function go(item: NavItem, event: MouseEvent<HTMLElement>) {
    setMoreOpen(false);
    setAccountOpen(false);
    if (onNavigate && SPA_SECTIONS.has(item.id)) {
      event.preventDefault();
      onNavigate(item.id);
    }
  }

  async function installApp() {
    setAccountOpen(false);
    if (!installPrompt) {
      const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent);
      window.alert(
        isAppleMobile
          ? "No iPhone: abra esta página no Safari, toque em Compartilhar e escolha 'Adicionar à Tela de Início'."
          : "Quando o navegador permitir, use o menu dele para instalar a TIME como aplicativo.",
      );
      return;
    }
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  async function manageSubscription() {
    setBillingLoading(true);
    setBillingError("");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Não foi possível abrir sua assinatura.");
      window.location.href = payload.url;
    } catch (requestError) {
      setBillingError(requestError instanceof Error ? requestError.message : "Não foi possível abrir sua assinatura.");
    } finally {
      setBillingLoading(false);
    }
  }

  const renderNavItem = (item: NavItem) => (
    <li key={item.id}>
      <Link
        href={item.href}
        className="mf-nav-link"
        aria-current={active === item.id ? "page" : undefined}
        onClick={(event) => go(item, event)}
      >
        <Icon name={item.icon} />
        <span>{item.label}</span>
      </Link>
    </li>
  );

  return (
    <div className="member-app mf" data-active={active}>
      <a className="mf-skip" href="#conteudo">Pular para o conteúdo</a>

      <aside className="mf-sidebar">
        <Link className="mf-brand" href="/app" aria-label="TIME Escola de Negócios">
          <TimeLogo variant="blue" className="mf-logo mf-logo-light" priority />
          <TimeLogo variant="white" className="mf-logo mf-logo-dark" />
        </Link>
        <nav className="mf-nav-wrap" aria-label="Navegação principal">
          <ul className="mf-nav">{PRIMARY_NAV.map(renderNavItem)}</ul>
          <p className="mf-nav-label">Mais</p>
          <ul className="mf-nav">{MORE_NAV.map(renderNavItem)}</ul>
        </nav>
        <button
          type="button"
          className="mf-account-trigger"
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          onClick={() => setAccountOpen((open) => !open)}
        >
          <span className="mf-avatar" aria-hidden="true">{initials}</span>
          <span className="mf-account-text">
            <strong>{member.name}</strong>
            <small>{member.email}</small>
          </span>
          <Icon name="chevron" size={16} />
        </button>
      </aside>

      <div className="mf-main">
        <header className="mf-topbar">
          <Link className="mf-brand-mobile" href="/app" aria-label="TIME Escola de Negócios">
            <TimeLogo variant="blue" className="mf-logo mf-logo-light" />
            <TimeLogo variant="white" className="mf-logo mf-logo-dark" />
          </Link>
          <p className="mf-title">{activeItem.label}</p>
          <div className="mf-topbar-slot">{topbarSlot}</div>
          <div className="mf-topbar-actions">
            <div className="mf-popover-anchor" ref={notificationsRef}>
              <button
                type="button"
                className="mf-icon-button"
                aria-label="Notificações"
                aria-haspopup="dialog"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setAccountOpen(false);
                }}
              >
                <Icon name="bell" />
              </button>
              {notificationsOpen ? (
                <div className="mf-popover mf-popover-notifications" role="dialog" aria-label="Notificações">
                  <div className="mf-empty">
                    <span aria-hidden="true"><Icon name="check" size={18} /></span>
                    <p><strong>Tudo em dia</strong>Nenhuma notificação nova.</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mf-popover-anchor" ref={accountRef}>
              <button
                type="button"
                className="mf-avatar mf-avatar-button"
                aria-label="Abrir menu da conta"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => {
                  setAccountOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
              >
                {initials}
              </button>
              {accountOpen ? (
                <div className="mf-popover mf-popover-account" role="menu" aria-label="Conta">
                  <div className="mf-account-head">
                    <span className="mf-avatar" aria-hidden="true">{initials}</span>
                    <span className="mf-account-text">
                      <strong>{member.name}</strong>
                      <small>{member.email}</small>
                    </span>
                  </div>
                  <div className="mf-theme" role="group" aria-label="Tema">
                    {THEME_OPTIONS.map((option) => (
                      <button
                        type="button"
                        key={option.id}
                        aria-pressed={preference === option.id}
                        onClick={() => chooseTheme(option.id)}
                      >
                        <Icon name={option.icon} size={16} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <button type="button" role="menuitem" className="mf-menu-item" disabled={billingLoading} onClick={() => void manageSubscription()}>
                    <Icon name="subscription" size={18} />
                    {billingLoading ? "Abrindo…" : "Minha assinatura"}
                  </button>
                  <button type="button" role="menuitem" className="mf-menu-item" onClick={() => void installApp()}>
                    <Icon name="install" size={18} />
                    Baixar app
                  </button>
                  {member.isAdmin ? (
                    <a role="menuitem" className="mf-menu-item" href="/admin">
                      <Icon name="admin" size={18} />
                      Painel admin
                    </a>
                  ) : null}
                  <form action="/auth/signout" method="post">
                    <button type="submit" role="menuitem" className="mf-menu-item">
                      <Icon name="signout" size={18} />
                      Sair
                    </button>
                  </form>
                  {billingError ? <small className="mf-menu-error" role="alert">{billingError}</small> : null}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mf-content" id="conteudo">{children}</main>
      </div>

      <nav className="mf-tabbar" aria-label="Navegação no celular">
        {PRIMARY_NAV.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="mf-tab"
            aria-current={active === item.id ? "page" : undefined}
            onClick={(event) => go(item, event)}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="mf-tab"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          aria-current={moreActive ? "page" : undefined}
          onClick={() => setMoreOpen(true)}
        >
          <Icon name="more" size={22} />
          <span>Mais</span>
        </button>
      </nav>

      {moreOpen ? (
        <div className="mf-sheet" role="dialog" aria-modal="true" aria-label="Mais áreas">
          <button type="button" className="mf-sheet-backdrop" aria-label="Fechar" onClick={() => setMoreOpen(false)} />
          <section>
            <header>
              <strong>Mais áreas</strong>
              <button type="button" className="mf-icon-button" aria-label="Fechar" onClick={() => setMoreOpen(false)}>
                <Icon name="close" />
              </button>
            </header>
            <ul>
              {MORE_NAV.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="mf-sheet-link"
                    aria-current={active === item.id ? "page" : undefined}
                    onClick={(event) => go(item, event)}
                  >
                    <Icon name={item.icon} />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                    <Icon name="chevron" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
