/**
 * Decide o que mostrar para o membro instalar o PWA. Puro e sem DOM, para ser
 * testável: o componente só lê o ambiente e repassa.
 *
 * Por que existe: no iPhone NÃO há botão nem evento de instalação. A pessoa
 * precisa ir em Compartilhar -> "Adicionar à Tela de Início". Sem uma instrução
 * na tela, quase ninguém instala. No Android/Chrome há o evento
 * `beforeinstallprompt`, que permite um botão de verdade.
 */
export type InstallMode = "installed" | "prompt" | "ios" | "none";

export type InstallEnvironment = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  /** `matchMedia("(display-mode: standalone)")` ou `navigator.standalone`. */
  standalone: boolean;
  /** Já recebemos `beforeinstallprompt`? */
  hasPromptEvent: boolean;
};

export function isIosDevice(env: Pick<InstallEnvironment, "userAgent" | "platform" | "maxTouchPoints">): boolean {
  if (/iPhone|iPad|iPod/i.test(env.userAgent)) return true;
  // iPadOS 13+ se apresenta como Mac; o que o entrega é a tela de toque.
  return env.platform === "MacIntel" && (env.maxTouchPoints ?? 0) > 1;
}

export function detectInstallMode(env: InstallEnvironment): InstallMode {
  if (env.standalone) return "installed";
  if (env.hasPromptEvent) return "prompt";
  if (isIosDevice(env)) return "ios";
  return "none";
}

const DISMISS_DAYS = 14;

/** O aviso some por 14 dias depois de dispensado; é lembrete, não obrigação. */
export function isDismissed(dismissedAt: string | null | undefined, now = Date.now()): boolean {
  if (!dismissedAt) return false;
  const quando = Number(dismissedAt);
  if (!Number.isFinite(quando) || quando <= 0) return false;
  return now - quando < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}
