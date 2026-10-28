"use client";

import { useEffect } from "react";

/** Registers the offline shell only. Account, profile and API data are never
 * cached here, so a shared device cannot surface another member's data. */
export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let refreshTimer: number | undefined;
    let reloading = false;

    // `controllerchange` dispara em dois casos bem diferentes: quando um shell
    // NOVO assume o lugar de um antigo (aí recarregar é o certo, é como o
    // usuário recebe a versão nova) e quando o service worker assume pela
    // PRIMEIRA vez, numa aba que ainda não tinha controlador. No segundo caso
    // não há nada a atualizar — a página acabou de baixar os assets mais
    // recentes — e recarregar só faz a visita custar o dobro.
    //
    // Sem esta guarda, toda primeira visita carregava a página duas vezes.
    // Medido em 6 execuções, dev e produção: 2 documentos, o segundo 213-459 ms
    // depois do primeiro.
    const jaTinhaControlador = Boolean(navigator.serviceWorker.controller);
    const refreshWhenUpdated = () => {
      if (reloading || !jaTinhaControlador) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", refreshWhenUpdated);
    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => {
      const activateUpdate = () => registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      activateUpdate();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) activateUpdate();
        });
      });
      // Cada abertura e, enquanto o app fica aberto, a cada hora, consulta a
      // versão publicada. O shell novo assume sem exigir reinstalação no iPhone.
      refreshTimer = window.setInterval(() => { void registration.update(); }, 60 * 60 * 1000);
    }).catch(() => {
      // PWA installation remains optional; a failed registration must not
      // interfere with access to the member platform.
    });
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", refreshWhenUpdated);
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  }, []);

  return null;
}
