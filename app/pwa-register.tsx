"use client";

import { useEffect } from "react";

/** Registers the offline shell only. Account, profile and API data are never
 * cached here, so a shared device cannot surface another member's data. */
export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let refreshTimer: number | undefined;
    let reloading = false;
    const refreshWhenUpdated = () => {
      if (reloading) return;
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
