import type { Metadata } from "next";
import "./offline.css";

export const metadata: Metadata = {
  title: "Sem conexão | TIME Escola de Negócios",
  robots: { index: false },
};

/**
 * Página servida pelo service worker quando uma navegação falha por falta de
 * rede. É pública e estática de propósito: precisa existir no cache sem sessão.
 * Antes, o fallback era a landing "/", e o membro logado, sem internet, via a
 * página de vendas em vez de um aviso — parecia que o app tinha quebrado.
 */
export default function OfflinePage() {
  return (
    <main className="offline-page">
      <div className="offline-card">
        <span className="offline-kicker">SEM CONEXÃO</span>
        <h1>Você está offline</h1>
        <p>
          Não conseguimos falar com a TIME agora. Confira sua internet e tente de novo — o que você
          já tinha aberto continua no seu aparelho.
        </p>
        <a className="offline-retry" href="/app">
          Tentar novamente
        </a>
      </div>
    </main>
  );
}
