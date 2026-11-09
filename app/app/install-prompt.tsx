"use client";

import { useEffect, useState } from "react";
import { detectInstallMode, isDismissed, type InstallMode } from "@/lib/pwa-install";
import { Icon } from "./icons";

const DISMISS_KEY = "time-install-dismissed";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Convite para instalar o app (PWA), com instrução própria para iPhone. */
export default function InstallPrompt() {
  const [mode, setMode] = useState<InstallMode>("none");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let dispensado = false;
    try {
      dispensado = isDismissed(window.localStorage.getItem(DISMISS_KEY));
    } catch {
      // Sem armazenamento o aviso aparece de novo a cada visita; é aceitável.
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    const avaliar = (evento: BeforeInstallPromptEvent | null) => {
      if (dispensado) return setMode("none");
      setMode(
        detectInstallMode({
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          maxTouchPoints: navigator.maxTouchPoints,
          standalone,
          hasPromptEvent: Boolean(evento),
        }),
      );
    };

    avaliar(null);
    const aoReceberEvento = (evento: Event) => {
      evento.preventDefault();
      const tipado = evento as BeforeInstallPromptEvent;
      setPromptEvent(tipado);
      avaliar(tipado);
    };
    const aoInstalar = () => setMode("installed");
    window.addEventListener("beforeinstallprompt", aoReceberEvento);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoReceberEvento);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  function dispensar() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Não há dado sensível aqui; sem armazenamento só some até recarregar.
    }
    setMode("none");
  }

  async function instalar() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => undefined);
    setPromptEvent(null);
    setMode("none");
  }

  if (mode !== "prompt" && mode !== "ios") return null;

  return (
    <aside className="install-prompt" role="region" aria-label="Instalar o app da TIME">
      <span className="install-prompt-icon" aria-hidden="true">
        <Icon name="install" size={20} />
      </span>
      <div className="install-prompt-copy">
        <strong>Tenha a TIME na tela inicial</strong>
        {mode === "ios" ? (
          <p>
            Toque em <b>Compartilhar</b> no Safari e escolha <b>Adicionar à Tela de Início</b>. O app abre em tela cheia,
            como qualquer outro.
          </p>
        ) : (
          <p>Abra a plataforma em tela cheia, direto do seu celular, sem digitar o endereço.</p>
        )}
      </div>
      <div className="install-prompt-actions">
        {mode === "prompt" ? (
          <button type="button" className="install-prompt-primary" onClick={() => void instalar()}>
            Instalar
          </button>
        ) : null}
        <button type="button" className="install-prompt-dismiss" onClick={dispensar} aria-label="Dispensar aviso por 14 dias">
          Agora não
        </button>
      </div>
    </aside>
  );
}
